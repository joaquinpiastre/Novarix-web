"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { aiErrorMessage, isAiConfigured } from "@/lib/ai/client";
import { createContentItemRecord } from "@/lib/marketing/contentItems";
import { CONTENT_FORMAT_VALUES } from "@/lib/marketing/content";
import { clientAccessError, requireTrendsAccess } from "@/lib/trends/access";
import { checkAiLimit } from "@/lib/trends/settings";
import { businessDiscovery, isInstagramConfigured } from "@/lib/trends/providers/instagram";
import { ProviderError } from "@/lib/trends/providers/types";
import { MetaApiError } from "@/lib/meta/client";
import { intrinsicScores } from "@/lib/trends/score";
import { upsertVideo } from "@/lib/trends/store";
import type { VideoCardData } from "@/lib/trends/view";
import { runIdeaTool } from "@/lib/ideas/tools";
import { resetChat, sendChatMessage } from "@/lib/ideas/chat";
import { IDEA_TOOLS, type ChatMessage, type IdeaCard, type IdeaTool } from "@/lib/ideas/types";

const uuid = z.string().uuid();

async function gate(clientId: string, needsAi = true) {
  const access = await requireTrendsAccess();
  if (!uuid.safeParse(clientId).success) return { access, error: "Elegí un cliente." };
  const accessError = clientAccessError(access, clientId);
  if (accessError) return { access, error: accessError };
  if (needsAi) {
    if (!isAiConfigured()) return { access, error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
    const limit = await checkAiLimit(access.userId, access.profile.role);
    if (limit) return { access, error: limit };
  }
  return { access, error: null };
}

// ===== Generadores =====

export async function runToolAction(tool: IdeaTool, clientId: string, input: unknown): Promise<{ cards?: IdeaCard[]; error?: string }> {
  if (!(IDEA_TOOLS as readonly string[]).includes(tool)) return { error: "Herramienta inválida." };
  const { access, error } = await gate(clientId);
  if (error) return { error };
  try {
    const res = await runIdeaTool(tool, clientId, input, { profileId: access.userId, clientId });
    if (res.cards) {
      await recordAudit({ actorId: access.userId, action: `ideas.generate.${tool}`, entityType: "client", entityId: clientId, after: { input }, ip: getClientIp() });
    }
    return res;
  } catch (err) {
    return { error: aiErrorMessage(err) };
  }
}

// ===== Banco de ideas =====

const saveSchema = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().max(20000).nullish(),
  format: z.string().max(40).nullish(),
  pillar: z.string().max(60).nullish(),
  source: z.string().max(40),
  reference_url: z.string().max(1000).nullish(),
});

export async function saveIdea(clientId: string, input: z.input<typeof saveSchema>): Promise<{ id?: string; error?: string }> {
  const { access, error } = await gate(clientId, false);
  if (error) return { error };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };
  const d = parsed.data;
  const row = await queryOne<{ id: string }>(
    `insert into idea_bank (client_id, title, body, format, pillar, source, reference_url, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [clientId, d.title, d.body ?? null, d.format ?? null, d.pillar ?? null, d.source, d.reference_url ?? null, access.userId]
  );
  await recordAudit({ actorId: access.userId, action: "ideas.bank.save", entityType: "idea", entityId: row!.id, after: { client_id: clientId, title: d.title, source: d.source }, ip: getClientIp() });
  revalidatePath("/marketing/ideas");
  return { id: row!.id };
}

async function loadIdea(ideaId: string) {
  const idea = await queryOne<{ id: string; client_id: string; title: string; body: string | null; format: string | null; reference_url: string | null; content_item_id: string | null }>(
    "select id, client_id, title, body, format, reference_url, content_item_id from idea_bank where id = $1",
    [ideaId]
  );
  return idea;
}

/** Manda una idea del banco al calendario (estado Idea), o al portal del cliente para que la apruebe. */
export async function sendIdeaToCalendar(ideaId: string, sendToClient: boolean): Promise<{ contentItemId?: string; error?: string }> {
  if (!uuid.safeParse(ideaId).success) return { error: "Idea inválida." };
  const idea = await loadIdea(ideaId);
  if (!idea) return { error: "No existe esa idea." };
  const { access, error } = await gate(idea.client_id, false);
  if (error) return { error };
  if (idea.content_item_id) return { contentItemId: idea.content_item_id };

  const format = (CONTENT_FORMAT_VALUES as readonly string[]).includes(idea.format ?? "") ? idea.format! : "reel";
  const result = await createContentItemRecord(access.userId, {
    client_id: idea.client_id,
    title: idea.title.slice(0, 200),
    format: format as (typeof CONTENT_FORMAT_VALUES)[number],
    channels: ["instagram"],
    script: idea.body,
    notes: idea.reference_url ? `Referencia: ${idea.reference_url}` : "Generada con la caja de ideas (IA).",
    attachment_url: idea.reference_url,
    status: sendToClient ? "aprobacion_cliente" : "idea",
  });
  if (result.error !== undefined) return { error: result.error };
  await query("update idea_bank set content_item_id = $2 where id = $1", [ideaId, result.id]);
  await recordAudit({ actorId: access.userId, action: sendToClient ? "ideas.share_to_client" : "ideas.to_calendar", entityType: "content_item", entityId: result.id, after: { idea_id: ideaId }, ip: getClientIp() });
  revalidatePath("/marketing/ideas");
  revalidatePath("/calendar");
  return { contentItemId: result.id };
}

export async function deleteIdea(ideaId: string): Promise<{ error?: string }> {
  if (!uuid.safeParse(ideaId).success) return { error: "Idea inválida." };
  const idea = await loadIdea(ideaId);
  if (!idea) return {};
  const { access, error } = await gate(idea.client_id, false);
  if (error) return { error };
  await query("delete from idea_bank where id = $1", [ideaId]);
  await recordAudit({ actorId: access.userId, action: "ideas.bank.delete", entityType: "idea", entityId: ideaId, before: idea, ip: getClientIp() });
  revalidatePath("/marketing/ideas");
  return {};
}

// ===== Competidores =====

const competitorSchema = z.object({
  name: z.string().trim().min(1, { message: "Poné el nombre." }).max(120),
  ig_username: z
    .string()
    .trim()
    .max(60)
    .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""))
    .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), { message: "Usuario de Instagram inválido." }),
  fb_page_id: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || /^\d{5,20}$/.test(v), { message: "El ID de la página de Facebook es un número." }),
  notes: z.string().trim().max(1000).default(""),
});

export async function addCompetitor(clientId: string, input: z.input<typeof competitorSchema>): Promise<{ error?: string }> {
  const { access, error } = await gate(clientId, false);
  if (error) return { error };
  const parsed = competitorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  const row = await queryOne<{ id: string }>(
    "insert into competitors (client_id, name, ig_username, fb_page_id, notes, created_by) values ($1,$2,$3,$4,$5,$6) returning id",
    [clientId, d.name, d.ig_username || null, d.fb_page_id || null, d.notes || null, access.userId]
  );
  await recordAudit({ actorId: access.userId, action: "competitors.add", entityType: "competitor", entityId: row!.id, after: { client_id: clientId, ...d }, ip: getClientIp() });
  revalidatePath("/marketing/ideas");
  return {};
}

export async function removeCompetitor(competitorId: string): Promise<{ error?: string }> {
  if (!uuid.safeParse(competitorId).success) return { error: "Inválido." };
  const comp = await queryOne<{ client_id: string; name: string }>("select client_id, name from competitors where id = $1", [competitorId]);
  if (!comp) return {};
  const { access, error } = await gate(comp.client_id, false);
  if (error) return { error };
  await query("delete from competitors where id = $1", [competitorId]);
  await recordAudit({ actorId: access.userId, action: "competitors.remove", entityType: "competitor", entityId: competitorId, before: comp, ip: getClientIp() });
  revalidatePath("/marketing/ideas");
  return {};
}

/** Top posts/reels de un competidor via Business Discovery (los guarda como videos del Radar, para poder analizarlos o guardarlos). */
export async function competitorTopPosts(competitorId: string): Promise<{ cards?: VideoCardData[]; followers?: number | null; error?: string }> {
  if (!uuid.safeParse(competitorId).success) return { error: "Inválido." };
  const comp = await queryOne<{ client_id: string; ig_username: string | null }>("select client_id, ig_username from competitors where id = $1", [competitorId]);
  if (!comp) return { error: "No existe ese competidor." };
  const { access, error } = await gate(comp.client_id, false);
  if (error) return { error };
  if (!comp.ig_username) return { error: "Cargale el usuario de Instagram para ver sus posts." };
  if (!isInstagramConfigured()) return { error: "Falta configurar la cuenta de Instagram de búsqueda (TRENDS_IG_CONNECTION_ID)." };

  try {
    const bd = await businessDiscovery(comp.ig_username, { profileId: access.userId, clientId: comp.client_id });
    const top = [...bd.media].sort((a, b) => (b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0)).slice(0, 6);
    const cards: VideoCardData[] = [];
    for (const v of top) {
      const id = await upsertVideo(v);
      const s = intrinsicScores(v);
      cards.push({
        videoId: id,
        platform: v.platform,
        externalId: v.externalId,
        url: v.url,
        sourceProvider: v.sourceProvider,
        authorHandle: v.authorHandle,
        authorName: v.authorName,
        authorFollowers: v.authorFollowers,
        publishedAt: v.publishedAt,
        durationSeconds: v.durationSeconds,
        caption: v.caption,
        hashtags: v.hashtags,
        audio: v.audio,
        thumbnailUrl: v.thumbnailUrl,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        saves: v.saves,
        scores: {
          position: null,
          final: null,
          relevance: null,
          relevanceReason: null,
          outlierRatio: s.outlierRatio,
          outlierScore: s.outlierScore,
          velocity: s.velocity,
          velocityScore: null,
          engagementRate: s.engagementRate,
          engagementScore: s.engagementScore,
          discarded: false,
        },
        analysis: null,
        analysisAt: null,
      });
    }
    return { cards, followers: bd.followers };
  } catch (err) {
    const msg = err instanceof MetaApiError || err instanceof ProviderError ? err.message : String(err);
    return { error: `Instagram no devolvió datos (${msg}). Tiene que ser una cuenta Business o Creator.` };
  }
}

// ===== Fechas comerciales propias =====

const dateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida." }),
  notes: z.string().trim().max(500).default(""),
  only_this_client: z.boolean().default(true),
});

export async function addCommercialDate(clientId: string, input: z.input<typeof dateSchema>): Promise<{ error?: string }> {
  const { access, error } = await gate(clientId, false);
  if (error) return { error };
  const parsed = dateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  // Solo admin/marketing_admin cargan fechas para todos los clientes.
  const forClient = d.only_this_client || !access.full ? clientId : null;
  await query("insert into commercial_dates (client_id, name, date, notes, created_by) values ($1,$2,$3,$4,$5)", [
    forClient,
    d.name,
    d.date,
    d.notes || null,
    access.userId,
  ]);
  await recordAudit({ actorId: access.userId, action: "commercial_dates.add", entityType: "commercial_date", after: { ...d, client_id: forClient }, ip: getClientIp() });
  revalidatePath("/marketing/ideas");
  return {};
}

export async function removeCommercialDate(id: string, clientId: string): Promise<{ error?: string }> {
  const { access, error } = await gate(clientId, false);
  if (error) return { error };
  const row = await queryOne<{ client_id: string | null }>("select client_id from commercial_dates where id = $1", [id]);
  if (!row) return {};
  if (row.client_id ? row.client_id !== clientId : !access.full) return { error: "No podés borrar esa fecha." };
  await query("delete from commercial_dates where id = $1", [id]);
  revalidatePath("/marketing/ideas");
  return {};
}

// ===== Chat de estrategia =====

export async function chatAction(clientId: string, text: string): Promise<{ messages?: ChatMessage[]; error?: string }> {
  const { access, error } = await gate(clientId);
  if (error) return { error };
  const message = text.trim();
  if (!message) return { error: "Escribí algo." };
  try {
    return { messages: await sendChatMessage(access.userId, clientId, message.slice(0, 4000)) };
  } catch (err) {
    return { error: aiErrorMessage(err) };
  }
}

export async function resetChatAction(clientId: string): Promise<{ error?: string }> {
  const { access, error } = await gate(clientId, false);
  if (error) return { error };
  await resetChat(access.userId, clientId);
  return {};
}
