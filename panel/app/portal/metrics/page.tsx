import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import type { DailySpendPoint } from "../../(app)/clients/[id]/page";

export const dynamic = "force-dynamic";

export default async function PortalMetricsPage() {
  const { clientId } = await requirePortalAccess();

  const dailySpend = await query<DailySpendPoint>(
    `select date::text,
            sum(spend)::float as spend,
            sum(impressions)::int as impressions,
            sum(clicks)::int as clicks,
            (sum(leads) + sum(purchases) + sum(messaging_conversations))::int as results
     from meta_insights_daily
     where client_id = $1 and date >= current_date - interval '30 days'
     group by date
     order by date`,
    [clientId]
  );

  const totalSpend = dailySpend.reduce((s, d) => s + d.spend, 0);
  const totalResults = dailySpend.reduce((s, d) => s + d.results, 0);
  const totalImpressions = dailySpend.reduce((s, d) => s + d.impressions, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Métricas</h1>
        <p className="text-sm text-text-muted">Últimos 30 días.</p>
      </div>
      <Card>
        <CardTitle>Pauta</CardTitle>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-semibold text-text-primary">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-text-muted">Invertido</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">{totalResults}</p>
            <p className="text-xs text-text-muted">Resultados</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">
              {totalImpressions.toLocaleString("es-AR")}
            </p>
            <p className="text-xs text-text-muted">Impresiones</p>
          </div>
        </div>
        {dailySpend.length === 0 && (
          <p className="mt-4 text-sm text-text-muted">Todavía no hay datos de pauta sincronizados.</p>
        )}
      </Card>
    </div>
  );
}
