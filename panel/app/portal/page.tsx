import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { query, queryOne } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import { MARKETING_PLAN_STATUS_LABELS, type MarketingPlan } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

interface ServiceRow {
  name: string;
  category: string;
}

export default async function PortalHomePage() {
  const { clientId, profile } = await requirePortalAccess();

  const [services, plan] = await Promise.all([
    query<ServiceRow>(
      `select sc.name, sc.category from client_services cs
       join services_catalog sc on sc.id = cs.service_id
       where cs.client_id = $1 and cs.status = 'active'
       order by sc.category, sc.name`,
      [clientId]
    ),
    queryOne<MarketingPlan>(
      `select * from marketing_plans where client_id = $1
       order by status = 'active' desc, period_start desc limit 1`,
      [clientId]
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Hola, {profile.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-text-muted">Este es el resumen de tu cuenta con Novarix.</p>
      </div>

      <Card>
        <CardTitle>Servicios activos</CardTitle>
        {services.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No hay servicios activos cargados.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => (
              <li
                key={s.name}
                className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs text-text-primary"
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {plan && (
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
    </div>
  );
}
