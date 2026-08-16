import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { TASK_STATUS_LABELS } from "@/lib/types/domain";

interface RecentPayment {
  amount: number;
  period_month: string;
  paid_on: string;
  concept: string;
}

export function CollaboratorDashboard({
  fullName,
  paidCurrentMonth,
  paidPrevMonth,
  recentPayments,
  taskCounts,
}: {
  fullName: string;
  paidCurrentMonth: number;
  paidPrevMonth: number;
  recentPayments: RecentPayment[];
  taskCounts: Record<"pending" | "in_progress" | "done", number>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Hola, {fullName.split(" ")[0]}</h1>
        <p className="text-sm text-text-muted">Tu resumen de pagos y tareas.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Cobrado este mes" value={formatCurrency(paidCurrentMonth)} />
        <StatTile label="Cobrado mes anterior" value={formatCurrency(paidPrevMonth)} />
        <StatTile
          label="Tareas pendientes"
          value={String(taskCounts.pending + taskCounts.in_progress)}
          hint={`${taskCounts.done} completadas`}
        />
      </div>

      <Card>
        <CardTitle>Últimos pagos recibidos</CardTitle>
        {recentPayments.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Todavía no hay pagos registrados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentPayments.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{p.concept}</p>
                  <p className="text-xs text-text-muted">{formatDate(p.paid_on)}</p>
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {formatCurrency(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Estado de tus tareas</CardTitle>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {(["pending", "in_progress", "done"] as const).map((status) => (
            <div key={status} className="rounded-lg border border-border bg-surface-hover p-3">
              <p className="text-lg font-semibold text-text-primary">{taskCounts[status]}</p>
              <p className="text-xs text-text-muted">{TASK_STATUS_LABELS[status]}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
