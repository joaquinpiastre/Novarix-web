import Link from "next/link";
import { requireClient } from "@/lib/auth/requireClient";
import { getClientReports } from "@/lib/portal/queries";
import { listMetricsReports } from "@/lib/meta/report";
import { periodText } from "@/lib/meta/periods";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate, formatMonthLabel } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function PortalReportsPage() {
  const { clientId } = await requireClient();
  const [reports, analyses] = await Promise.all([
    getClientReports(clientId),
    listMetricsReports(clientId, true),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Reportes
        </h1>
        <p className="text-sm text-text-muted">
          Reportes publicados por Novarix.
        </p>
      </div>

      {analyses.length > 0 && (
        <Card>
          <CardTitle>Análisis de resultados</CardTitle>
          <ul className="mt-2 divide-y divide-border">
            {analyses.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/portal/reports/${a.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-surface-hover"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {a.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {periodText(a.period_from, a.period_to)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-accent">Ver →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(reports.length > 0 || analyses.length === 0) && (
        <Card>
          {reports.length === 0 ? (
            <p className="text-sm text-text-muted">
              Todavía no hay reportes publicados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {r.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {r.period_month
                        ? formatMonthLabel(r.period_month)
                        : formatDate(r.created_at)}
                    </p>
                  </div>
                  <a
                    href={`/api/files/client-reports/${r.id}`}
                    className="shrink-0 text-xs text-accent hover:underline"
                  >
                    Descargar →
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
