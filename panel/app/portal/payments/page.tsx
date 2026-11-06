import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, formatMonthLabel } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

interface PaymentRow {
  id: string;
  amount: number;
  concept: string;
  date_received: string | null;
  period_month: string | null;
}

export default async function PortalPaymentsPage() {
  const { clientId } = await requirePortalAccess();

  const payments = await query<PaymentRow>(
    `select id, amount, concept, date_received, period_month from payments_in
     where client_id = $1 order by coalesce(date_received, created_at) desc limit 30`,
    [clientId]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Pagos</h1>
        <p className="text-sm text-text-muted">Tu historial de pagos con Novarix.</p>
      </div>
      <Card>
        {payments.length === 0 ? (
          <p className="text-sm text-text-muted">Sin pagos registrados todavía.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-text-primary">{p.concept}</p>
                  <p className="text-xs text-text-muted">
                    {p.date_received ? formatDate(p.date_received) : "Pendiente"}
                    {p.period_month && ` · ${formatMonthLabel(p.period_month)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{formatCurrency(p.amount)}</span>
                  {!p.date_received && <Badge tone="warning">Pendiente</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
