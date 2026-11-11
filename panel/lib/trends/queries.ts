import "server-only";
import { query } from "@/lib/db";
import { numifyVideo, type TrendVideoRow } from "./store";
import type { VideoAnalysis } from "./types";
import type { VideoCardData } from "./view";

type ResultRow = TrendVideoRow & {
  position: number;
  relevance: number | null;
  relevance_reason: string | null;
  outlier_ratio: number | null;
  outlier_score: number | null;
  velocity: number | null;
  velocity_score: number | null;
  engagement_rate: number | null;
  engagement_score: number | null;
  final_score: number | null;
  discarded: boolean;
  analysis: VideoAnalysis | null;
  analysis_at: string | null;
};

function toCard(raw: ResultRow, withScores: boolean): VideoCardData {
  const r = numifyVideo(raw);
  return {
    videoId: r.id,
    platform: r.platform,
    externalId: r.external_id,
    url: r.url,
    sourceProvider: r.source_provider,
    authorHandle: r.author_handle,
    authorName: r.author_name,
    authorFollowers: r.author_followers,
    publishedAt: r.published_at,
    durationSeconds: r.duration_seconds,
    caption: r.caption,
    hashtags: r.hashtags ?? [],
    audio: r.audio,
    thumbnailUrl: r.thumbnail_url,
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    saves: r.saves,
    scores: withScores
      ? {
          position: r.position,
          final: r.final_score,
          relevance: r.relevance,
          relevanceReason: r.relevance_reason,
          outlierRatio: r.outlier_ratio,
          outlierScore: r.outlier_score,
          velocity: r.velocity,
          velocityScore: r.velocity_score,
          engagementRate: r.engagement_rate,
          engagementScore: r.engagement_score,
          discarded: r.discarded,
        }
      : null,
    analysis: r.analysis,
    analysisAt: r.analysis_at,
  };
}

/** Resultados de una busqueda, con el analisis IA para el cliente de la busqueda (si hay). */
export async function searchResultCards(searchId: string, clientId: string | null): Promise<VideoCardData[]> {
  const rows = await query<ResultRow>(
    `select v.*, r.position, r.relevance, r.relevance_reason, r.outlier_ratio, r.outlier_score, r.velocity,
            r.velocity_score, r.engagement_rate, r.engagement_score, r.final_score, r.discarded,
            a.analysis, a.created_at as analysis_at
     from trend_search_results r
     join trend_videos v on v.id = r.video_id
     left join trend_analyses a on a.video_id = v.id
       and coalesce(a.client_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
     where r.search_id = $1
     order by r.discarded, r.position`,
    [searchId, clientId]
  );
  return rows.map((r) => toCard(r, true));
}

/** Items de un tablero, con el analisis para el cliente del tablero (o el ultimo que haya, si es tematico). */
export async function boardCards(boardId: string, clientId: string | null): Promise<VideoCardData[]> {
  const rows = await query<ResultRow & { item_id: string; notes: string | null; tags: string[] }>(
    `select v.*, s.id as item_id, s.notes, s.tags, 0 as position,
            null::numeric as relevance, null as relevance_reason, null::numeric as outlier_ratio, null::numeric as outlier_score,
            null::numeric as velocity, null::numeric as velocity_score, null::numeric as engagement_rate,
            null::numeric as engagement_score, null::numeric as final_score, false as discarded,
            a.analysis, a.created_at as analysis_at
     from swipe_items s
     join trend_videos v on v.id = s.video_id
     left join lateral (
       select analysis, created_at from trend_analyses ta
       where ta.video_id = v.id and ($2::uuid is null or ta.client_id = $2 or ta.client_id is null)
       order by (ta.client_id = $2) desc nulls last, ta.created_at desc limit 1
     ) a on true
     where s.board_id = $1
     order by s.created_at desc`,
    [boardId, clientId]
  );
  return rows.map((r) => ({ ...toCard(r, false), swipe: { itemId: r.item_id, notes: r.notes, tags: r.tags ?? [] } }));
}
