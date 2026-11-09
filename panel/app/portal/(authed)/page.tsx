import Link from "next/link";
import { requireClient } from "@/lib/auth/requireClient";
import {
  getContractedCategories,
  getContractedServices,
  getCurrentMarketingPlan,
  getLatestReport,
  getPendingApprovalsCount,
  getPendingPaymentsTotal,
  getPortalKpis,
  getUpcomingMilestones,
} from "@/lib/portal/queries";
import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { MARKETING_PLAN_STATUS_LABELS } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

function monthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const from = d.toISOString().slice(0, 10);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export default async function PortalHomePage() {
  const { clientId, profile } = await requireClient();

  const thisMonth = monthRange(0);
  const categories = await getContractedCategories(clientId);
  const hasMarketing = categories.has("Marketing");

  const [services, plan, pendingApprovals, milestones, pendingPayments, latestReport, openTickets, kpis] =
    await Promise.all([
      getContractedServices(clientId),
      getCurrentMarketingPlan(clientId),
      getPendingApprovalsCount(clientId),
      getUpcomingMilestones(clientId, 3),
      getPendingPaymentsTotal(clientId),
      getLatestReport(clientId),
      query("select 1 from support_tickets where client_id = $1 and status not in ('resuelto','cerrado')", [
        clientId,
      ]),
      hasMarketing ? getPortalKpis(clientId, thisMonth.from, thisMonth.to) : Promise.resolve(null),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Hola, {profile.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-text-muted">Este es el resumen de tu cuenta con Novarix.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/portal/content">
          <Card className="h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Pendientes de aprobar</p>
            <p className="num mt-1 text-xl font-semibold text-text-primary">{pendingApprovals}</p>
          </Card>
        </Link>
        <Link href="/portal/tickets">
          <Card className="h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Tickets abiertos</p>
            <p className="num mt-1 text-xl font-semibold text-text-primary">{openTickets.length}</p>
          </Card>
        </Link>
        <Link href="/portal/payments">
          <Card className="h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Pagos pendientes</p>
            <p className="num mt-1 text-xl font-semibold text-text-primary">{formatCurrency(pendingPayments)}</p>
          </Card>
        </Link>
        {hasMarketing && kpis && (
          <Link href="/portal/metrics">
            <Card className="h-full">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Inversión del mes</p>
              <p className="num mt-1 text-xl font-semibold text-text-primary">{formatCurrency(kpis.spend)}</p>
            </Card>
          </Link>
        )}
      </div>

      <Card>
        <CardTitle>Servicios activos</CardTitle>
        {services.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No hay servicios activos cargados.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => (
              <li
                key={s.service_id}
                className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs text-text-primary"
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {hasMarketing && plan && (
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Plan de marketing vigente</CardTitle>
            <Badge tone="accent">{MARKETING_PLAN_STATUS_LABELS[plan.status]}</Badge>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {formatDate(plan.period_start)} – {formatDate(plan.period_end)}
          </p>
          {plan.objectives && <p className="mt-3 text-sm text-text-primary">{plan.objectives}</p>}
        </Card>
      )}

      {milestones.length > 0 && (
        <Card>
          <CardTitle>Próximos hitos</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-text-primary">
                  {m.title} <span className="text-text-muted">· {m.project_name}</span>
                </span>
                <span className="text-xs text-text-muted">{m.due_date && formatDate(m.due_date)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {latestReport && (
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Último reporte</CardTitle>
            <Link href="/portal/reports" className="text-xs text-accent hover:underline">
              Ver todos →
            </Link>
          </div>
          <p className="mt-2 text-sm text-text-primary">{latestReport.title}</p>
        </Card>
      )}
    </div>
  );
}
