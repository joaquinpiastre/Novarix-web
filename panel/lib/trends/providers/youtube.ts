import "server-only";
import { queryOne } from "@/lib/db";
import { recordProviderUsage, type UsageContext } from "@/lib/usage/record";
import { parseIsoDuration } from "../score";
import { extractHashtags, type NormalizedVideo, type SearchPlan } from "../types";
import { ProviderError, type ProviderRunContext, type TrendProvider } from "./types";

// YouTube Data API v3 (verificado en developers.google.com el 2026-11-11):
// - search.list: 1 unidad, pero con un tope PROPIO de 100 llamadas por dia.
// - videos.list / channels.list: 1 unidad cada una, hasta 50 ids por llamada.
// - Cuota diaria general: 10.000 unidades; se reinicia a medianoche hora del Pacifico.
// - No hay filtro "Shorts": se usa videoDuration=short (< 4 min) y despues se
//   filtra por la duracion real (contentDetails.duration) <= max_duration_seconds.
// - Politicas: estadisticas de terceros no se guardan mas de 30 dias (ver
//   lib/trends/maintenance.ts) y no se reemplazan por calculos propios.

const API = "https://www.googleapis.com/youtube/v3";
const SEARCH_DAILY_CAP = Number(process.env.YOUTUBE_SEARCH_DAILY_CAP ?? 90);
const KEYWORDS_PER_SEARCH = Number(process.env.YOUTUBE_KEYWORDS_PER_SEARCH ?? 5);
const RESULTS_PER_KEYWORD = 25;

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new ProviderError("Falta YOUTUBE_API_KEY.");
  return key;
}

async function ytGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey());
  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason as string | undefined;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new ProviderError("Se agotó la cuota diaria de YouTube. Se renueva a la medianoche (hora del Pacífico).");
    }
    throw new ProviderError(`YouTube devolvió un error (${res.status}${reason ? `: ${reason}` : ""}).`);
  }
  return body as T;
}

/** Llamadas a search.list hechas hoy (dia del Pacifico, que es como cuenta Google). */
async function searchCallsToday(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `select coalesce(sum(units), 0)::int as n from provider_usage
     where provider = 'youtube' and operation = 'search.list'
       and created_at >= date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles'`
  );
  return row?.n ?? 0;
}

interface YtVideo {
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    title: string;
    description: string;
    tags?: string[];
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
    thumbnails?: Record<string, { url: string }>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  status?: { madeForKids?: boolean };
}

interface YtChannel {
  id: string;
  snippet?: { customUrl?: string; country?: string };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount?: string; videoCount?: string };
}

const num = (v: string | undefined) => (v == null ? null : Number(v));

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Trae videos + canales por id y los normaliza. Lo usan la busqueda, los links manuales y el refresco de 30 dias. */
export async function fetchYoutubeVideos(ids: string[], usage: UsageContext): Promise<NormalizedVideo[]> {
  const videos: YtVideo[] = [];
  for (const batch of chunk(Array.from(new Set(ids)), 50)) {
    const res = await ytGet<{ items: YtVideo[] }>("videos", {
      part: "snippet,contentDetails,statistics,status",
      id: batch.join(","),
      maxResults: "50",
    });
    await recordProviderUsage({ ...usage, provider: "youtube", operation: "videos.list" });
    videos.push(...(res.items ?? []));
  }

  const channels = new Map<string, YtChannel>();
  for (const batch of chunk(Array.from(new Set(videos.map((v) => v.snippet.channelId))), 50)) {
    const res = await ytGet<{ items: YtChannel[] }>("channels", {
      part: "snippet,statistics",
      id: batch.join(","),
      maxResults: "50",
    });
    await recordProviderUsage({ ...usage, provider: "youtube", operation: "channels.list" });
    for (const c of res.items ?? []) channels.set(c.id, c);
  }

  return videos.map((v) => {
    const ch = channels.get(v.snippet.channelId);
    const subs = ch?.statistics && !ch.statistics.hiddenSubscriberCount ? num(ch.statistics.subscriberCount) : null;
    const chViews = num(ch?.statistics?.viewCount);
    const chVideos = num(ch?.statistics?.videoCount);
    const thumbs = v.snippet.thumbnails ?? {};
    const text = `${v.snippet.title}\n${v.snippet.description}`;
    return {
      platform: "youtube",
      externalId: v.id,
      url: `https://www.youtube.com/shorts/${v.id}`,
      sourceProvider: "youtube",
      authorHandle: ch?.snippet?.customUrl?.replace(/^@/, "") ?? null,
      authorName: v.snippet.channelTitle,
      authorFollowers: subs,
      authorAvgViews: chViews && chVideos ? Math.round(chViews / chVideos) : null,
      publishedAt: v.snippet.publishedAt,
      durationSeconds: parseIsoDuration(v.contentDetails?.duration),
      caption: text.slice(0, 2000),
      hashtags: Array.from(new Set([...extractHashtags(text), ...(v.snippet.tags ?? []).map((t) => t.toLowerCase())])).slice(0, 30),
      audio: null,
      thumbnailUrl: (thumbs.high ?? thumbs.medium ?? thumbs.default)?.url ?? null,
      views: num(v.statistics?.viewCount),
      likes: num(v.statistics?.likeCount),
      comments: num(v.statistics?.commentCount),
      shares: null,
      saves: null,
      language: v.snippet.defaultAudioLanguage ?? v.snippet.defaultLanguage ?? null,
      country: ch?.snippet?.country ?? null,
      madeForKids: v.status?.madeForKids ?? null,
    } satisfies NormalizedVideo;
  });
}

export const youtubeProvider: TrendProvider = {
  id: "youtube",
  platform: "youtube",
  label: "YouTube Data API v3",
  isConfigured: () => Boolean(process.env.YOUTUBE_API_KEY),

  async search(plan: SearchPlan, ctx: ProviderRunContext): Promise<NormalizedVideo[]> {
    const usage = { profileId: ctx.profileId, clientId: ctx.clientId, searchId: ctx.searchId };
    const keywords = [...plan.keywords_es, ...plan.keywords_en].slice(0, KEYWORDS_PER_SEARCH);
    if (keywords.length === 0) return [];

    const used = await searchCallsToday();
    const available = Math.max(0, SEARCH_DAILY_CAP - used);
    if (available === 0) {
      ctx.note(`YouTube: ya se usaron las ${SEARCH_DAILY_CAP} búsquedas del día (tope de Google: 100 por día). Se renueva a la medianoche del Pacífico.`);
      return [];
    }
    const toRun = keywords.slice(0, available);
    if (toRun.length < keywords.length) {
      ctx.note(`YouTube: por la cuota diaria se buscaron ${toRun.length} de ${keywords.length} palabras clave.`);
    }

    const publishedAfter = new Date(Date.now() - plan.period_days * 86_400_000).toISOString();
    const ids: string[] = [];
    for (const q of toRun) {
      const params: Record<string, string> = {
        part: "snippet",
        type: "video",
        q,
        order: "viewCount",
        videoDuration: "short",
        publishedAfter,
        maxResults: String(RESULTS_PER_KEYWORD),
        safeSearch: "moderate",
      };
      if (plan.region) params.regionCode = plan.region;
      if (plan.language) params.relevanceLanguage = plan.language;
      const res = await ytGet<{ items: { id: { videoId?: string } }[] }>("search", params);
      await recordProviderUsage({ ...usage, provider: "youtube", operation: "search.list" });
      for (const item of res.items ?? []) if (item.id.videoId) ids.push(item.id.videoId);
    }

    const videos = await fetchYoutubeVideos(ids, usage);
    return videos.filter(
      (v) =>
        (v.durationSeconds == null || v.durationSeconds <= plan.max_duration_seconds) &&
        (v.views ?? 0) >= plan.min_views
    );
  },
};
