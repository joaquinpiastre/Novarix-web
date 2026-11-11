import "server-only";
import { recordProviderUsage } from "@/lib/usage/record";
import type { NormalizedVideo, SearchPlan } from "../types";
import { ProviderError, type ProviderRunContext, type TrendProvider } from "./types";

// TikTok (verificado el 2026-11-11):
// - Research API oficial: solo instituciones academicas / sin fines de lucro
//   y exige independencia de intereses comerciales. Una agencia NO califica.
// - oEmbed (tiktok.com/oembed?url=) sin autenticacion, pero sin metricas. TikTok
//   avisa que "Embed Videos" se depreca; para mostrar usamos el Embed Player
//   (https://www.tiktok.com/player/v1/{id}).
// - Busqueda automatica: SOLO via proveedor de terceros (Apify,
//   clockworks/tiktok-scraper, desde USD 1,70 cada 1.000 resultados), detras de
//   TRENDS_TIKTOK_PROVIDER=apify. Riesgos: es scraping (los terminos de TikTok
//   lo prohiben), se rompe cuando TikTok cambia su web y el costo depende del
//   volumen. Apagado por defecto; la decision de activarlo es de Novarix.

export function tiktokMode(): "manual" | "apify" {
  return process.env.TRENDS_TIKTOK_PROVIDER === "apify" && process.env.APIFY_TOKEN ? "apify" : "manual";
}

const COST_PER_RESULT = Number(process.env.APIFY_COST_PER_RESULT ?? 0.0017);
const RESULTS_PER_QUERY = Number(process.env.APIFY_RESULTS_PER_QUERY ?? 20);

/** Sin busqueda automatica: los videos de TikTok se agregan pegando el link. */
export const tiktokManualProvider: TrendProvider = {
  id: "tiktok",
  platform: "tiktok",
  label: "TikTok (links manuales)",
  isConfigured: () => true,
  async search(_plan: SearchPlan, ctx: ProviderRunContext) {
    ctx.note("TikTok: la búsqueda automática está apagada (no hay API oficial para agencias). Podés pegar links de TikTok en \"Analizar un link\".");
    return [];
  },
};

interface ApifyTikTokItem {
  id?: string;
  text?: string;
  createTimeISO?: string;
  webVideoUrl?: string;
  playCount?: number;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  collectCount?: number;
  hashtags?: { name?: string }[];
  authorMeta?: { name?: string; nickName?: string; fans?: number };
  videoMeta?: { duration?: number; coverUrl?: string };
  musicMeta?: { musicName?: string; musicAuthor?: string };
}

export const tiktokApifyProvider: TrendProvider = {
  id: "tiktok",
  platform: "tiktok",
  label: "TikTok vía Apify (terceros)",
  isConfigured: () => tiktokMode() === "apify",

  async search(plan: SearchPlan, ctx: ProviderRunContext): Promise<NormalizedVideo[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new ProviderError("Falta APIFY_TOKEN.");
    const actor = process.env.APIFY_TIKTOK_ACTOR ?? "clockworks~tiktok-scraper";
    const input = {
      searchQueries: plan.keywords_es.slice(0, 3),
      hashtags: plan.hashtags.slice(0, 3),
      resultsPerPage: RESULTS_PER_QUERY,
      searchSection: "/video",
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadAvatars: false,
      shouldDownloadMusicCovers: false,
    };
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=180`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
        cache: "no-store",
      }
    );
    if (!res.ok) throw new ProviderError(`Apify devolvió un error (${res.status}).`);
    const items = (await res.json()) as ApifyTikTokItem[];
    await recordProviderUsage({
      provider: "apify",
      operation: "tiktok-scraper",
      units: items.length,
      costUsd: items.length * COST_PER_RESULT,
      profileId: ctx.profileId,
      clientId: ctx.clientId,
      searchId: ctx.searchId,
    });

    const since = Date.now() - plan.period_days * 86_400_000;
    return items
      .filter((i) => i.id && i.webVideoUrl)
      .map(
        (i): NormalizedVideo => ({
          platform: "tiktok",
          externalId: String(i.id),
          url: i.webVideoUrl!,
          sourceProvider: "tiktok",
          authorHandle: i.authorMeta?.name ?? null,
          authorName: i.authorMeta?.nickName ?? null,
          authorFollowers: i.authorMeta?.fans ?? null,
          authorAvgViews: null,
          publishedAt: i.createTimeISO ?? null,
          durationSeconds: i.videoMeta?.duration ?? null,
          caption: i.text?.slice(0, 2000) ?? null,
          hashtags: (i.hashtags ?? []).map((h) => (h.name ?? "").toLowerCase()).filter(Boolean),
          audio: i.musicMeta?.musicName ? `${i.musicMeta.musicName}${i.musicMeta.musicAuthor ? ` — ${i.musicMeta.musicAuthor}` : ""}` : null,
          thumbnailUrl: i.videoMeta?.coverUrl ?? null,
          views: i.playCount ?? null,
          likes: i.diggCount ?? null,
          comments: i.commentCount ?? null,
          shares: i.shareCount ?? null,
          saves: i.collectCount ?? null,
          language: null,
          country: null,
          madeForKids: null,
        })
      )
      .filter(
        (v) =>
          (!v.publishedAt || Date.parse(v.publishedAt) >= since) &&
          (v.durationSeconds == null || v.durationSeconds <= plan.max_duration_seconds) &&
          (v.views ?? 0) >= plan.min_views
      );
  },
};

export interface TikTokOEmbed {
  title?: string;
  author_name?: string;
  author_unique_id?: string;
  thumbnail_url?: string;
}

/** oEmbed oficial de TikTok (sin auth). Devuelve null si falla: el link igual se puede guardar. */
export async function tiktokOEmbed(url: string): Promise<TikTokOEmbed | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as TikTokOEmbed;
  } catch {
    return null;
  }
}
