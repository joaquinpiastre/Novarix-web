"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { getTrendSettings } from "@/lib/trends/settings";
import { normalizeWeights } from "@/lib/trends/score";

const limit = z.coerce.number().int().min(0).max(10000);

const settingsSchema = z.object({
  weights: z.object({
    outlier: z.coerce.number().min(0).max(100),
    velocity: z.coerce.number().min(0).max(100),
    engagement: z.coerce.number().min(0).max(100),
    relevance: z.coerce.number().min(0).max(100),
  }),
  cache_ttl_hours: z.coerce.number().int().min(0).max(24 * 14),
  analyze_top_n: z.coerce.number().int().min(0).max(30),
  daily_search_limits: z.object({ admin: limit, marketing_admin: limit, marketing: limit }),
  daily_ai_limits: z.object({ admin: limit, marketing_admin: limit, marketing: limit }),
  monthly_budget_usd: z.coerce.number().min(0).max(100000),
});

export async function updateUsageSettings(input: z.input<typeof settingsSchema>): Promise<{ error?: string }> {
  const { userId } = await requirePermission("usage.view");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisá los valores: hay alguno fuera de rango." };
  const d = parsed.data;
  const before = await getTrendSettings();
  const weights = normalizeWeights(d.weights);
  await query(
    `update trend_settings set weights = $1, cache_ttl_hours = $2, analyze_top_n = $3, daily_search_limits = $4,
       daily_ai_limits = $5, monthly_budget_usd = $6, updated_by = $7, updated_at = now(),
       budget_warned_month = case when monthly_budget_usd <> $6 then null else budget_warned_month end
     where id = true`,
    [
      JSON.stringify(weights),
      d.cache_ttl_hours,
      d.analyze_top_n,
      JSON.stringify(d.daily_search_limits),
      JSON.stringify(d.daily_ai_limits),
      d.monthly_budget_usd,
      userId,
    ]
  );
  await recordAudit({ actorId: userId, action: "usage.settings.update", entityType: "trend_settings", before, after: { ...d, weights }, ip: getClientIp() });
  revalidatePath("/admin/consumo");
  return {};
}
