import { describe, expect, it } from "vitest";
import {
  engagementRateToScore,
  finalScore,
  intrinsicScores,
  normalizeWeights,
  outlierRatioToScore,
  parseIsoDuration,
  velocityScores,
} from "./score";
import { DEFAULT_WEIGHTS } from "./types";

const now = new Date("2026-11-11T12:00:00Z");

describe("intrinsicScores", () => {
  it("usa el promedio de vistas de la cuenta si está, antes que los seguidores", () => {
    const s = intrinsicScores(
      {
        views: 100_000,
        likes: 5_000,
        comments: 300,
        shares: 200,
        saves: 500,
        authorFollowers: 1_000_000,
        authorAvgViews: 10_000,
        publishedAt: "2026-11-01T12:00:00Z",
      },
      now
    );
    expect(s.outlierBase).toBe("avg_views");
    expect(s.outlierRatio).toBe(10);
    expect(s.velocity).toBe(10_000);
    expect(s.engagementRate).toBeCloseTo(0.06, 5);
  });

  it("un video que explotó en una cuenta chica tiene outlier alto", () => {
    const small = intrinsicScores({ views: 500_000, likes: null, comments: null, shares: null, saves: null, authorFollowers: 2_000, authorAvgViews: null, publishedAt: null }, now);
    const big = intrinsicScores({ views: 500_000, likes: null, comments: null, shares: null, saves: null, authorFollowers: 5_000_000, authorAvgViews: null, publishedAt: null }, now);
    expect(small.outlierBase).toBe("followers");
    expect(small.outlierScore!).toBeGreaterThan(big.outlierScore!);
    expect(small.outlierScore).toBe(100);
  });

  it("sin vistas (ej. Instagram por hashtag) no inventa outlier, velocidad ni engagement", () => {
    const s = intrinsicScores({ views: null, likes: 1000, comments: 50, shares: null, saves: null, authorFollowers: null, authorAvgViews: null, publishedAt: "2026-11-10T00:00:00Z" }, now);
    expect(s.outlierScore).toBeNull();
    expect(s.velocity).toBeNull();
    expect(s.engagementRate).toBeNull();
  });

  it("un video publicado hace menos de un día cuenta como 1 día (no divide por casi cero)", () => {
    const s = intrinsicScores({ views: 1000, likes: 0, comments: 0, shares: 0, saves: 0, authorFollowers: null, authorAvgViews: null, publishedAt: "2026-11-11T11:00:00Z" }, now);
    expect(s.velocity).toBe(1000);
  });
});

describe("escalas", () => {
  it("outlier: 0 → 0, 50x → 100, monótona", () => {
    expect(outlierRatioToScore(0)).toBe(0);
    expect(outlierRatioToScore(50)).toBe(100);
    expect(outlierRatioToScore(500)).toBe(100);
    expect(outlierRatioToScore(10)).toBeGreaterThan(outlierRatioToScore(5));
  });

  it("engagement: 10% = 100, 5% = 50", () => {
    expect(engagementRateToScore(0.1)).toBe(100);
    expect(engagementRateToScore(0.05)).toBe(50);
    expect(engagementRateToScore(0.5)).toBe(100);
  });

  it("velocidad relativa al más rápido del set", () => {
    const [a, b, c] = velocityScores([1000, 10, null]);
    expect(a).toBe(100);
    expect(b!).toBeLessThan(a!);
    expect(c).toBeNull();
  });
});

describe("finalScore", () => {
  it("pondera con los pesos configurados", () => {
    const r = finalScore({ outlier: 100, velocity: 100, engagement: 100, relevance: 100 }, DEFAULT_WEIGHTS);
    expect(r.score).toBe(100);
    expect(r.used).toHaveLength(4);
  });

  it("si falta un componente reparte su peso entre los demás", () => {
    const r = finalScore({ outlier: null, velocity: null, engagement: null, relevance: 80 }, DEFAULT_WEIGHTS);
    expect(r.score).toBe(80);
    expect(r.used).toEqual(["relevance"]);
  });

  it("sin datos devuelve null", () => {
    expect(finalScore({ outlier: null, velocity: null, engagement: null, relevance: null }, DEFAULT_WEIGHTS).score).toBeNull();
  });

  it("normaliza pesos que no suman 1", () => {
    const w = normalizeWeights({ outlier: 2, velocity: 1, engagement: 1, relevance: 0 });
    expect(w.outlier + w.velocity + w.engagement + w.relevance).toBeCloseTo(1, 3);
    expect(w.outlier).toBe(0.5);
  });
});

describe("parseIsoDuration", () => {
  it("convierte duraciones de YouTube", () => {
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("PT1M5S")).toBe(65);
    expect(parseIsoDuration("PT1H")).toBe(3600);
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("basura")).toBeNull();
  });
});
