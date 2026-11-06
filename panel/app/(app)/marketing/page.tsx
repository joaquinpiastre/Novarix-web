import Link from "next/link";
import { requirePermission } from "@/lib/auth/requirePermission";
import { query } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

interface PortfolioRow {
  client_id: string;
  client_name: string;
  spend_month: number;
  results_month: number;
  open_alerts: number;
  critical_alerts: number;
}

export default async function MarketingDashboardPage() {
  await requirePermission("marketing.view_all");

  const rows = await query<PortfolioRow>(`
    select
      c.id as client_id,
      c.name as client_name,
      coalesce(mi.spend_month, 0) as spend_month,
      coalesce(mi.results_month, 0) as results_month,
      coalesce(al.open_alerts, 0) as open_alerts,
      coalesce(al.critical_alerts, 0) as critical_alerts
    from clients c
    left join (
      select client_id,
             sum(spend) as spend_month,
             sum(leads) + sum(purchases) + sum(messaging_conversations) as results_month
      from meta_insights_daily
      where date >= date_trunc('month', current_date)
      group by client_id
    ) mi on mi.client_id = c.id
    left join (
      select client_id,
             count(*) filter (where not resolved) as open_alerts,
             count(*) filter (where not resolved and severity = 'critical') as critical_alerts
      from alerts
      group by client_id
    ) al on al.client_id = c.id
    where c.status = 'activo'
    order by coalesce(al.critical_alerts, 0) desc, coalesce(mi.spend_month, 0) desc, c.name
  `);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Marketing — portfolio</h1>
        <p className="text-sm text-text-muted">Todos los clientes activos, de un vistazo.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="pb-2 pr-4">Cliente</th>
                <th className="pb-2 pr-4">Inversión (mes)</th>
                <th className="pb-2 pr-4">Resultados (mes)</th>
                <th className="pb-2">Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.client_id}>
                  <td className="py-3 pr-4">
                    <Link href={`/clients/${r.client_id}`} className="text-text-primary hover:text-accent">
                      {r.client_name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-text-primary">{formatCurrency(r.spend_month)}</td>
                  <td className="py-3 pr-4 text-text-primary">{r.results_month}</td>
                  <td className="py-3">
                    {r.open_alerts === 0 ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <Badge tone={r.critical_alerts > 0 ? "danger" : "warning"}>
                        {r.open_alerts} abierta{r.open_alerts === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-muted">
                    No hay clientes activos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
