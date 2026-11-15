"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { aiErrorMessage, isAiConfigured } from "@/lib/ai/client";
import { checkAiLimit } from "@/lib/trends/settings";
import { createContentItemRecord } from "@/lib/marketing/contentItems";
import { networkLabel } from "@/lib/marketing/content";
import { generateAiMarketingPlan } from "@/lib/marketing/aiPlan";
import { normalizeFormat, normalizeNetwork, type AiMarketingPlan, type PlanNetwork } from "@/lib/marketing/aiPlanSchema";

const inputSchema = z.object({
  client_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Elegí la fecha de inicio." }),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Elegí la fecha de fin." }),
  budget: z.string().max(30).default(""),
  instructions: z.string().max(3000).default(""),
  frequency: z.enum(["auto", "daily", "5w", "3w"]).default("auto"),
});

/** Claude arma el plan completo y queda como borrador del cliente. */
export async function generateMarketingPlanWithAi(input: z.input<typeof inputSchema>): Promise<{ createdId?: string; error?: string }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  if (d.period_end < d.period_start) return { error: "La fecha de fin tiene que ser posterior a la de inicio." };
  const days = (Date.parse(d.period_end) - Date.parse(d.period_start)) / 86_400_000;
  if (days > 95) return { error: "Para que el calendario quede bien detallado, generá planes de hasta 3 meses." };
  if (d.frequency === "daily" && days > 35) return { error: "Con publicación diaria, generá el plan de a un mes (así cada pieza queda bien detallada)." };

  const { userId, profile } = await requireClientAccess(d.client_id);
  if (!can(profile, "ai.use") && !can(profile, "trends.use")) return { error: "No tenés acceso a la IA." };
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
  const limit = await checkAiLimit(userId, profile.role);
  if (limit) return { error: limit };

  const budgetRaw = d.budget.trim().replace(/\./g, "").replace(",", ".");
  const budget = budgetRaw ? Number(budgetRaw) : null;
  if (budget != null && (!Number.isFinite(budget) || budget < 0)) return { error: "El presupuesto tiene que ser un número." };

  let plan: AiMarketingPlan;
  try {
    plan = await generateAiMarketingPlan({
      clientId: d.client_id,
      profileId: userId,
      periodStart: d.period_start,
      periodEnd: d.period_end,
      budgetArs: budget,
      instructions: d.instructions,
      frequency: d.frequency,
    });
  } catch (err) {
    return { error: err instanceof Error && (err.message.startsWith("El calendario") || err.message.startsWith("El plan")) ? err.message : err instanceof Error && err.message.startsWith("La IA") ? err.message : aiErrorMessage(err) };
  }

  const objectives = plan.objectives.map((o, i) => `${i + 1}. ${o.objective} — KPI: ${o.kpi}, meta: ${o.target}`).join("\n");
  const audience = plan.audience_summary;
  const channels = plan.networks.map((n) => networkLabel(n));
  const row = await queryOne<{ id: string }>(
    `insert into marketing_plans
       (client_id, period_start, period_end, objectives, target_audience, value_proposition, budget_ads, channels, deliverables,
        created_by, ai_plan, generated_by_ai)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) returning id`,
    [
      d.client_id,
      d.period_start,
      d.period_end,
      objectives,
      audience,
      plan.value_proposition,
      budget ?? (plan.paid_recommended && plan.monthly_budget_ars > 0 ? plan.monthly_budget_ars : null),
      channels,
      JSON.stringify(plan.deliverables.filter((x) => x.committed > 0)),
      userId,
      JSON.stringify(plan),
    ]
  );
  await recordAudit({
    actorId: userId,
    action: "marketing_plans.generate_ai",
    entityType: "marketing_plan",
    entityId: row!.id,
    after: { client_id: d.client_id, period_start: d.period_start, period_end: d.period_end, pieces: plan.content_calendar.length },
    ip: getClientIp(),
  });
  revalidatePath(`/clients/${d.client_id}`);
  return { createdId: row!.id };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const selectionSchema = z
  .array(
    z.object({
      index: z.number().int().min(0),
      // dia en que se graba/produce (lo que usa el calendario de grabacion)
      recording_date: z.string().regex(DATE, { message: "Fecha de grabación inválida." }),
      // dia en que se publica
      publish_date: z.string().regex(DATE, { message: "Fecha de publicación inválida." }),
    })
  )
  .min(1, { message: "Elegí al menos una pieza." })
  .max(120);

type Selection = z.infer<typeof selectionSchema>[number];

/**
 * Pasa piezas elegidas del plan IA al calendario de contenido (estado Idea),
 * con la fecha de grabación y de publicación que eligió la persona. Las que
 * ya estaban en el calendario no se duplican.
 */
async function addPieces(planId: string, clientId: string, userId: string, selections: Selection[]): Promise<{ created: number; skipped: number; error?: string }> {
  const plan = await queryOne<{ client_id: string; ai_plan: AiMarketingPlan | null; calendar_items: Record<string, string> | null }>(
    "select client_id, ai_plan, calendar_items from marketing_plans where id = $1",
    [planId]
  );
  if (!plan || plan.client_id !== clientId || !plan.ai_plan) return { created: 0, skipped: 0, error: "No existe ese plan." };
  const items: Record<string, string> = { ...(plan.calendar_items ?? {}) };
  let created = 0;
  let skipped = 0;

  for (const sel of selections) {
    const piece = plan.ai_plan.content_calendar[sel.index];
    if (!piece) continue;
    if (items[String(sel.index)]) {
      // Ya estaba: si la pieza sigue existiendo, no se duplica.
      const exists = await queryOne("select 1 from content_items where id = $1", [items[String(sel.index)]]);
      if (exists) {
        skipped++;
        continue;
      }
    }
    const channels = (piece.channels.length ? piece.channels : ["instagram"]).map((n) => normalizeNetwork(n)).filter((n): n is PlanNetwork => n != null);
    const res = await createContentItemRecord(userId, {
      client_id: clientId,
      title: piece.title.slice(0, 200),
      format: normalizeFormat(piece.format),
      channels: channels.length ? channels : ["instagram"],
      recording_at: `${sel.recording_date}T10:00`,
      scheduled_at: `${sel.publish_date >= sel.recording_date ? sel.publish_date : sel.recording_date}T18:00`,
      script: `GANCHO: ${piece.hook}\n\n${piece.brief}`,
      notes: `Pilar: ${piece.pillar}\nSale del plan de marketing armado con IA.`,
      status: "idea",
    });
    if (res.id) {
      created++;
      items[String(sel.index)] = res.id;
      await query("update content_items set marketing_plan_id = $2 where id = $1", [res.id, planId]);
    }
  }

  const all = plan.ai_plan.content_calendar.every((_, i) => items[String(i)]);
  await query(
    `update marketing_plans set calendar_items = $2, calendar_created_at = case when $3::boolean then coalesce(calendar_created_at, now()) else calendar_created_at end
     where id = $1`,
    [planId, JSON.stringify(items), all]
  );
  return { created, skipped };
}

/** Agrega al calendario las piezas elegidas, con sus fechas. */
export async function addPlanPiecesToCalendar(
  planId: string,
  clientId: string,
  selections: z.input<typeof selectionSchema>
): Promise<{ created?: number; skipped?: number; error?: string }> {
  const { userId } = await requireClientAccess(clientId);
  const parsed = selectionSchema.safeParse(selections);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const res = await addPieces(planId, clientId, userId, parsed.data);
  if (res.error) return { error: res.error };
  await recordAudit({ actorId: userId, action: "marketing_plans.add_to_calendar", entityType: "marketing_plan", entityId: planId, after: { client_id: clientId, created: res.created }, ip: getClientIp() });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/calendar");
  return { created: res.created, skipped: res.skipped };
}

/**
 * Activa el plan (cierra el que estaba en ejecucion) y carga TODAS las piezas
 * que falten en el calendario, con las fechas sugeridas.
 */
export async function activatePlanAndCreateCalendar(planId: string, clientId: string): Promise<{ created?: number; error?: string }> {
  const { userId } = await requireClientAccess(clientId);
  const plan = await queryOne<{ client_id: string; ai_plan: AiMarketingPlan | null }>(
    "select client_id, ai_plan from marketing_plans where id = $1",
    [planId]
  );
  if (!plan || plan.client_id !== clientId) return { error: "No existe ese plan." };

  await query("update marketing_plans set status = 'closed', updated_at = now() where client_id = $1 and status = 'active' and id <> $2", [clientId, planId]);
  await query(
    `update marketing_plans set status = 'active', updated_at = now(),
       approved_by = coalesce(approved_by, $2), approved_at = coalesce(approved_at, now())
     where id = $1`,
    [planId, userId]
  );

  let created = 0;
  if (plan.ai_plan) {
    const res = await addPieces(
      planId,
      clientId,
      userId,
      plan.ai_plan.content_calendar.map((p, index) => ({ index, recording_date: p.date, publish_date: p.date }))
    );
    created = res.created;
  }

  await recordAudit({ actorId: userId, action: "marketing_plans.activate_with_calendar", entityType: "marketing_plan", entityId: planId, after: { client_id: clientId, pieces_created: created }, ip: getClientIp() });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/calendar");
  return { created };
}
