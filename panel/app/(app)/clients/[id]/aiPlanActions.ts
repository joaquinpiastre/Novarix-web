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
});

/** Claude arma el plan completo y queda como borrador del cliente. */
export async function generateMarketingPlanWithAi(input: z.input<typeof inputSchema>): Promise<{ createdId?: string; error?: string }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  if (d.period_end < d.period_start) return { error: "La fecha de fin tiene que ser posterior a la de inicio." };
  const days = (Date.parse(d.period_end) - Date.parse(d.period_start)) / 86_400_000;
  if (days > 95) return { error: "Para que el calendario quede bien detallado, generá planes de hasta 3 meses." };

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
    });
  } catch (err) {
    return { error: err instanceof Error && err.message.startsWith("El plan") ? err.message : err instanceof Error && err.message.startsWith("La IA") ? err.message : aiErrorMessage(err) };
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

/**
 * Activa el plan (cierra el que estaba en ejecucion) y carga sus piezas en el
 * calendario de contenido como "Idea", con fecha, gancho y brief.
 */
export async function activatePlanAndCreateCalendar(planId: string, clientId: string): Promise<{ created?: number; error?: string }> {
  const { userId } = await requireClientAccess(clientId);
  const plan = await queryOne<{ client_id: string; ai_plan: AiMarketingPlan | null; calendar_created_at: string | null }>(
    "select client_id, ai_plan, calendar_created_at from marketing_plans where id = $1",
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
  if (plan.ai_plan && !plan.calendar_created_at) {
    for (const piece of plan.ai_plan.content_calendar) {
      const channels = (piece.channels.length ? piece.channels : ["instagram"]).map((n) => normalizeNetwork(n)).filter((n): n is PlanNetwork => n != null);
      const res = await createContentItemRecord(userId, {
        client_id: clientId,
        title: piece.title.slice(0, 200),
        format: normalizeFormat(piece.format),
        channels: channels.length ? channels : ["instagram"],
        scheduled_at: `${piece.date}T10:00`,
        script: `GANCHO: ${piece.hook}\n\n${piece.brief}`,
        notes: `Pilar: ${piece.pillar}\nSale del plan de marketing armado con IA.`,
        status: "idea",
      });
      if (res.id) {
        created++;
        await query("update content_items set marketing_plan_id = $2 where id = $1", [res.id, planId]);
      }
    }
    await query("update marketing_plans set calendar_created_at = now() where id = $1", [planId]);
  }

  await recordAudit({ actorId: userId, action: "marketing_plans.activate_with_calendar", entityType: "marketing_plan", entityId: planId, after: { client_id: clientId, pieces_created: created }, ip: getClientIp() });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/calendar");
  return { created };
}
