import "server-only";
import { query, queryOne } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encryption";
import { log } from "@/lib/log";
import { metaGet, metaGetAllPages, MetaApiError } from "./client";
import {
  AD_INSIGHTS_FIELDS,
  IG_FEED_INSIGHTS,
  IG_MEDIA_FIELDS,
  IG_REELS_INSIGHTS,
  IG_SERIES_METRICS,
  IG_TOTAL_METRICS,
  PAGE_DAILY_METRICS,
  type SocialColumn,
} from "./metrics";
import { checkAlertsForClient } from "./alerts";
import type { MetaAsset, MetaConnection } from "@/lib/types/domain";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function actionValue(actions: { action_type: string; value: string }[] | undefined, type: string): number {
  return Number(actions?.find((a) => a.action_type === type)?.value ?? 0);
}

interface AdInsightRow {
  date_start: string;
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

/**
 * Cuantos dias pedirle a Meta. Lo normal es `sinceDays`, pero si la cuenta es
 * nueva se traen `firstDays`, y si hubo un hueco (la sync estuvo trabada o el
 * server caido a la hora del cron) se pide desde el ultimo dia guardado.
 */
async function daysToSync(
  table: "meta_insights_daily" | "social_insights_daily",
  assetId: string,
  sinceDays: number,
  firstDays: number,
  maxDays: number
): Promise<number> {
  const row = await queryOne<{ gap: number | null }>(`select (current_date - max(date))::int as gap from ${table} where asset_id = $1`, [assetId]);
  const gap = row?.gap;
  if (gap == null) return Math.min(Math.max(sinceDays, firstDays), maxDays);
  return Math.min(Math.max(sinceDays, gap + 2), maxDays);
}

async function syncAdAccount(asset: MetaAsset, token: string, sinceDays: number): Promise<void> {
  const days = await daysToSync("meta_insights_daily", asset.id, sinceDays, 30, 90);
  // Una fila por campaña y por dia: Meta pagina de a 25, asi que hay que
  // seguir las paginas (antes se leia solo la primera y faltaban dias).
  const rows = await metaGetAllPages<AdInsightRow>(`act_${asset.external_id}/insights`, token, {
    level: "campaign",
    fields: AD_INSIGHTS_FIELDS,
    time_increment: "1",
    time_range: JSON.stringify({ since: daysAgoISO(days), until: todayISO() }),
    limit: "500",
  });

  for (const r of rows) {
    await query(
      `insert into meta_insights_daily
         (asset_id, client_id, date, level, campaign_id, campaign_name, spend, impressions, reach, clicks,
          cpc, cpm, ctr, messaging_conversations, leads, purchases, purchase_value)
       values ($1,$2,$3,'campaign',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (asset_id, date, level, campaign_id) do update set
         spend=excluded.spend, impressions=excluded.impressions, reach=excluded.reach, clicks=excluded.clicks,
         cpc=excluded.cpc, cpm=excluded.cpm, ctr=excluded.ctr,
         messaging_conversations=excluded.messaging_conversations, leads=excluded.leads,
         purchases=excluded.purchases, purchase_value=excluded.purchase_value`,
      [
        asset.id,
        asset.client_id,
        r.date_start,
        r.campaign_id ?? null,
        r.campaign_name ?? null,
        Number(r.spend ?? 0),
        Number(r.impressions ?? 0),
        Number(r.reach ?? 0),
        Number(r.clicks ?? 0),
        r.cpc ? Number(r.cpc) : null,
        r.cpm ? Number(r.cpm) : null,
        r.ctr ? Number(r.ctr) : null,
        actionValue(r.actions, "onsite_conversion.messaging_conversation_started_7d"),
        actionValue(r.actions, "lead"),
        actionValue(r.actions, "purchase") || actionValue(r.actions, "onsite_conversion.purchase"),
        actionValue(r.action_values, "purchase") || actionValue(r.action_values, "onsite_conversion.purchase"),
      ]
    );
  }
}

interface InsightMetricSeries {
  name: string;
  values: { value: number; end_time: string }[];
}

type SocialDay = Partial<Record<SocialColumn, number>>;
type SocialByDate = Map<string, SocialDay>;

const SOCIAL_COLUMNS: SocialColumn[] = [
  "followers",
  "follower_growth",
  "reach",
  "views",
  "engagement",
  "accounts_engaged",
  "profile_visits",
  "link_taps",
];

function setSocial(byDate: SocialByDate, date: string, column: SocialColumn, value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  const row = byDate.get(date) ?? {};
  row[column] = value;
  byDate.set(date, row);
}

/** Guarda por dia; lo que no vino en esta pasada no pisa lo que ya estaba. */
async function saveSocialDays(asset: MetaAsset, byDate: SocialByDate): Promise<void> {
  const cols = SOCIAL_COLUMNS;
  for (const [date, vals] of byDate) {
    await query(
      `insert into social_insights_daily (asset_id, client_id, date, ${cols.join(", ")}, updated_at)
       values ($1, $2, $3, ${cols.map((_, i) => `$${i + 4}`).join(", ")}, now())
       on conflict (asset_id, date) do update set
         ${cols.map((c) => `${c} = coalesce(excluded.${c}, social_insights_daily.${c})`).join(", ")},
         updated_at = now()`,
      [asset.id, asset.client_id, date, ...cols.map((c) => vals[c] ?? null)]
    );
  }
}

/** Primera vez (o despues de un hueco): hasta 30 dias, que es lo maximo que acepta Instagram por pedido. */
function socialDaysToSync(asset: MetaAsset, sinceDays: number): Promise<number> {
  return daysToSync("social_insights_daily", asset.id, sinceDays, 30, 30);
}

/**
 * Pide cada metrica por separado: si Meta retiro una ("#100 ... valid insights
 * metric") o la cuenta no la tiene (pocos seguidores), se saltea y sigue. Solo
 * falla si no salio ninguna.
 */
async function collectSeries(
  objectId: string,
  token: string,
  metrics: Record<string, SocialColumn>,
  since: string,
  until: string,
  byDate: SocialByDate
): Promise<{ ok: number; firstError: unknown }> {
  let ok = 0;
  let firstError: unknown = null;
  for (const [metric, column] of Object.entries(metrics)) {
    try {
      const res = await metaGet<{ data: InsightMetricSeries[] }>(`${objectId}/insights`, token, { metric, period: "day", since, until });
      for (const s of res.data ?? []) {
        for (const v of s.values ?? []) setSocial(byDate, v.end_time.slice(0, 10), column, v.value);
      }
      ok++;
    } catch (err) {
      firstError ??= err;
      log.warn("meta insight metric skipped", { objectId, metric, err: err instanceof MetaApiError ? err.message : String(err) });
    }
  }
  return { ok, firstError };
}

async function syncPage(asset: MetaAsset, token: string, sinceDays: number): Promise<void> {
  // Las metricas de pagina solo se pueden leer con el token de la pagina.
  const page = await metaGet<{ access_token?: string; followers_count?: number; fan_count?: number }>(asset.external_id, token, {
    fields: "access_token,followers_count,fan_count",
  });
  const pageToken = page.access_token ?? token;
  const days = await socialDaysToSync(asset, sinceDays);

  const byDate: SocialByDate = new Map();
  const { ok, firstError } = await collectSeries(asset.external_id, pageToken, PAGE_DAILY_METRICS, daysAgoISO(days), todayISO(), byDate);
  setSocial(byDate, todayISO(), "followers", page.followers_count ?? page.fan_count);
  await saveSocialDays(asset, byDate);
  if (ok === 0 && firstError) throw firstError;
}

async function syncInstagram(asset: MetaAsset, token: string, sinceDays: number): Promise<void> {
  const days = Math.min(await socialDaysToSync(asset, sinceDays), 30); // Instagram no acepta rangos de mas de 30 dias
  const byDate: SocialByDate = new Map();

  const profile = await metaGet<{ followers_count?: number }>(asset.external_id, token, { fields: "followers_count" });
  setSocial(byDate, todayISO(), "followers", profile.followers_count);

  const series = await collectSeries(asset.external_id, token, IG_SERIES_METRICS, daysAgoISO(days), todayISO(), byDate);

  // Los totales (views, interacciones...) Meta los da solo sumados: se piden de a un dia
  // (since=D, until=D+1 coincide con el valor diario de la serie para la fecha D).
  let totalMetrics = Object.keys(IG_TOTAL_METRICS);
  for (let back = days; back >= 1 && totalMetrics.length; back--) {
    const since = daysAgoISO(back);
    const until = daysAgoISO(back - 1);
    try {
      const res = await metaGet<{ data: { name: string; total_value?: { value?: number } }[] }>(`${asset.external_id}/insights`, token, {
        metric: totalMetrics.join(","),
        metric_type: "total_value",
        period: "day",
        since,
        until,
      });
      for (const row of res.data ?? []) {
        const column = IG_TOTAL_METRICS[row.name];
        if (column) setSocial(byDate, since, column, row.total_value?.value ?? 0);
      }
    } catch (err) {
      // Alguna metrica no disponible: se prueban de a una y se descartan las que fallan.
      const working: string[] = [];
      for (const metric of totalMetrics) {
        try {
          const res = await metaGet<{ data: { name: string; total_value?: { value?: number } }[] }>(`${asset.external_id}/insights`, token, {
            metric,
            metric_type: "total_value",
            period: "day",
            since,
            until,
          });
          setSocial(byDate, since, IG_TOTAL_METRICS[metric], res.data?.[0]?.total_value?.value ?? 0);
          working.push(metric);
        } catch {
          log.warn("ig total metric skipped", { assetId: asset.id, metric, err: err instanceof MetaApiError ? err.message : String(err) });
        }
      }
      totalMetrics = working;
    }
  }

  await saveSocialDays(asset, byDate);
  if (series.ok === 0 && totalMetrics.length === 0 && series.firstError) throw series.firstError;
}

interface IgMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
}

/**
 * Posts y reels de los ultimos 90 dias con sus metricas por pieza (para el
 * diagnostico de videos). Las metricas de insights se piden de a una pieza;
 * si Meta rechaza una (cuenta sin permisos, metrica no disponible para ese
 * tipo), se guarda la pieza igual con lo que haya.
 */
async function syncInstagramMedia(asset: MetaAsset, token: string): Promise<void> {
  const since = Date.now() - 90 * 86_400_000;
  const res = await metaGet<{ data: IgMediaItem[] }>(`${asset.external_id}/media`, token, {
    fields: IG_MEDIA_FIELDS,
    limit: "50",
  });

  for (const m of res.data ?? []) {
    if (m.timestamp && Date.parse(m.timestamp) < since) continue;
    const isReel = m.media_product_type === "REELS";
    const metrics: Record<string, number> = {};
    try {
      const ins = await metaGet<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
        `${m.id}/insights`,
        token,
        { metric: (isReel ? IG_REELS_INSIGHTS : IG_FEED_INSIGHTS).join(",") }
      );
      for (const row of ins.data ?? []) {
        const value = row.total_value?.value ?? row.values?.[0]?.value;
        if (typeof value === "number") metrics[row.name] = value;
      }
    } catch (err) {
      log.warn("ig media insights failed", { mediaId: m.id, err: err instanceof MetaApiError ? err.message : String(err) });
    }

    await query(
      `insert into social_posts
         (asset_id, client_id, external_post_id, permalink, caption, posted_at, media_type, media_product_type, thumbnail_url,
          views, reach, likes, comments, saved, shares, total_interactions, engagement, avg_watch_time_ms, total_watch_time_ms, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16,$17,$18, now())
       on conflict (asset_id, external_post_id) do update set
         permalink = excluded.permalink, caption = excluded.caption, posted_at = excluded.posted_at,
         media_type = excluded.media_type, media_product_type = excluded.media_product_type,
         thumbnail_url = excluded.thumbnail_url,
         views = coalesce(excluded.views, social_posts.views),
         reach = coalesce(excluded.reach, social_posts.reach),
         likes = coalesce(excluded.likes, social_posts.likes),
         comments = coalesce(excluded.comments, social_posts.comments),
         saved = coalesce(excluded.saved, social_posts.saved),
         shares = coalesce(excluded.shares, social_posts.shares),
         total_interactions = coalesce(excluded.total_interactions, social_posts.total_interactions),
         engagement = coalesce(excluded.engagement, social_posts.engagement),
         avg_watch_time_ms = coalesce(excluded.avg_watch_time_ms, social_posts.avg_watch_time_ms),
         total_watch_time_ms = coalesce(excluded.total_watch_time_ms, social_posts.total_watch_time_ms),
         updated_at = now()`,
      [
        asset.id,
        asset.client_id,
        m.id,
        m.permalink ?? null,
        m.caption ?? null,
        m.timestamp ?? null,
        m.media_type ?? null,
        m.media_product_type ?? null,
        m.thumbnail_url ?? null,
        metrics.views ?? null,
        metrics.reach ?? null,
        m.like_count ?? null,
        m.comments_count ?? null,
        metrics.saved ?? null,
        metrics.shares ?? null,
        metrics.total_interactions ?? null,
        metrics.ig_reels_avg_watch_time ?? null,
        metrics.ig_reels_video_view_total_time ?? null,
      ]
    );
  }
}

export interface SyncResult {
  synced: number;
  failed: { name: string; error: string }[];
}

/** Sincroniza todos los activos de una conexion. sinceDays=3 para la sync diaria normal (Meta reajusta datos de los ultimos dias); mas alto para un backfill inicial. */
export async function syncConnection(connectionId: string, sinceDays = 3): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: [] };
  const connection = await queryOne<MetaConnection>("select * from meta_connections where id = $1", [
    connectionId,
  ]);
  if (!connection) return result;

  const token = decrypt(connection.access_token);
  const assets = await query<MetaAsset>(
    "select * from meta_assets where connection_id = $1 and active = true",
    [connectionId]
  );

  let hadError = false;
  for (const asset of assets) {
    try {
      if (asset.asset_type === "ad_account") await syncAdAccount(asset, token, sinceDays);
      else if (asset.asset_type === "page") await syncPage(asset, token, sinceDays);
      else if (asset.asset_type === "instagram") {
        await syncInstagram(asset, token, sinceDays);
        await syncInstagramMedia(asset, token);
      }
      result.synced++;
    } catch (err) {
      hadError = true;
      const message = err instanceof MetaApiError ? err.message : String(err);
      result.failed.push({ name: asset.name ?? asset.external_id, error: message });
      log.error("meta sync asset failed", { assetId: asset.id, assetType: asset.asset_type, err: message });
      await query("update meta_connections set status = 'error', last_error = $1 where id = $2", [
        message,
        connectionId,
      ]);
    }
  }

  if (!hadError) {
    await query(
      "update meta_connections set status = 'active', last_synced_at = now(), last_error = null where id = $1",
      [connectionId]
    );
  } else {
    await query("update meta_connections set last_synced_at = now() where id = $1", [connectionId]);
  }

  await checkAlertsForClient(connection.client_id);
  return result;
}

/**
 * Sync diaria. Tambien reintenta las conexiones con error: si no, un fallo
 * pasajero (o una metrica que Meta retiro) dejaba al cliente sin datos para
 * siempre.
 */
export async function syncAllActiveConnections(): Promise<void> {
  const connections = await query<{ id: string }>(
    `select mc.id from meta_connections mc join clients c on c.id = mc.client_id
     where c.status not in ('inactivo', 'eliminado')`
  );
  for (const c of connections) {
    try {
      await syncConnection(c.id, 3);
    } catch (err) {
      log.error("meta sync connection failed", { connectionId: c.id, err: String(err) });
    }
  }
}
