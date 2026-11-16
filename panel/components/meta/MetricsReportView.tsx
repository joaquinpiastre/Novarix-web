import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, AlertTriangle, Minus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { periodText } from "@/lib/meta/periods";
import { AREA_LABELS, HEALTH_LABELS, type MetricsReport } from "@/lib/meta/reportSchema";

// Reporte de métricas generado por IA. Presentacional (sin hooks): lo usan
// la ficha del cliente y el portal. Se imprime bien (Guardar como PDF).

const HEALTH_TONE: Record<MetricsReport["health"], "success" | "accent" | "warning" | "danger"> = {
  muy_bien: "success",
  bien: "accent",
  regular: "warning",
  mal: "danger",
};

const PRIORITY_TONE: Record<"alta" | "media" | "baja", "danger" | "warning" | "neutral"> = {
  alta: "danger",
  media: "warning",
  baja: "neutral",
};

function Trend({ trend }: { trend: MetricsReport["highlights"][number]["trend"] }) {
  if (trend === "sube") return <ArrowUpRight className="h-4 w-4 text-text-muted" aria-label="Sube" />;
  if (trend === "baja") return <ArrowDownRight className="h-4 w-4 text-text-muted" aria-label="Baja" />;
  if (trend === "estable") return <ArrowRight className="h-4 w-4 text-text-muted" aria-label="Estable" />;
  return <Minus className="h-4 w-4 text-text-muted" aria-label="Sin dato" />;
}

export function MetricsReportView({
  report,
  periodFrom,
  periodTo,
  clientName,
  showClientMessage = false,
}: {
  report: MetricsReport;
  periodFrom: string;
  periodTo: string;
  clientName: string;
  showClientMessage?: boolean;
}) {
  return (
    <article className="flex flex-col gap-5 print:gap-4">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Reporte de resultados · {clientName} · {periodText(periodFrom, periodTo)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{report.title}</h1>
          <Badge tone={HEALTH_TONE[report.health]}>{HEALTH_LABELS[report.health]}</Badge>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">{report.summary}</p>
      </header>

      {report.highlights.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 print:grid-cols-3">
          {report.highlights.map((h, i) => (
            <Card key={i} className="flex flex-col gap-1 break-inside-avoid">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-text-muted">{h.label}</span>
                <Trend trend={h.trend} />
              </div>
              <span className="num text-xl font-semibold text-text-primary">{h.value}</span>
              <span className="text-xs text-text-muted">{h.comment}</span>
            </Card>
          ))}
        </div>
      )}

      {report.channels.length > 0 && (
        <Card className="break-inside-avoid">
          <CardTitle>Análisis por canal</CardTitle>
          <div className="mt-3 flex flex-col gap-4">
            {report.channels.map((c, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-text-primary">{c.channel}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text-primary">{c.analysis}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" /> Lo que funcionó
          </CardTitle>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-text-primary">
            {report.wins.length ? report.wins.map((w, i) => <li key={i}>{w}</li>) : <li className="list-none text-text-muted">—</li>}
          </ul>
        </Card>
        <Card className="break-inside-avoid">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" /> Lo que hay que mejorar
          </CardTitle>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-text-primary">
            {report.problems.length ? report.problems.map((p, i) => <li key={i}>{p}</li>) : <li className="list-none text-text-muted">—</li>}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle>Recomendaciones para el próximo período</CardTitle>
        <ol className="mt-3 flex flex-col divide-y divide-border">
          {report.recommendations.map((r, i) => (
            <li key={i} className="flex gap-3 py-3 break-inside-avoid">
              <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">{r.title}</p>
                  <Badge tone={PRIORITY_TONE[r.priority]}>Prioridad {r.priority}</Badge>
                  <Badge>{AREA_LABELS[r.area]}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text-primary">{r.detail}</p>
                <p className="mt-1 text-xs text-text-muted">Qué mirar: {r.metric_to_watch}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {showClientMessage && report.client_message && (
        <Card className="print:hidden">
          <CardTitle>Mensaje para el cliente</CardTitle>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-primary">{report.client_message}</p>
        </Card>
      )}
    </article>
  );
}
