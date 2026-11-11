import "server-only";
import { query, queryOne } from "@/lib/db";
import { notifyMany } from "@/lib/notifications/create";
import type { UserRole } from "@/lib/types/domain";
import { normalizeWeights } from "./score";
import type { ScoreWeights } from "./types";

export interface TrendSettings {
  weights: ScoreWeights;
  cache_ttl_hours: number;
  analyze_top_n: number;
  daily_search_limits: Partial<Record<UserRole, number>>;
  daily_ai_limits: Partial<Record<UserRole, number>>;
  monthly_budget_usd: number;
  budget_warned_month: string | null;
  radar_model: RadarModel;
}

/** Modelos elegibles para el Radar (relevancia, analisis por video y patrones). */
export const RADAR_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type RadarModel = (typeof RADAR_MODELS)[number];

export function isRadarModel(v: unknown): v is RadarModel {
  return typeof v === "string" && (RADAR_MODELS as readonly string[]).includes(v);
}

export async function getTrendSettings(): Promise<TrendSettings> {
  const row = await queryOne<TrendSettings>(
    `select weights, cache_ttl_hours, analyze_top_n, daily_search_limits, daily_ai_limits,
            monthly_budget_usd, budget_warned_month, radar_model
     from trend_settings where id = true`
  );
  return {
    weights: normalizeWeights(row?.weights ?? {}),
    cache_ttl_hours: row?.cache_ttl_hours ?? 24,
    analyze_top_n: row?.analyze_top_n ?? 5,
    daily_search_limits: row?.daily_search_limits ?? {},
    daily_ai_limits: row?.daily_ai_limits ?? {},
    monthly_budget_usd: row?.monthly_budget_usd ?? 100,
    budget_warned_month: row?.budget_warned_month ?? null,
    radar_model: isRadarModel(row?.radar_model) ? row.radar_model : "claude-haiku-5-5",
  };
}

/** Inicio del dia de hoy en hora de Mendoza, como timestamptz. */
const TODAY_MENDOZA = "date_trunc('day', now() at time zone 'America/Argentina/Mendoza') at time zone 'America/Argentina/Mendoza'";

/** Devuelve un mensaje si la persona ya llego a su limite diario de busquedas del Radar. */
export async function checkSearchLimit(profileId: string, role: UserRole): Promise<string | null> {
  const settings = await getTrendSettings();
  const limit = settings.daily_search_limits[role];
  if (limit == null) return null;
  const row = await queryOne<{ n: number }>(
    `select count(*)::int as n from trend_searches
     where profile_id = $1 and saved_search_id is null and kind = 'search' and created_at >= ${TODAY_MENDOZA}`,
    [profileId]
  );
  if ((row?.n ?? 0) >= limit) {
    return `Llegaste al límite de ${limit} búsquedas por día. Mañana se renueva (o pedile a un admin que lo suba en Consumo IA).`;
  }
  return checkBudget(settings);
}

/** Devuelve un mensaje si la persona ya llego a su limite diario de generaciones con IA (ideas, diagnostico, chat). */
export async function checkAiLimit(profileId: string, role: UserRole): Promise<string | null> {
  const settings = await getTrendSettings();
  const limit = settings.daily_ai_limits[role];
  if (limit != null) {
    const row = await queryOne<{ n: number }>(
      `select count(*)::int as n from provider_usage
       where profile_id = $1 and provider = 'anthropic' and created_at >= ${TODAY_MENDOZA}`,
      [profileId]
    );
    if ((row?.n ?? 0) >= limit) {
      return `Llegaste al límite de ${limit} usos de IA por día. Mañana se renueva (o pedile a un admin que lo suba).`;
    }
  }
  return checkBudget(settings);
}

export async function monthSpendUsd(): Promise<number> {
  const row = await queryOne<{ total: number | null }>(
    "select sum(cost_usd) as total from provider_usage where created_at >= date_trunc('month', now())"
  );
  return Number(row?.total ?? 0);
}

/** Corta si ya se paso el presupuesto mensual; avisa a los admins (una vez por mes) al llegar al 80%. */
async function checkBudget(settings: TrendSettings): Promise<string | null> {
  if (!settings.monthly_budget_usd || settings.monthly_budget_usd <= 0) return null;
  const spent = await monthSpendUsd();
  const month = new Date().toISOString().slice(0, 7);
  if (spent >= settings.monthly_budget_usd * 0.8 && settings.budget_warned_month !== month) {
    await query("update trend_settings set budget_warned_month = $1 where id = true", [month]);
    const admins = await query<{ id: string }>("select id from profiles where role = 'admin'");
    await notifyMany(
      admins.map((a) => a.id),
      "usage_budget",
      "Consumo de IA y APIs al 80% del presupuesto",
      `Van USD ${spent.toFixed(2)} de USD ${settings.monthly_budget_usd.toFixed(2)} este mes.`,
      "/admin/consumo"
    );
  }
  if (spent >= settings.monthly_budget_usd) {
    return "Se alcanzó el presupuesto mensual de IA y APIs. Un admin lo puede subir en Consumo IA.";
  }
  return null;
}
