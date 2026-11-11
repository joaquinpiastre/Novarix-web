import type { Platform, VideoAnalysis } from "./types";

// Forma serializable de una tarjeta de video para los componentes de cliente.
// Sin imports de servidor.

export interface VideoCardData {
  videoId: string;
  platform: Platform;
  externalId: string;
  url: string;
  sourceProvider: string;
  authorHandle: string | null;
  authorName: string | null;
  authorFollowers: number | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  caption: string | null;
  hashtags: string[];
  audio: string | null;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  scores: {
    position: number | null;
    final: number | null;
    relevance: number | null;
    relevanceReason: string | null;
    outlierRatio: number | null;
    outlierScore: number | null;
    velocity: number | null;
    velocityScore: number | null;
    engagementRate: number | null;
    engagementScore: number | null;
    discarded: boolean;
  } | null;
  analysis: VideoAnalysis | null;
  analysisAt: string | null;
  /** Solo en tableros. */
  swipe?: { itemId: string; notes: string | null; tags: string[] };
}

const compact = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(n: number | null | undefined): string {
  if (n == null) return "n/d";
  return compact.format(n);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export function formatPercent(rate: number | null | undefined, digits = 1): string {
  if (rate == null) return "n/d";
  return `${(rate * 100).toFixed(digits).replace(".", ",")}%`;
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  return `USD ${n.toFixed(n < 1 ? 3 : 2).replace(".", ",")}`;
}
