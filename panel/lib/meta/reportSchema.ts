import { z } from "zod";

// Forma del reporte de métricas que devuelve la IA (salida estructurada).
// Chico a propósito: la gramática de salida estructurada tiene un límite.

export const metricsReportSchema = z.object({
  title: z.string().describe("Título corto con la conclusión principal, ej: 'Octubre: más alcance, menos consultas'."),
  summary: z.string().describe("Resumen ejecutivo de 3 a 5 oraciones para el dueño del negocio."),
  health: z.enum(["muy_bien", "bien", "regular", "mal"]).describe("Evaluación general del período."),
  highlights: z
    .array(
      z.object({
        label: z.string(),
        value: z.string().describe("El número del período, ya formateado (ej: '$ 120.500', '4.320')."),
        trend: z.enum(["sube", "baja", "estable", "sin_dato"]).describe("Contra el período anterior."),
        comment: z.string().describe("Una oración: qué significa y si es bueno o malo."),
      })
    )
    .describe("Entre 4 y 6 números clave."),
  channels: z
    .array(z.object({ channel: z.string().describe("Pauta, Instagram o Facebook."), analysis: z.string() }))
    .describe("Un análisis por canal, solo de los que tienen datos."),
  wins: z.array(z.string()).describe("Lo que funcionó, cada uno con el dato que lo respalda."),
  problems: z.array(z.string()).describe("Lo que no funcionó o preocupa, cada uno con el dato."),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string().describe("Qué hacer exactamente y por qué, en 2 a 4 oraciones."),
        area: z.enum(["pauta", "contenido", "perfil", "comunidad", "general"]),
        priority: z.enum(["alta", "media", "baja"]),
        metric_to_watch: z.string().describe("Qué número debería mejorar y cuánto, si se puede estimar."),
      })
    )
    .describe("Entre 5 y 8 mejoras para el próximo período, de mayor a menor prioridad."),
  client_message: z.string().describe("Mensaje breve y cálido para mandarle al cliente por WhatsApp: resultados y próximos pasos, sin tecnicismos."),
});

export type MetricsReport = z.infer<typeof metricsReportSchema>;

export const HEALTH_LABELS: Record<MetricsReport["health"], string> = {
  muy_bien: "Muy bien",
  bien: "Bien",
  regular: "Regular",
  mal: "Necesita atención",
};

export const AREA_LABELS: Record<MetricsReport["recommendations"][number]["area"], string> = {
  pauta: "Pauta",
  contenido: "Contenido",
  perfil: "Perfil",
  comunidad: "Comunidad",
  general: "General",
};

export interface MetricsReportRow {
  id: string;
  client_id: string;
  period_key: string;
  period_from: string;
  period_to: string;
  title: string;
  report: MetricsReport;
  team_prompt: string | null;
  model: string;
  shared_with_client: boolean;
  shared_at: string | null;
  created_by: string | null;
  created_at: string;
}

export type MetricsReportListItem = Pick<MetricsReportRow, "id" | "period_key" | "period_from" | "period_to" | "title" | "shared_with_client" | "created_at">;
