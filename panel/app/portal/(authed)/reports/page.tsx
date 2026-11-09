import { requireClient } from "@/lib/auth/requireClient";
import { getClientReports } from "@/lib/portal/queries";
import { Card } from "@/components/ui/Card";
import { formatDate, formatMonthLabel } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function PortalReportsPage() {
  const { clientId } = await requireClient();
  const reports = await getClientReports(clientId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Reportes</h1>
        <p className="text-sm text-text-muted">Reportes mensuales publicados por Novarix.</p>
      </div>

      <Card>
        {reports.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no hay reportes publicados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{r.title}</p>
                  <p className="text-xs text-text-muted">
                    {r.period_month ? formatMonthLabel(r.period_month) : formatDate(r.created_at)}
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
    </div>
  );
}
