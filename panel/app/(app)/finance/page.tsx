import Link from "next/link";
import { requirePermission } from "@/lib/auth/requirePermission";
import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, formatMonthLabel } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

interface ClientRentabilityRow {
  client_id: string;
  client_name: string;
  mrr: number;
  received_month: number;
  team_cost: number;
  direct_costs: number;
  ad_spend_month: number;
}

interface PendingInvoiceRow {
  id: string;
  client_id: string;
  client_name: string;
  amount: number;
  concept: string;
  period_month: string | null;
  created_at: string;
}

interface ChurnRow {
  client_id: string;
  client_name: string;
  created_at: string;
}

export default async function FinanceDashboardPage() {
  await requirePermission("payments_in.manage");

  const [rows, pendingInvoices, churn] = await Promise.all([
    query<ClientRentabilityRow>(`
      select
        c.id as client_id,
        c.name as client_name,
        coalesce(ra.mrr, 0) as mrr,
        coalesce(pi.received_month, 0) as received_month,
        coalesce(ct.team_cost, 0) as team_cost,
        coalesce(c.monthly_direct_costs, 0) as direct_costs,
        coalesce(spend.spend_month, 0) as ad_spend_month
      from clients c
      left join (
        select client_id, sum(amount) as mrr from recurring_agreements where active = true group by client_id
      ) ra on ra.client_id = c.id
      left join (
        select client_id, sum(amount) as received_month from payments_in
        where date_received >= date_trunc('month', current_date) group by client_id
      ) pi on pi.client_id = c.id
      left join (
        select client_id, sum(monthly_cost_allocation) as team_cost from client_team group by client_id
      ) ct on ct.client_id = c.id
      left join (
        select client_id, sum(spend) as spend_month from meta_insights_daily
        where date >= date_trunc('month', current_date) group by client_id
      ) spend on spend.client_id = c.id
      where c.status = 'activo'
      order by c.name
    `),
    query<PendingInvoiceRow>(`
      select pi.id, pi.client_id, c.name as client_name, pi.amount, pi.concept, pi.period_month, pi.created_at
      from payments_in pi
      join clients c on c.id = pi.client_id
      where pi.date_received is null
      order by pi.created_at
    `),
    query<ChurnRow>(`
      select al.entity_id as client_id, c.name as client_name, al.created_at
      from audit_log al
      join clients c on c.id::text = al.entity_id
      where al.action = 'clients.update'
        and al.entity_type = 'client'
        and al.after_data->>'status' = 'baja'
        and coalesce(al.before_data->>'status', '') != 'baja'
        and al.created_at >= date_trunc('month', current_date)
      order by al.created_at desc
    `),
  ]);

  const mrrTotal = rows.reduce((sum, r) => sum + r.mrr, 0);
  const marginTotal = rows.reduce((sum, r) => sum + (r.mrr - r.team_cost - r.direct_costs), 0);
  const avgTicket = rows.length > 0 ? mrrTotal / rows.length : 0;
  const pendingTotal = pendingInvoices.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Finanzas — rentabilidad</h1>
        <p className="text-sm text-text-muted">
          La pauta del cliente (inversión en Meta Ads) nunca es ingreso de la agencia — se muestra separada.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">MRR</p>
          <p className="mt-1 text-xl font-semibold text-text-primary">{formatCurrency(mrrTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Margen total</p>
          <p className="mt-1 text-xl font-semibold text-text-primary">{formatCurrency(marginTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Ticket promedio</p>
          <p className="mt-1 text-xl font-semibold text-text-primary">{formatCurrency(avgTicket)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Bajas este mes</p>
          <p className="mt-1 text-xl font-semibold text-text-primary">{churn.length}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Rentabilidad por cliente</CardTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="pb-2 pr-4">Cliente</th>
                <th className="pb-2 pr-4">MRR</th>
                <th className="pb-2 pr-4">Costo equipo</th>
                <th className="pb-2 pr-4">Costos directos</th>
                <th className="pb-2 pr-4">Margen</th>
                <th className="pb-2">Pauta del cliente (mes)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const margin = r.mrr - r.team_cost - r.direct_costs;
                return (
                  <tr key={r.client_id}>
                    <td className="py-3 pr-4">
                      <Link href={`/clients/${r.client_id}`} className="text-text-primary hover:text-accent">
                        {r.client_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-text-primary">{formatCurrency(r.mrr)}</td>
                    <td className="py-3 pr-4 text-text-muted">{formatCurrency(r.team_cost)}</td>
                    <td className="py-3 pr-4 text-text-muted">{formatCurrency(r.direct_costs)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={margin < 0 ? "danger" : r.mrr > 0 && margin / r.mrr < 0.2 ? "warning" : "success"}>
                        {formatCurrency(margin)}
                      </Badge>
                    </td>
                    <td className="py-3 text-text-muted">{formatCurrency(r.ad_spend_month)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-text-muted">
                    No hay clientes activos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle>Facturas pendientes de cobro ({formatCurrency(pendingTotal)})</CardTitle>
        {pendingInvoices.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin facturas pendientes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {pendingInvoices.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Link href={`/clients/${p.client_id}`} className="text-sm font-medium text-text-primary hover:text-accent">
                    {p.client_name}
                  </Link>
                  <p className="text-xs text-text-muted">
                    {p.concept}
                    {p.period_month && ` · ${formatMonthLabel(p.period_month)}`}
                  </p>
                </div>
                <span className="text-sm font-medium text-text-primary">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {churn.length > 0 && (
        <Card>
          <CardTitle>Bajas este mes</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {churn.map((c) => (
              <li key={c.client_id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/clients/${c.client_id}`} className="text-sm text-text-primary hover:text-accent">
                  {c.client_name}
                </Link>
                <span className="text-xs text-text-muted">{formatDate(c.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
