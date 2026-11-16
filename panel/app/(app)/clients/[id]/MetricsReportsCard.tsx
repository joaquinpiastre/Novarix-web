"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import { METRICS_PERIODS, periodText, type MetricsPeriod } from "@/lib/meta/periods";
import type { MetricsReportListItem } from "@/lib/meta/reportSchema";
import { generateMetricsReportAction } from "./metricsReportActions";

export function MetricsReportsCard({ clientId, reports }: { clientId: string; reports: MetricsReportListItem[] }) {
  const router = useRouter();
  const [period, setPeriod] = useState<MetricsPeriod>("last_30");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useTransition();

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" /> Análisis con IA
        </CardTitle>
        <p className="mt-1 text-sm text-text-muted">
          La IA lee la pauta, Facebook e Instagram del período, los compara con el período anterior y arma un reporte con qué funcionó, qué no y qué mejorar.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-medium text-text-muted">Período</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as MetricsPeriod)}
            className="min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {METRICS_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex-1">
          <Textarea
            label="Indicaciones para la IA (opcional)"
            rows={1}
            maxLength={2000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: enfocate en las consultas por WhatsApp; el cliente quiere vender más pinturas para exterior"
          />
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            run(async () => {
              setError(null);
              const res = await generateMetricsReportAction(clientId, period, prompt);
              if (res.error) setError(res.error);
              else if (res.id) router.push(`/clients/${clientId}/reportes/${res.id}`);
            })
          }
        >
          {pending ? "Analizando…" : "Analizar con IA"}
        </Button>
      </div>
      {pending && <p className="text-xs text-text-muted">La IA está leyendo las métricas. Tarda alrededor de un minuto.</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {reports.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/clients/${clientId}/reportes/${r.id}`} className="flex items-center gap-3 py-3 hover:bg-surface-hover">
                <FileText className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{r.title}</p>
                  <p className="text-xs text-text-muted">
                    {periodText(r.period_from, r.period_to)} · creado el {formatDate(r.created_at.slice(0, 10))}
                  </p>
                </div>
                {r.shared_with_client && <Badge tone="success">En el portal</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
