import "server-only";
import { query, queryOne } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encryption";
import { log } from "@/lib/log";
import { metaGet, MetaApiError } from "./client";
import { AD_INSIGHTS_FIELDS, IG_INSIGHTS_METRICS, PAGE_INSIGHTS_METRICS } from "./metrics";
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

async function syncAdAccount(asset: MetaAsset, token: string, sinceDays: number): Promise<void> {
  const rows = await metaGet<{ data: AdInsightRow[] }>(`act_${asset.external_id}/insights`, token, {
    level: "campaign",
    fields: AD_INSIGHTS_FIELDS,
    time_increment: "1",
    time_range: JSON.stringify({ since: daysAgoISO(sinceDays), until: todayISO() }),
  });

  for (const r of rows.data ?? []) {
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

async function syncPage(asset: MetaAsset, token: string, sinceDays: number): Promise<void> {
  const res = await metaGet<{ data: InsightMetricSeries[] }>(`${asset.external_id}/insights`, token, {
    metric: PAGE_INSIGHTS_METRICS.join(","),
    period: "day",
    since: daysAgoISO(sinceDays),
    until: todayISO(),
  });
  await upsertSocialSeries(asset, res.data ?? [], "page_fan_count", "page_post_engagements");
}

async function syncInstagram(asset: MetaAsset, token: string, sinceDays: number): Promise<void> {
  const res = await metaGet<{ data: InsightMetricSeries[] }>(`${asset.external_id}/insights`, token, {
    metric: IG_INSIGHTS_METRICS.join(","),
    period: "day",
    since: daysAgoISO(sinceDays),
    until: todayISO(),
  });
  await upsertSocialSeries(asset, res.data ?? [], "follower_count", "reach");
}

async function upsertSocialSeries(
  asset: MetaAsset,
  series: InsightMetricSeries[],
  followersMetric: string,
  engagementOrReachMetric: string
): Promise<void> {
  const byDate = new Map<string, { followers?: number; engagement?: number }>();

  for (const s of series) {
    for (const v of s.values ?? []) {
      const date = v.end_time.slice(0, 10);
      const row = byDate.get(date) ?? {};
      if (s.name === followersMetric) row.followers = v.value;
      if (s.name === engagementOrReachMetric) row.engagement = v.value;
      byDate.set(date, row);
    }
  }

  for (const [date, vals] of byDate) {
    await query(
      `insert into social_insights_daily (asset_id, client_id, date, followers, reach, engagement)
       values ($1,$2,$3,$4,$4,$5)
       on conflict (asset_id, date) do update set followers=excluded.followers, engagement=excluded.engagement`,
      [asset.id, asset.client_id, date, vals.followers ?? null, vals.engagement ?? null]
    );
  }
}

/** Sincroniza todos los activos de una conexion. sinceDays=3 para la sync diaria normal (Meta reajusta datos de los ultimos dias); mas alto para un backfill inicial. */
export async function syncConnection(connectionId: string, sinceDays = 3): Promise<void> {
  const connection = await queryOne<MetaConnection>("select * from meta_connections where id = $1", [
    connectionId,
  ]);
  if (!connection) return;

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
      else if (asset.asset_type === "instagram") await syncInstagram(asset, token, sinceDays);
    } catch (err) {
      hadError = true;
      const message = err instanceof MetaApiError ? err.message : String(err);
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
}

export async function syncAllActiveConnections(): Promise<void> {
  const connections = await query<{ id: string }>(
    "select id from meta_connections where status != 'error'"
  );
  for (const c of connections) {
    try {
      await syncConnection(c.id, 3);
    } catch (err) {
      log.error("meta sync connection failed", { connectionId: c.id, err: String(err) });
    }
  }
}
