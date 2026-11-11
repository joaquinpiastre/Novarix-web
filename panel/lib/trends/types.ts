import { z } from "zod";

// Tipos y schemas del Radar Viral. Sin imports de servidor: los usan tanto
// los proveedores y el pipeline como los formularios del cliente.

export const PLATFORMS = ["youtube", "instagram", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];
export type ProviderId = Platform | "mock" | "manual";

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
  tiktok: "TikTok",
};

export const PERIOD_OPTIONS = [7, 30, 90] as const;

/** Filtros opcionales que completa la persona junto al prompt. */
export const searchFiltersSchema = z.object({
  platforms: z.array(z.enum(PLATFORMS)).default([...PLATFORMS]),
  period_days: z.coerce.number().int().min(1).max(365).default(30),
  language: z.string().trim().max(10).default("es"),
  region: z.string().trim().max(4).default("AR"),
  max_duration_seconds: z.coerce.number().int().min(5).max(600).default(180),
  min_views: z.coerce.number().int().min(0).default(0),
});
export type SearchFilters = z.output<typeof searchFiltersSchema>;

/**
 * Plan de busqueda que arma la IA a partir del prompt (y que la persona
 * puede editar antes de buscar). Sin restricciones de largo/rango en el
 * schema: la salida estructurada de la API no las soporta todas; se
 * recortan en `normalizePlan`.
 */
export const searchPlanSchema = z.object({
  summary: z.string().describe("Una oración: qué se va a buscar y por qué."),
  keywords_es: z.array(z.string()).describe("Búsquedas en español, de 2 a 5 palabras cada una."),
  keywords_en: z.array(z.string()).describe("Las mismas ideas en inglés."),
  synonyms: z.array(z.string()).describe("Sinónimos y términos del rubro."),
  hashtags: z.array(z.string()).describe("Hashtags sin el #, en minúscula."),
  reference_accounts: z
    .array(z.object({ platform: z.enum(PLATFORMS), handle: z.string() }))
    .describe("Cuentas referentes del rubro a revisar (solo @usuario, sin URL)."),
  providers: z.array(z.enum(PLATFORMS)),
  period_days: z.number(),
  language: z.string(),
  region: z.string(),
  max_duration_seconds: z.number(),
  min_views: z.number(),
  relevance_criteria: z.string().describe("Qué hace que un video sea relevante para este pedido."),
});
export type SearchPlan = z.infer<typeof searchPlanSchema>;

const cleanList = (list: string[], max: number, maxLen = 80) =>
  Array.from(
    new Set(
      list
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.slice(0, maxLen))
    )
  ).slice(0, max);

/** Recorta y sanea un plan (venga de la IA o del formulario de edición). */
export function normalizePlan(plan: SearchPlan): SearchPlan {
  return {
    summary: plan.summary.trim().slice(0, 400),
    keywords_es: cleanList(plan.keywords_es, 8),
    keywords_en: cleanList(plan.keywords_en, 6),
    synonyms: cleanList(plan.synonyms, 10),
    hashtags: cleanList(
      plan.hashtags.map((h) => h.replace(/^#+/, "").replace(/\s+/g, "").toLowerCase()),
      10,
      50
    ),
    reference_accounts: plan.reference_accounts
      .map((a) => ({
        platform: a.platform,
        handle: a.handle
          .trim()
          .replace(/^https?:\/\/[^/]+\//, "")
          .replace(/^@/, "")
          .replace(/\/.*$/, ""),
      }))
      .filter((a) => /^[A-Za-z0-9._-]{1,60}$/.test(a.handle))
      .slice(0, 10),
    providers: Array.from(new Set(plan.providers)).filter((p) => (PLATFORMS as readonly string[]).includes(p)),
    period_days: clampInt(plan.period_days, 1, 365, 30),
    language: (plan.language || "es").slice(0, 10),
    region: (plan.region || "AR").toUpperCase().slice(0, 4),
    max_duration_seconds: clampInt(plan.max_duration_seconds, 5, 600, 180),
    min_views: clampInt(plan.min_views, 0, 1_000_000_000, 0),
    relevance_criteria: plan.relevance_criteria.trim().slice(0, 600),
  };
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Video normalizado, igual para todas las plataformas. Los campos que la plataforma no da quedan en null. */
export interface NormalizedVideo {
  platform: Platform;
  externalId: string;
  url: string;
  sourceProvider: ProviderId;
  authorHandle: string | null;
  authorName: string | null;
  authorFollowers: number | null;
  authorAvgViews: number | null;
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
  language: string | null;
  country: string | null;
  madeForKids: boolean | null;
}

export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return Array.from(new Set(found.map((h) => h.slice(1).toLowerCase()))).slice(0, 30);
}

// ===== Analisis IA por video =====

export const HOOK_TYPES = [
  "pregunta",
  "resultado_primero",
  "polemica",
  "pov",
  "antes_despues",
  "tutorial",
  "tendencia_audio",
  "humor",
  "testimonio",
  "lista",
  "otro",
] as const;
export type HookType = (typeof HOOK_TYPES)[number];

export const HOOK_LABELS: Record<HookType, string> = {
  pregunta: "Pregunta",
  resultado_primero: "Resultado primero",
  polemica: "Polémica",
  pov: "POV",
  antes_despues: "Antes / después",
  tutorial: "Tutorial",
  tendencia_audio: "Tendencia / audio",
  humor: "Humor",
  testimonio: "Testimonio",
  lista: "Lista / top",
  otro: "Otro",
};

export function hookLabel(value: string | null | undefined): string {
  return value && value in HOOK_LABELS ? HOOK_LABELS[value as HookType] : value ?? "—";
}

const shotSchema = z.object({
  time: z.string().describe("Rango de segundos, ej. 0-3s"),
  shot: z.string().describe("Qué se ve: plano y acción"),
  on_screen_text: z.string(),
  voiceover: z.string().describe("Lo que se dice; vacío si no hay voz"),
});

export const videoAnalysisSchema = z.object({
  hook: z.object({
    type: z.enum(HOOK_TYPES),
    description: z.string().describe("Cómo es el gancho de los primeros segundos (inferido)."),
  }),
  format: z.string().describe("Formato: talking head, tutorial, transición, slideshow, etc."),
  structure: z.array(z.string()).describe("Los bloques del video en orden."),
  pacing: z.string().describe("Ritmo y duración: cortes, velocidad."),
  on_screen_text: z.string().describe("Uso de texto en pantalla."),
  cta: z.string().describe("Llamado a la acción, si hay."),
  why_it_worked: z.array(z.string()).describe("2 a 4 razones probables."),
  adaptations: z
    .array(
      z.object({
        title: z.string(),
        hook: z.string().describe("Frase/acción exacta de los primeros 3 segundos."),
        script: z.string().describe("Guion corto completo."),
        shots: z.array(shotSchema),
      })
    )
    .describe("2 o 3 ideas concretas para el cliente."),
  confidence: z.enum(["baja", "media", "alta"]).describe("Qué tan segura es la inferencia con los datos disponibles."),
});
export type VideoAnalysis = z.infer<typeof videoAnalysisSchema>;

export const patternsSchema = z.object({
  summary: z.string(),
  common_hooks: z.array(z.object({ type: z.enum(HOOK_TYPES), count: z.number(), example: z.string() })),
  formats: z.array(z.string()),
  insights: z.array(z.string()).describe("Patrones concretos que se repiten."),
  recommendations: z.array(z.string()).describe("Qué haría el equipo con esto."),
});
export type SearchPatterns = z.infer<typeof patternsSchema> & {
  avg_duration_seconds: number | null;
  top_hashtags: { tag: string; count: number }[];
};

export type SearchStatus = "planning" | "ready" | "queued" | "searching" | "analyzing" | "done" | "error";

export const SEARCH_STATUS_LABELS: Record<SearchStatus, string> = {
  planning: "Armando plan",
  ready: "Plan listo",
  queued: "En cola",
  searching: "Buscando",
  analyzing: "Analizando",
  done: "Terminada",
  error: "Error",
};

export interface ScoreWeights {
  outlier: number;
  velocity: number;
  engagement: number;
  relevance: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = { outlier: 0.35, velocity: 0.25, engagement: 0.15, relevance: 0.25 };
