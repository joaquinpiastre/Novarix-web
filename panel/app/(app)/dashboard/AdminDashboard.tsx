"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortMonthLabel } from "@/lib/utils/dates";

export interface DashboardStats {
  current_month_income: number;
  previous_month_income: number;
  avg_monthly_income_12mo: number;
  current_month_expenses: number;
  previous_month_expenses: number;
  net_current_month: number;
  pending_recurring_count: number;
  pending_recurring_amount: number;
}

export interface MonthlyIncomePoint {
  month: string;
  total: number;
}

export interface PendingAgreement {
  id: string;
  amount: number;
  billing_day: number;
  concept: string;
  client_name: string;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MonthlyIncomePoint;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-text-muted">{formatShortMonthLabel(point.month)}</p>
      <p className="font-semibold text-text-primary">{formatCurrency(point.total)}</p>
    </div>
  );
}

export function AdminDashboard({
  stats,
  series,
  pending,
}: {
  stats: DashboardStats;
  series: MonthlyIncomePoint[];
  pending: PendingAgreement[];
}) {
  const incomeDelta = stats.current_month_income - stats.previous_month_income;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Resumen del negocio</h1>
        <p className="text-sm text-text-muted">Ingresos, gastos y cobros pendientes.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          label="Este mes"
          value={formatCurrency(stats.current_month_income)}
          hint={
            incomeDelta === 0
              ? "Igual que el mes anterior"
              : `${incomeDelta > 0 ? "+" : ""}${formatCurrency(incomeDelta)} vs. mes anterior`
          }
          tone={incomeDelta >= 0 ? "success" : "danger"}
        />
        <StatTile label="Mes anterior" value={formatCurrency(stats.previous_month_income)} />
        <StatTile
          label="Promedio mensual (12m)"
          value={formatCurrency(stats.avg_monthly_income_12mo)}
        />
        <StatTile label="Gastos este mes" value={formatCurrency(stats.current_month_expenses)} />
        <StatTile
          label="Neto este mes"
          value={formatCurrency(stats.net_current_month)}
          tone={stats.net_current_month >= 0 ? "success" : "danger"}
        />
        <StatTile
          label="Pendiente de cobro"
          value={formatCurrency(stats.pending_recurring_amount)}
          hint={`${stats.pending_recurring_count} cliente${stats.pending_recurring_count === 1 ? "" : "s"}`}
          tone={stats.pending_recurring_count > 0 ? "danger" : "default"}
        />
      </div>

      <Card>
        <CardTitle>Ingresos por mes</CardTitle>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="month"
                tickFormatter={(v) => formatShortMonthLabel(v)}
                stroke="var(--chart-axis)"
                tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                stroke="var(--chart-axis)"
                tick={{ fill: "var(--chart-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-hover)" }} />
              <Bar dataKey="total" fill="var(--chart-series)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>Pendientes de cobro este mes</CardTitle>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No hay cobros recurrentes pendientes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{p.client_name}</p>
                  <p className="text-xs text-text-muted">
                    {p.concept} · vence el día {p.billing_day}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(p.amount)}
                  </span>
                  <Badge tone="warning">Pendiente</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
