import Link from "next/link";
import { requirePermission } from "@/lib/auth/requirePermission";
import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { TICKET_TYPE_LABELS } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

interface MonthlyRow {
  month: string;
  opened: string;
  closed: string;
}

interface ByDimensionRow {
  label: string;
  count: string;
  avg_first_response_hours: number | null;
  avg_resolution_hours: number | null;
  sla_met_pct: number | null;
  avg_csat: number | null;
}

export default async function TicketsMetricsPage() {
  await requirePermission("tickets.manage_all");

  const [monthly, byType, byClient, overall] = await Promise.all([
    query<MonthlyRow>(`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
             count(*)::text as opened,
             count(*) filter (where status in ('resuelto','cerrado'))::text as closed
      from support_tickets
      where created_at >= now() - interval '6 months'
      group by 1 order by 1
    `),
    query<ByDimensionRow>(`
      select t.ticket_type::text as label, count(*)::text as count,
             avg(extract(epoch from (first_response_at - created_at)) / 3600) as avg_first_response_hours,
             avg(extract(epoch from (resolved_at - created_at)) / 3600) as avg_resolution_hours,
             (count(*) filter (where sla_due_at is null or first_response_at <= sla_due_at)::float / count(*) * 100) as sla_met_pct,
             avg(csat_score) as avg_csat
      from support_tickets t
      group by t.ticket_type
      order by count(*) desc
    `),
    query<ByDimensionRow>(`
      select c.name as label, count(*)::text as count,
             avg(extract(epoch from (t.first_response_at - t.created_at)) / 3600) as avg_first_response_hours,
             avg(extract(epoch from (t.resolved_at - t.created_at)) / 3600) as avg_resolution_hours,
             (count(*) filter (where t.sla_due_at is null or t.first_response_at <= t.sla_due_at)::float / count(*) * 100) as sla_met_pct,
             avg(t.csat_score) as avg_csat
      from support_tickets t
      join clients c on c.id = t.client_id
      group by c.name
      order by count(*) desc
      limit 15
    `),
    query<{ total: string; avg_csat: number | null; sla_met_pct: number | null }>(`
      select count(*)::text as total, avg(csat_score) as avg_csat,
             (count(*) filter (where sla_due_at is null or first_response_at <= sla_due_at)::float / greatest(count(*),1) * 100) as sla_met_pct
      from support_tickets
    `),
  ]);

  const o = overall[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Métricas de soporte</h1>
          <p className="text-sm text-text-muted">Volumen, tiempos de respuesta, SLA y satisfacción.</p>
        </div>
        <Link href="/tickets" className="text-sm text-accent hover:underline">
          ← Inbox
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Tickets totales</p>
          <p className="mt-1 text-xl font-semibold text-text-primary">{o?.total ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Cumplimiento de SLA</p>
          <p className="mt-1 text-xl font-semibold text-text-primary">
            {o?.sla_met_pct != null ? `${o.sla_met_pct.toFixed(0)}%` : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">CSAT promedio</p>
          <p className="mt-1 text-xl font-semibold text-text-primary">
            {o?.avg_csat != null ? o.avg_csat.toFixed(1) : "—"}
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle>Abiertos vs. cerrados (últimos 6 meses)</CardTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="pb-2 pr-4">Mes</th>
                <th className="pb-2 pr-4">Abiertos</th>
                <th className="pb-2">Cerrados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td className="py-2 pr-4 text-text-primary">{m.month}</td>
                  <td className="py-2 pr-4 text-text-primary">{m.opened}</td>
                  <td className="py-2 text-text-primary">{m.closed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DimensionTable title="Por tipo" rows={byType} labelMap={TICKET_TYPE_LABELS} />
      <DimensionTable title="Por cliente" rows={byClient} />
    </div>
  );
}

function DimensionTable({
  title,
  rows,
  labelMap,
}: {
  title: string;
  rows: ByDimensionRow[];
  labelMap?: Record<string, string>;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="pb-2 pr-4">{title}</th>
              <th className="pb-2 pr-4">Tickets</th>
              <th className="pb-2 pr-4">1ra resp. (hs)</th>
              <th className="pb-2 pr-4">Resolución (hs)</th>
              <th className="pb-2 pr-4">SLA</th>
              <th className="pb-2">CSAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-2 pr-4 text-text-primary">{labelMap?.[r.label] ?? r.label}</td>
                <td className="py-2 pr-4 text-text-primary">{r.count}</td>
                <td className="py-2 pr-4 text-text-muted">
                  {r.avg_first_response_hours != null ? r.avg_first_response_hours.toFixed(1) : "—"}
                </td>
                <td className="py-2 pr-4 text-text-muted">
                  {r.avg_resolution_hours != null ? r.avg_resolution_hours.toFixed(1) : "—"}
                </td>
                <td className="py-2 pr-4 text-text-muted">{r.sla_met_pct != null ? `${r.sla_met_pct.toFixed(0)}%` : "—"}</td>
                <td className="py-2 text-text-muted">{r.avg_csat != null ? r.avg_csat.toFixed(1) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-text-muted">
                  Sin datos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
