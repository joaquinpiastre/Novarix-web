import "server-only";
import { queryOne, query } from "@/lib/db";
import { fetchYoutubeVideos } from "./providers/youtube";
import { tiktokOEmbed } from "./providers/tiktok";
import { intrinsicScores } from "./score";
import { upsertVideo } from "./store";
import { extractHashtags, type NormalizedVideo } from "./types";
import { isShortTikTokUrl, parseVideoUrl } from "./links";

// "Analizar un link": la persona pega un video (TikTok, Reel o Short) y se
// analiza con IA. Para TikTok e Instagram no hay API oficial que de metricas
// de un video suelto, asi que las metricas se pueden cargar a mano (opcional).

export interface ManualMetrics {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  followers?: number | null;
}

async function resolveShortLink(raw: string): Promise<string> {
  if (!isShortTikTokUrl(raw)) return raw;
  try {
    const res = await fetch(raw, { redirect: "follow", cache: "no-store" });
    return res.url || raw;
  } catch {
    return raw;
  }
}

export async function createManualSearch(input: {
  url: string;
  clientId: string | null;
  profileId: string;
  metrics: ManualMetrics;
}): Promise<{ searchId?: string; error?: string }> {
  const parsed = parseVideoUrl(await resolveShortLink(input.url));
  if (!parsed) return { error: "No reconozco ese link. Pegá un link de TikTok, de un Reel de Instagram o de un Short de YouTube." };

  const usage = { profileId: input.profileId, clientId: input.clientId };
  const m = input.metrics;
  let video: NormalizedVideo = {
    platform: parsed.platform,
    externalId: parsed.externalId,
    url: parsed.canonicalUrl,
    sourceProvider: "manual",
    authorHandle: null,
    authorName: null,
    authorFollowers: m.followers ?? null,
    authorAvgViews: null,
    publishedAt: null,
    durationSeconds: null,
    caption: null,
    hashtags: [],
    audio: null,
    thumbnailUrl: null,
    views: m.views ?? null,
    likes: m.likes ?? null,
    comments: m.comments ?? null,
    shares: m.shares ?? null,
    saves: m.saves ?? null,
    language: null,
    country: null,
    madeForKids: null,
  };

  if (parsed.platform === "youtube" && process.env.YOUTUBE_API_KEY) {
    const [yt] = await fetchYoutubeVideos([parsed.externalId], usage);
    if (yt) video = yt;
  } else if (parsed.platform === "tiktok") {
    const oembed = await tiktokOEmbed(parsed.canonicalUrl);
    if (oembed) {
      video.caption = oembed.title ?? null;
      video.hashtags = extractHashtags(oembed.title);
      video.authorHandle = oembed.author_unique_id ?? null;
      video.authorName = oembed.author_name ?? null;
      video.thumbnailUrl = oembed.thumbnail_url ?? null;
    }
  }

  const videoId = await upsertVideo(video);
  const s = intrinsicScores(video);
  const search = await queryOne<{ id: string }>(
    `insert into trend_searches (profile_id, client_id, kind, prompt, status, progress, progress_message)
     values ($1, $2, 'manual', $3, 'queued', 5, 'En cola para analizar…') returning id`,
    [input.profileId, input.clientId, `Link: ${parsed.canonicalUrl}`]
  );
  await query(
    `insert into trend_search_results
       (search_id, video_id, position, outlier_ratio, outlier_score, velocity, engagement_rate, engagement_score, final_score, discarded)
     values ($1, $2, 1, $3, $4, $5, $6, $7, null, false)`,
    [search!.id, videoId, s.outlierRatio, s.outlierScore, s.velocity, s.engagementRate, s.engagementScore]
  );
  return { searchId: search!.id };
}
