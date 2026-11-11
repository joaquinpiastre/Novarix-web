import type { NormalizedVideo, Platform, SearchPlan } from "../types";
import type { ProviderRunContext, TrendProvider } from "./types";

// Proveedor de ejemplo para desarrollo y tests: datos deterministicos a partir
// de las palabras clave del plan. Se activa con TRENDS_MOCK_PROVIDER=on y
// reemplaza a los proveedores reales que no esten configurados.

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const HOOKS = ["Antes y después", "Nadie te dice esto", "POV:", "3 errores al", "Probé", "Así quedó"];

export function mockVideos(plan: SearchPlan, platform: Platform, count = 12): NormalizedVideo[] {
  const rand = seeded(`${platform}:${plan.keywords_es.join("|")}`);
  const topic = plan.keywords_es[0] ?? "contenido";
  return Array.from({ length: count }, (_, i) => {
    const followers = Math.round(500 + rand() * 300_000);
    const views = Math.round(followers * (0.2 + rand() * (i < 3 ? 60 : 4)));
    const likes = Math.round(views * (0.01 + rand() * 0.08));
    const id = `mock${platform}${i}${Math.round(rand() * 1e6)}`;
    const daysAgo = 1 + Math.round(rand() * (plan.period_days - 1));
    return {
      platform,
      externalId: id,
      url: `https://example.com/${platform}/${id}`,
      sourceProvider: "mock",
      authorHandle: `cuenta_demo_${i}`,
      authorName: `Cuenta demo ${i}`,
      authorFollowers: followers,
      authorAvgViews: platform === "tiktok" ? null : Math.round(followers * 0.4),
      publishedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      durationSeconds: 8 + Math.round(rand() * 50),
      caption: `${HOOKS[i % HOOKS.length]} ${topic} #${plan.hashtags[0] ?? "demo"} #parati`,
      hashtags: [plan.hashtags[0] ?? "demo", "parati"],
      audio: platform === "tiktok" ? "Sonido original" : null,
      thumbnailUrl: null,
      views,
      likes,
      comments: Math.round(likes * 0.05),
      shares: platform === "instagram" ? null : Math.round(likes * 0.1),
      saves: platform === "tiktok" ? Math.round(likes * 0.08) : null,
      language: "es",
      country: "AR",
      madeForKids: false,
    };
  });
}

export function isMockEnabled(): boolean {
  return process.env.TRENDS_MOCK_PROVIDER === "on";
}

export function mockProviderFor(platform: Platform): TrendProvider {
  return {
    id: "mock",
    platform,
    label: "Datos de ejemplo",
    isConfigured: isMockEnabled,
    async search(plan: SearchPlan, ctx: ProviderRunContext) {
      ctx.note(`${platform}: datos de ejemplo (TRENDS_MOCK_PROVIDER=on), no son videos reales.`);
      return mockVideos(plan, platform);
    },
  };
}
