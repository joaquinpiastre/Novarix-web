import { requireClient } from "@/lib/auth/requireClient";
import { getPaymentHistory, getRecurringAgreements } from "@/lib/portal/queries";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, formatMonthLabel } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function PortalPaymentsPage() {
  const { clientId } = await requireClient();

  const [agreements, payments] = await Promise.all([
    getRecurringAgreements(clientId),
    getPaymentHistory(clientId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Facturación</h1>
        <p className="text-sm text-text-muted">Tus acuerdos vigentes y tu historial de pagos con Novarix.</p>
      </div>

      <Card>
        <CardTitle>Acuerdos vigentes</CardTitle>
        {agreements.filter((a) => a.active).length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin acuerdos recurrentes activos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {agreements
              .filter((a) => a.active)
              .map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm text-text-primary">{a.concept}</p>
                    <p className="text-xs text-text-muted">día {a.billing_day} de cada mes</p>
                  </div>
                  <span className="text-sm font-medium text-text-primary">{formatCurrency(a.amount)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Historial de pagos</CardTitle>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin pagos registrados todavía.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
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
