"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { aiErrorMessage, isAiConfigured } from "@/lib/ai/client";
import { createContentItemRecord } from "@/lib/marketing/contentItems";
import { CONTENT_FORMAT_VALUES, SOCIAL_NETWORK_VALUES } from "@/lib/marketing/content";
import { enqueueTrendSearch } from "@/lib/jobs/trendJobs";
import {
  clientAccessError,
  loadAccessibleBoard,
  loadAccessibleSearch,
  requireTrendsAccess,
} from "@/lib/trends/access";
import { AiStepError, analyzeVideo, planSearch } from "@/lib/trends/ai";
import { createManualSearch } from "@/lib/trends/manual";
import { cacheKeyFor, tryReuseCache } from "@/lib/trends/pipeline";
import { checkAiLimit, checkSearchLimit } from "@/lib/trends/settings";
import { getVideo } from "@/lib/trends/store";
import {
  normalizePlan,
  searchFiltersSchema,
  searchPlanSchema,
  type SearchPlan,
  type SearchStatus,
} from "@/lib/trends/types";

type Result<T = object> = ({ error?: undefined } & T) | { error: string };

const uuid = z.string().uuid();

function errMessage(err: unknown): string {
  return err instanceof AiStepError ? err.message : aiErrorMessage(err);
}

// ===== Busqueda =====

const createSchema = z.object({
  prompt: z.string().trim().min(10, { message: "Contá un poco más qué querés encontrar." }).max(2000),
  client_id: z
    .string()
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .pipe(uuid.nullable()),
  filters: searchFiltersSchema,
});

/** Paso 1: la IA convierte el prompt en un plan. Todavia no busca nada. */
export async function createSearch(input: z.input<typeof createSchema>): Promise<Result<{ id: string }>> {
  const access = await requireTrendsAccess();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const { prompt, client_id, filters } = parsed.data;
  if (filters.platforms.length === 0) return { error: "Elegí al menos una plataforma." };

  const accessError = clientAccessError(access, client_id);
  if (accessError) return { error: accessError };
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
  const limit = await checkSearchLimit(access.userId, access.profile.role);
  if (limit) return { error: limit };

  const row = await queryOne<{ id: string }>(
    `insert into trend_searches (profile_id, client_id, prompt, filters, status) values ($1,$2,$3,$4,'planning') returning id`,
    [access.userId, client_id, prompt, JSON.stringify(filters)]
  );
  const id = row!.id;
  try {
    const plan = await planSearch(prompt, filters, client_id, { profileId: access.userId, clientId: client_id, searchId: id });
    await query("update trend_searches set plan = $2, status = 'ready' where id = $1", [id, JSON.stringify(plan)]);
  } catch (err) {
    await query("update trend_searches set status = 'error', error = $2 where id = $1", [id, errMessage(err)]);
  }
  await recordAudit({ actorId: access.userId, action: "trends.search.create", entityType: "trend_search", entityId: id, after: { prompt, client_id, filters }, ip: getClientIp() });
  revalidatePath("/marketing/radar");
  return { id };
}

/** "Ajustar": la IA rehace el plan con un pedido de cambio. */
export async function adjustPlan(searchId: string, feedback: string): Promise<Result> {
  const access = await requireTrendsAccess();
  const search = await loadAccessibleSearch<{ id: string; profile_id: string; client_id: string | null; prompt: string; filters: unknown; plan: SearchPlan | null; status: SearchStatus }>(access, searchId);
  if (!search) return { error: "No existe esa búsqueda." };
  if (search.status !== "ready" || !search.plan) return { error: "Esta búsqueda ya se corrió. Creá una nueva para cambiar el plan." };
  if (!feedback.trim()) return { error: "Escribí qué querés ajustar." };
  const limit = await checkAiLimit(access.userId, access.profile.role);
  if (limit) return { error: limit };
  try {
    const filters = searchFiltersSchema.parse(search.filters ?? {});
    const plan = await planSearch(search.prompt, filters, search.client_id, { profileId: access.userId, clientId: search.client_id, searchId }, {
      plan: search.plan,
      feedback: feedback.trim().slice(0, 1000),
    });
    await query("update trend_searches set plan = $2 where id = $1", [searchId, JSON.stringify(plan)]);
  } catch (err) {
    return { error: errMessage(err) };
  }
  revalidatePath(`/marketing/radar/${searchId}`);
  return {};
}

/** Paso 2 ("Buscar así"): guarda el plan (editado o no) y encola la busqueda. */
export async function runSearch(searchId: string, plan: SearchPlan): Promise<Result> {
  const access = await requireTrendsAccess();
  const search = await loadAccessibleSearch<{ id: string; profile_id: string; client_id: string | null; status: SearchStatus }>(access, searchId);
  if (!search) return { error: "No existe esa búsqueda." };
  if (search.status !== "ready" && search.status !== "error") return { error: "Esta búsqueda ya está corriendo o terminó." };

  const parsed = searchPlanSchema.safeParse(plan);
  if (!parsed.success) return { error: "El plan tiene datos inválidos." };
  const clean = normalizePlan(parsed.data);
  if (clean.providers.length === 0) return { error: "Elegí al menos una plataforma." };
  if (clean.keywords_es.length + clean.keywords_en.length + clean.hashtags.length + clean.reference_accounts.length === 0) {
    return { error: "El plan necesita al menos una palabra clave, hashtag o cuenta." };
  }

  await query(
    `update trend_searches set plan = $2, status = 'queued', progress = 0, progress_message = 'En cola…', error = null,
       cache_key = $3 where id = $1`,
    [searchId, JSON.stringify(clean), cacheKeyFor(clean)]
  );
  await query("delete from trend_search_results where search_id = $1", [searchId]);
  const cached = await tryReuseCache(searchId, clean);
  if (cached) {
    await query("update trend_searches set progress_message = 'Resultados del caché (mismo plan en las últimas horas). Completando análisis…' where id = $1", [searchId]);
  }
  await enqueueTrendSearch(searchId);
  await recordAudit({ actorId: access.userId, action: "trends.search.run", entityType: "trend_search", entityId: searchId, after: { plan: clean, cached }, ip: getClientIp() });
  revalidatePath(`/marketing/radar/${searchId}`);
  return {};
}

export async function getSearchStatus(searchId: string): Promise<{ status: SearchStatus; progress: number; message: string | null; error: string | null } | null> {
  const access = await requireTrendsAccess();
  const search = await loadAccessibleSearch<{ profile_id: string; client_id: string | null; status: SearchStatus; progress: number; progress_message: string | null; error: string | null }>(access, searchId);
  if (!search) return null;
  return { status: search.status, progress: search.progress, message: search.progress_message, error: search.error };
}

export async function deleteSearch(searchId: string): Promise<Result> {
  const access = await requireTrendsAccess();
  const search = await loadAccessibleSearch<{ id: string; profile_id: string; client_id: string | null }>(access, searchId);
  if (!search) return { error: "No existe esa búsqueda." };
  if (!access.full && search.profile_id !== access.userId) return { error: "Solo podés borrar tus búsquedas." };
  await query("delete from trend_searches where id = $1", [searchId]);
  await recordAudit({ actorId: access.userId, action: "trends.search.delete", entityType: "trend_search", entityId: searchId, ip: getClientIp() });
  revalidatePath("/marketing/radar");
  return {};
}

// ===== Link manual =====

const optionalCount = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace(/[.\s]/g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  });

const manualSchema = z.object({
  url: z.string().trim().url({ message: "Pegá un link válido." }),
  client_id: z
    .string()
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .pipe(uuid.nullable()),
  views: optionalCount,
  likes: optionalCount,
  comments: optionalCount,
  shares: optionalCount,
  saves: optionalCount,
  followers: optionalCount,
});

export async function analyzeLink(input: z.input<typeof manualSchema>): Promise<Result<{ id: string }>> {
  const access = await requireTrendsAccess();
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  const accessError = clientAccessError(access, d.client_id);
  if (accessError) return { error: accessError };
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
  const limit = await checkAiLimit(access.userId, access.profile.role);
  if (limit) return { error: limit };

  try {
    const res = await createManualSearch({
      url: d.url,
      clientId: d.client_id,
      profileId: access.userId,
      metrics: { views: d.views, likes: d.likes, comments: d.comments, shares: d.shares, saves: d.saves, followers: d.followers },
    });
    if (res.error || !res.searchId) return { error: res.error ?? "No se pudo agregar el link." };
    await enqueueTrendSearch(res.searchId);
    await recordAudit({ actorId: access.userId, action: "trends.link.analyze", entityType: "trend_search", entityId: res.searchId, after: { url: d.url, client_id: d.client_id }, ip: getClientIp() });
    revalidatePath("/marketing/radar");
    return { id: res.searchId };
  } catch (err) {
    return { error: errMessage(err) };
  }
}

/** Vuelve a correr el analisis IA de un video (para el cliente de la busqueda, o para otro cliente). */
export async function reanalyzeVideo(videoId: string, clientId: string | null, searchId?: string): Promise<Result> {
  const access = await requireTrendsAccess();
  const accessError = clientAccessError(access, clientId);
  if (accessError) return { error: accessError };
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
  const limit = await checkAiLimit(access.userId, access.profile.role);
  if (limit) return { error: limit };
  const video = await getVideo(videoId);
  if (!video) return { error: "No existe ese video." };
  try {
    await analyzeVideo(video, clientId, { profileId: access.userId, clientId, searchId: searchId ?? null }, { force: true, createdBy: access.userId });
  } catch (err) {
    return { error: errMessage(err) };
  }
  if (searchId) revalidatePath(`/marketing/radar/${searchId}`);
  revalidatePath("/marketing/radar/tableros", "layout");
  return {};
}

// ===== Tableros =====

export async function createBoard(input: { name: string; description?: string; client_id?: string | null }): Promise<Result<{ id: string }>> {
  const access = await requireTrendsAccess();
  const name = input.name?.trim();
  if (!name) return { error: "Poné un nombre al tablero." };
  const clientId = input.client_id?.trim() || null;
  if (clientId && !uuid.safeParse(clientId).success) return { error: "Cliente inválido." };
  const accessError = clientAccessError(access, clientId);
  if (accessError) return { error: accessError };
  const row = await queryOne<{ id: string }>(
    "insert into swipe_boards (name, description, client_id, created_by) values ($1,$2,$3,$4) returning id",
    [name.slice(0, 120), input.description?.trim().slice(0, 1000) || null, clientId, access.userId]
  );
  await recordAudit({ actorId: access.userId, action: "trends.board.create", entityType: "swipe_board", entityId: row!.id, after: { name, client_id: clientId }, ip: getClientIp() });
  revalidatePath("/marketing/radar/tableros");
  return { id: row!.id };
}

export async function deleteBoard(boardId: string): Promise<Result> {
  const access = await requireTrendsAccess();
  const board = await loadAccessibleBoard(access, boardId);
  if (!board) return { error: "No existe ese tablero." };
  if (!access.full && board.created_by !== access.userId) return { error: "Solo quien lo creó puede borrarlo." };
  await query("delete from swipe_boards where id = $1", [boardId]);
  await recordAudit({ actorId: access.userId, action: "trends.board.delete", entityType: "swipe_board", entityId: boardId, before: board, ip: getClientIp() });
  revalidatePath("/marketing/radar/tableros");
  return {};
}

export async function listMyBoards(): Promise<{ id: string; name: string; client_name: string | null }[]> {
  const access = await requireTrendsAccess();
  return query(
    `select b.id, b.name, c.name as client_name from swipe_boards b left join clients c on c.id = b.client_id
     where $1::boolean or b.created_by = $2 or b.client_id = any($3::uuid[])
     order by b.created_at desc limit 100`,
    [access.full, access.userId, access.clientIds]
  );
}

const tagsSchema = z
  .array(z.string())
  .default([])
  .transform((list) => Array.from(new Set(list.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 15));

export async function saveToBoard(input: {
  video_id: string;
  board_id?: string | null;
  new_board_name?: string | null;
  client_id?: string | null;
  notes?: string | null;
  tags?: string[];
}): Promise<Result<{ boardId: string }>> {
  const access = await requireTrendsAccess();
  if (!uuid.safeParse(input.video_id).success) return { error: "Video inválido." };
  let boardId = input.board_id?.trim() || null;
  if (!boardId) {
    const created = await createBoard({ name: input.new_board_name ?? "", client_id: input.client_id ?? null });
    if (created.error !== undefined) return { error: created.error };
    boardId = created.id;
  } else if (!(await loadAccessibleBoard(access, boardId))) {
    return { error: "No existe ese tablero." };
  }
  const tags = tagsSchema.parse(input.tags ?? []);
  await query(
    `insert into swipe_items (board_id, video_id, notes, tags, added_by) values ($1,$2,$3,$4,$5)
     on conflict (board_id, video_id) do update set notes = coalesce(excluded.notes, swipe_items.notes), tags = excluded.tags`,
    [boardId, input.video_id, input.notes?.trim().slice(0, 2000) || null, tags, access.userId]
  );
  await recordAudit({ actorId: access.userId, action: "trends.board.add_item", entityType: "swipe_board", entityId: boardId, after: { video_id: input.video_id }, ip: getClientIp() });
  revalidatePath(`/marketing/radar/tableros/${boardId}`);
  return { boardId };
}

export async function updateSwipeItem(itemId: string, notes: string, tags: string[]): Promise<Result> {
  const access = await requireTrendsAccess();
  const item = await queryOne<{ board_id: string }>("select board_id from swipe_items where id = $1", [itemId]);
  if (!item || !(await loadAccessibleBoard(access, item.board_id))) return { error: "No existe ese item." };
  await query("update swipe_items set notes = $2, tags = $3 where id = $1", [itemId, notes.trim().slice(0, 2000) || null, tagsSchema.parse(tags)]);
  revalidatePath(`/marketing/radar/tableros/${item.board_id}`);
  return {};
}

export async function removeSwipeItem(itemId: string): Promise<Result> {
  const access = await requireTrendsAccess();
  const item = await queryOne<{ board_id: string; video_id: string }>("select board_id, video_id from swipe_items where id = $1", [itemId]);
  if (!item || !(await loadAccessibleBoard(access, item.board_id))) return { error: "No existe ese item." };
  await query("delete from swipe_items where id = $1", [itemId]);
  await recordAudit({ actorId: access.userId, action: "trends.board.remove_item", entityType: "swipe_board", entityId: item.board_id, before: item, ip: getClientIp() });
  revalidatePath(`/marketing/radar/tableros/${item.board_id}`);
  return {};
}

// ===== Convertir en idea / compartir con el cliente =====

const convertSchema = z.object({
  video_id: uuid,
  client_id: uuid,
  title: z.string().trim().min(1, { message: "Poné un título." }).max(200),
  script: z.string().max(20000).nullish(),
  notes: z.string().max(5000).nullish(),
  format: z.enum(CONTENT_FORMAT_VALUES).default("reel"),
  channels: z.array(z.enum(SOCIAL_NETWORK_VALUES)).min(1, { message: "Elegí al menos una red." }),
  send_to_client: z.boolean().default(false),
});

/**
 * Crea una pieza en el calendario del cliente (estado Idea), con el video de
 * referencia y el guion adaptado. Con `send_to_client`, la pieza queda en
 * "Aprobación cliente" y le llega al portal para que la apruebe (mismo
 * circuito que el resto del contenido).
 */
export async function convertToIdea(input: z.input<typeof convertSchema>): Promise<Result<{ contentItemId: string }>> {
  const access = await requireTrendsAccess();
  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  const accessError = clientAccessError(access, d.client_id);
  if (accessError) return { error: accessError };
  const video = await getVideo(d.video_id);
  if (!video) return { error: "No existe ese video." };

  const notes = [
    `Referencia (Radar viral): ${video.url}`,
    d.notes?.trim() || null,
    "El análisis y la adaptación son una inferencia de la IA, no un dato.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await createContentItemRecord(access.userId, {
    client_id: d.client_id,
    title: d.title,
    format: d.format,
    channels: d.channels,
    script: d.script ?? null,
    notes,
    attachment_url: video.url,
    status: d.send_to_client ? "aprobacion_cliente" : "idea",
  });
  if (result.error !== undefined) return { error: result.error };

  await query(
    `insert into idea_bank (client_id, title, body, format, source, reference_url, content_item_id, created_by)
     values ($1,$2,$3,$4,'radar',$5,$6,$7)`,
    [d.client_id, d.title, d.script ?? null, d.format, video.url, result.id, access.userId]
  );
  await recordAudit({ actorId: access.userId, action: d.send_to_client ? "trends.idea.share_to_client" : "trends.idea.convert", entityType: "content_item", entityId: result.id, after: { video_id: d.video_id, client_id: d.client_id, title: d.title }, ip: getClientIp() });
  revalidatePath("/calendar");
  revalidatePath(`/clients/${d.client_id}`);
  return { contentItemId: result.id };
}

// ===== Busquedas guardadas (alertas) =====

const alertSchema = z.object({
  name: z.string().trim().min(1, { message: "Poné un nombre." }).max(120),
  every_days: z.coerce.number().int().min(1).max(90),
  min_score: z.coerce.number().min(0).max(100),
});

export async function saveSearchAsAlert(searchId: string, input: z.input<typeof alertSchema>): Promise<Result> {
  const access = await requireTrendsAccess();
  const search = await loadAccessibleSearch<{ id: string; profile_id: string; client_id: string | null; prompt: string; filters: unknown; plan: SearchPlan | null; kind: string }>(access, searchId);
  if (!search || search.kind !== "search" || !search.plan) return { error: "Esa búsqueda no se puede guardar como alerta." };
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const row = await queryOne<{ id: string }>(
    `insert into saved_searches (profile_id, client_id, name, prompt, filters, plan, every_days, min_score, last_run_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now()) returning id`,
    [access.userId, search.client_id, parsed.data.name, search.prompt, JSON.stringify(search.filters ?? {}), JSON.stringify(search.plan), parsed.data.every_days, parsed.data.min_score]
  );
  // La busqueda original cuenta como primera corrida (para que la alerta solo avise lo nuevo).
  await query("update trend_searches set saved_search_id = $2 where id = $1", [searchId, row!.id]);
  await recordAudit({ actorId: access.userId, action: "trends.alert.create", entityType: "saved_search", entityId: row!.id, after: parsed.data, ip: getClientIp() });
  revalidatePath("/marketing/radar/alertas");
  return {};
}

async function loadOwnAlert(id: string) {
  const access = await requireTrendsAccess();
  const row = await queryOne<{ id: string; profile_id: string }>("select id, profile_id from saved_searches where id = $1", [id]);
  if (!row || (!access.full && row.profile_id !== access.userId)) return { access, row: null };
  return { access, row };
}

export async function updateAlert(id: string, input: z.input<typeof alertSchema> & { active: boolean }): Promise<Result> {
  const { access, row } = await loadOwnAlert(id);
  if (!row) return { error: "No existe esa alerta." };
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  await query("update saved_searches set name = $2, every_days = $3, min_score = $4, active = $5 where id = $1", [
    id,
    parsed.data.name,
    parsed.data.every_days,
    parsed.data.min_score,
    Boolean(input.active),
  ]);
  await recordAudit({ actorId: access.userId, action: "trends.alert.update", entityType: "saved_search", entityId: id, after: { ...parsed.data, active: input.active }, ip: getClientIp() });
  revalidatePath("/marketing/radar/alertas");
  return {};
}

export async function deleteAlert(id: string): Promise<Result> {
  const { access, row } = await loadOwnAlert(id);
  if (!row) return { error: "No existe esa alerta." };
  await query("delete from saved_searches where id = $1", [id]);
  await recordAudit({ actorId: access.userId, action: "trends.alert.delete", entityType: "saved_search", entityId: id, ip: getClientIp() });
  revalidatePath("/marketing/radar/alertas");
  return {};
}
