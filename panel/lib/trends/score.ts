import type { ScoreWeights } from "./types";

// Scoring de viralidad: funciones puras, testeadas en score.test.ts.
// Todo es "metrica Novarix", calculada a partir de los numeros que da cada
// plataforma -- nunca reemplaza ni pisa la cifra original (las politicas de
// YouTube lo exigen), se muestra al lado.

export interface ScoreInput {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  authorFollowers: number | null;
  authorAvgViews: number | null;
  publishedAt: string | null;
}

export interface IntrinsicScores {
  /** vistas ÷ promedio de vistas de la cuenta (o ÷ seguidores si no hay promedio). */
  outlierRatio: number | null;
  outlierBase: "avg_views" | "followers" | null;
  outlierScore: number | null;
  /** vistas por dia desde la publicacion. */
  velocity: number | null;
  /** (likes + comentarios + compartidos + guardados) ÷ vistas. */
  engagementRate: number | null;
  engagementScore: number | null;
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ratio 1x = ~18 pts, 5x = ~46, 10x = ~61, 50x o más = 100 (escala logarítmica). */
export function outlierRatioToScore(ratio: number): number {
  return round2(clamp((100 * Math.log10(1 + Math.max(0, ratio))) / Math.log10(51)));
}

/** 10% de engagement sobre vistas ya es excelente en video corto: 10% = 100 pts. */
export function engagementRateToScore(rate: number): number {
  return round2(clamp((rate / 0.1) * 100));
}

export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(1, (now.getTime() - t) / 86_400_000);
}

export function intrinsicScores(v: ScoreInput, now: Date = new Date()): IntrinsicScores {
  let outlierRatio: number | null = null;
  let outlierBase: IntrinsicScores["outlierBase"] = null;
  if (v.views != null) {
    if (v.authorAvgViews && v.authorAvgViews > 0) {
      outlierRatio = v.views / v.authorAvgViews;
      outlierBase = "avg_views";
    } else if (v.authorFollowers && v.authorFollowers > 0) {
      outlierRatio = v.views / v.authorFollowers;
      outlierBase = "followers";
    }
  }

  const days = daysSince(v.publishedAt, now);
  const velocity = v.views != null && days != null ? v.views / days : null;

  let engagementRate: number | null = null;
  if (v.views && v.views > 0) {
    const interactions = (v.likes ?? 0) + (v.comments ?? 0) + (v.shares ?? 0) + (v.saves ?? 0);
    engagementRate = interactions / v.views;
  }

  return {
    outlierRatio: outlierRatio != null ? round2(outlierRatio) : null,
    outlierBase,
    outlierScore: outlierRatio != null ? outlierRatioToScore(outlierRatio) : null,
    velocity: velocity != null ? round2(velocity) : null,
    engagementRate: engagementRate != null ? Math.round(engagementRate * 100000) / 100000 : null,
    engagementScore: engagementRate != null ? engagementRateToScore(engagementRate) : null,
  };
}

/**
 * La velocidad se puntua en escala logaritmica relativa al video mas rapido
 * del mismo set de resultados (el mas rapido = 100). Asi un set de nicho
 * no queda todo en 0 frente a un numero absoluto.
 */
export function velocityScores(velocities: (number | null)[]): (number | null)[] {
  const max = Math.max(0, ...velocities.filter((v): v is number => v != null));
  if (max <= 0) return velocities.map((v) => (v == null ? null : 0));
  const denom = Math.log10(1 + max);
  return velocities.map((v) => (v == null ? null : round2(clamp((100 * Math.log10(1 + v)) / denom))));
}

/**
 * Score final ponderado. Si a un video le falta un componente (ej. Instagram
 * por hashtag no da vistas), su peso se reparte entre los que si estan, y se
 * informa cuales se usaron.
 */
export function finalScore(
  parts: { outlier: number | null; velocity: number | null; engagement: number | null; relevance: number | null },
  weights: ScoreWeights
): { score: number | null; used: (keyof ScoreWeights)[] } {
  const used = (Object.keys(weights) as (keyof ScoreWeights)[]).filter(
    (k) => parts[k] != null && weights[k] > 0
  );
  const totalWeight = used.reduce((acc, k) => acc + weights[k], 0);
  if (totalWeight <= 0) return { score: null, used: [] };
  const sum = used.reduce((acc, k) => acc + (parts[k] as number) * weights[k], 0);
  return { score: round2(sum / totalWeight), used };
}

/** Normaliza pesos a que sumen 1 (y descarta negativos). */
export function normalizeWeights(w: Partial<ScoreWeights>): ScoreWeights {
  const base = {
    outlier: Math.max(0, Number(w.outlier ?? 0) || 0),
    velocity: Math.max(0, Number(w.velocity ?? 0) || 0),
    engagement: Math.max(0, Number(w.engagement ?? 0) || 0),
    relevance: Math.max(0, Number(w.relevance ?? 0) || 0),
  };
  const total = base.outlier + base.velocity + base.engagement + base.relevance;
  if (total <= 0) return { outlier: 0.35, velocity: 0.25, engagement: 0.15, relevance: 0.25 };
  return {
    outlier: round4(base.outlier / total),
    velocity: round4(base.velocity / total),
    engagement: round4(base.engagement / total),
    relevance: round4(base.relevance / total),
  };
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Duracion ISO 8601 de YouTube (PT1M5S) a segundos. */
export function parseIsoDuration(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, s] = m;
  return Math.round(Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0));
}

export function videoDedupKey(platform: string, externalId: string): string {
  return `${platform}:${externalId}`;
}
