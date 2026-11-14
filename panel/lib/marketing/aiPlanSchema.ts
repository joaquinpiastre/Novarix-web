import { z } from "zod";

// Plan de marketing que arma Claude. Sin imports de servidor (la usa tambien
// la pantalla para mostrarlo).
//
// Se genera en dos pasos porque la salida estructurada tiene un tope de
// complejidad de schema ("compiled grammar is too large"):
// 1. document_markdown: el documento estrategico completo, en texto con formato.
// 2. planDataSchema: lo que el panel necesita como datos (objetivos, canales,
//    pauta y el calendario de piezas), armado a partir del documento.

export const PLAN_FORMATS = ["reel", "post", "carrusel", "historia", "video", "anuncio", "vivo", "otro"] as const;
export const PLAN_NETWORKS = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "whatsapp", "x", "other"] as const;
export type PlanFormat = (typeof PLAN_FORMATS)[number];
export type PlanNetwork = (typeof PLAN_NETWORKS)[number];

export const planDataSchema = z.object({
  executive_summary: z.string().describe("Resumen ejecutivo en 4-6 líneas."),
  objectives: z.array(
    z.object({
      objective: z.string(),
      kpi: z.string(),
      target: z.string().describe("Meta numérica concreta."),
    })
  ),
  audience_summary: z.string().describe("Público objetivo en 2-4 líneas."),
  value_proposition: z.string(),
  networks: z.array(z.string()).describe(`Redes del plan. Valores: ${PLAN_NETWORKS.join(", ")}`),
  paid_recommended: z.boolean(),
  monthly_budget_ars: z.number().describe("Presupuesto de pauta mensual en ARS; 0 si no se recomienda."),
  content_calendar: z.array(
    z.object({
      date: z.string().describe("yyyy-MM-dd dentro del período."),
      title: z.string(),
      format: z.string().describe(`Uno de: ${PLAN_FORMATS.join(", ")}`),
      network: z.string().describe(`Red principal. Uno de: ${PLAN_NETWORKS.join(", ")}`),
      pillar: z.string(),
      hook: z.string().describe("Gancho de los primeros 3 segundos o primera línea."),
      brief: z.string().describe("Qué se graba/diseña y qué dice, en 2-4 líneas, listo para producir."),
    })
  ),
});
export type PlanData = z.infer<typeof planDataSchema>;

export interface CalendarPiece {
  date: string;
  title: string;
  format: PlanFormat;
  channels: PlanNetwork[];
  pillar: string;
  hook: string;
  brief: string;
}

/** Lo que se guarda en marketing_plans.ai_plan. */
export interface AiMarketingPlan {
  version: 2;
  document_markdown: string;
  executive_summary: string;
  objectives: { objective: string; kpi: string; target: string }[];
  audience_summary: string;
  value_proposition: string;
  networks: PlanNetwork[];
  paid_recommended: boolean;
  monthly_budget_ars: number;
  content_calendar: CalendarPiece[];
  deliverables: { format: PlanFormat; committed: number }[];
}

const FORMAT_ALIASES: Record<string, PlanFormat> = {
  carousel: "carrusel",
  story: "historia",
  stories: "historia",
  historias: "historia",
  reels: "reel",
  ad: "anuncio",
  ads: "anuncio",
  live: "vivo",
};
const NETWORK_ALIASES: Record<string, PlanNetwork> = { ig: "instagram", fb: "facebook", twitter: "x", yt: "youtube", wa: "whatsapp", otro: "other", otra: "other" };

export function normalizeFormat(v: string): PlanFormat {
  const k = v.trim().toLowerCase();
  if ((PLAN_FORMATS as readonly string[]).includes(k)) return k as PlanFormat;
  return FORMAT_ALIASES[k] ?? "otro";
}

export function normalizeNetwork(v: string): PlanNetwork | null {
  const k = v.trim().toLowerCase();
  if ((PLAN_NETWORKS as readonly string[]).includes(k)) return k as PlanNetwork;
  return NETWORK_ALIASES[k] ?? null;
}

/** Arma el plan final: normaliza formatos/redes, filtra al periodo y calcula los entregables desde el calendario. */
export function buildAiPlan(documentMarkdown: string, data: PlanData, periodStart: string, periodEnd: string): AiMarketingPlan {
  const calendar: CalendarPiece[] = data.content_calendar
    .filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.date) && c.date >= periodStart && c.date <= periodEnd)
    .map((c) => ({
      date: c.date,
      title: c.title,
      format: normalizeFormat(c.format),
      channels: [normalizeNetwork(c.network) ?? "instagram"],
      pillar: c.pillar,
      hook: c.hook,
      brief: c.brief,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const counts = new Map<PlanFormat, number>();
  for (const c of calendar) counts.set(c.format, (counts.get(c.format) ?? 0) + 1);

  return {
    version: 2,
    document_markdown: documentMarkdown,
    executive_summary: data.executive_summary,
    objectives: data.objectives,
    audience_summary: data.audience_summary,
    value_proposition: data.value_proposition,
    networks: Array.from(new Set(data.networks.map(normalizeNetwork).filter((n): n is PlanNetwork => n != null))),
    paid_recommended: data.paid_recommended,
    monthly_budget_ars: Math.max(0, Math.round(data.monthly_budget_ars)),
    content_calendar: calendar,
    deliverables: Array.from(counts.entries()).map(([format, committed]) => ({ format, committed })),
  };
}
