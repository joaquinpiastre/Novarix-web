import "server-only";
import { query, queryOne } from "@/lib/db";
import type { NormalizedVideo } from "./types";

// Persistencia de videos: upsert deduplicado por (plataforma, id externo).
// Cada vez que un video se vuelve a ver se agrega un punto al historial de
// metricas. No se guarda nunca el archivo de video.

export interface TrendVideoRow {
  id: string;
  platform: "youtube" | "instagram" | "tiktok";
  external_id: string;
  url: string;
  source_provider: string;
  author_handle: string | null;
  author_name: string | null;
  author_followers: number | null;
  author_avg_views: number | null;
  published_at: string | null;
  duration_seconds: number | null;
  caption: string | null;
  hashtags: string[];
  audio: string | null;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  language: string | null;
  country: string | null;
  made_for_kids: boolean | null;
  metrics_history: { at: string; views: number | null; likes: number | null; comments: number | null }[];
  first_seen_at: string;
  last_seen_at: string;
}

export async function upsertVideo(v: NormalizedVideo): Promise<string> {
  const point = JSON.stringify([
    { at: new Date().toISOString(), views: v.views, likes: v.likes, comments: v.comments, shares: v.shares, saves: v.saves },
  ]);
  const row = await queryOne<{ id: string }>(
    `insert into trend_videos
       (platform, external_id, url, source_provider, author_handle, author_name, author_followers, author_avg_views,
        published_at, duration_seconds, caption, hashtags, audio, thumbnail_url, views, likes, comments, shares, saves,
        language, country, made_for_kids, metrics_history)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb)
     on conflict (platform, external_id) do update set
       url = excluded.url,
       source_provider = excluded.source_provider,
       author_handle = coalesce(excluded.author_handle, trend_videos.author_handle),
       author_name = coalesce(excluded.author_name, trend_videos.author_name),
       author_followers = coalesce(excluded.author_followers, trend_videos.author_followers),
       author_avg_views = coalesce(excluded.author_avg_views, trend_videos.author_avg_views),
       published_at = coalesce(excluded.published_at, trend_videos.published_at),
       duration_seconds = coalesce(excluded.duration_seconds, trend_videos.duration_seconds),
       caption = coalesce(excluded.caption, trend_videos.caption),
       hashtags = case when cardinality(excluded.hashtags) > 0 then excluded.hashtags else trend_videos.hashtags end,
       audio = coalesce(excluded.audio, trend_videos.audio),
       thumbnail_url = coalesce(excluded.thumbnail_url, trend_videos.thumbnail_url),
       views = coalesce(excluded.views, trend_videos.views),
       likes = coalesce(excluded.likes, trend_videos.likes),
       comments = coalesce(excluded.comments, trend_videos.comments),
       shares = coalesce(excluded.shares, trend_videos.shares),
       saves = coalesce(excluded.saves, trend_videos.saves),
       language = coalesce(excluded.language, trend_videos.language),
       country = coalesce(excluded.country, trend_videos.country),
       made_for_kids = coalesce(excluded.made_for_kids, trend_videos.made_for_kids),
       -- historial acotado a los ultimos 30 puntos
       metrics_history = (
         select coalesce(jsonb_agg(x), '[]'::jsonb) from (
           select x from jsonb_array_elements(trend_videos.metrics_history || excluded.metrics_history) x
           order by x->>'at' desc limit 30
         ) t
       ),
       last_seen_at = now()
     returning id`,
    [
      v.platform, v.externalId, v.url, v.sourceProvider, v.authorHandle, v.authorName, v.authorFollowers,
      v.authorAvgViews, v.publishedAt, v.durationSeconds, v.caption, v.hashtags, v.audio, v.thumbnailUrl,
      v.views, v.likes, v.comments, v.shares, v.saves, v.language, v.country, v.madeForKids, point,
    ]
  );
  return row!.id;
}

// node-postgres devuelve bigint como string (lib/db.ts solo convierte numeric);
// las metricas de videos son bigint, asi que se pasan a number aca.
const BIGINT_FIELDS = ["author_followers", "author_avg_views", "views", "likes", "comments", "shares", "saves"] as const;

export function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function numifyVideo<T extends Partial<Record<(typeof BIGINT_FIELDS)[number], unknown>>>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  for (const k of BIGINT_FIELDS) if (k in out) out[k] = toNumberOrNull(out[k]);
  return out as T;
}

export async function getVideo(id: string): Promise<TrendVideoRow | null> {
  const row = await queryOne<TrendVideoRow>("select * from trend_videos where id = $1", [id]);
  return row ? numifyVideo(row) : null;
}

export async function getVideos(ids: string[]): Promise<TrendVideoRow[]> {
  if (ids.length === 0) return [];
  const rows = await query<TrendVideoRow>("select * from trend_videos where id = any($1::uuid[])", [ids]);
  return rows.map(numifyVideo);
}
