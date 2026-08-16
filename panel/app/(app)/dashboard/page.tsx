import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { query, queryOne } from "@/lib/db";
import { currentPeriodMonth, previousPeriodMonth } from "@/lib/utils/dates";
import { AdminDashboard, type DashboardStats, type MonthlyIncomePoint, type PendingAgreement } from "./AdminDashboard";
import { CollaboratorDashboard } from "./CollaboratorDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId, profile } = await getSessionProfile();

  if (profile.role === "admin") {
    const [stats, series, agreements, paidThisMonth] = await Promise.all([
      queryOne<DashboardStats>("select * from dashboard_stats()"),
      query<MonthlyIncomePoint>("select * from monthly_income_series($1)", [6]),
      query<{ id: string; amount: number; billing_day: number; concept: string; client_name: string }>(
        `select ra.id, ra.amount, ra.billing_day, ra.concept, c.name as client_name
         from recurring_agreements ra
         join clients c on c.id = ra.client_id
         where ra.active = true`
      ),
      query<{ recurring_agreement_id: string }>(
        "select recurring_agreement_id from payments_in where period_month = $1 and recurring_agreement_id is not null",
        [currentPeriodMonth()]
      ),
    ]);

    const paidIds = new Set(paidThisMonth.map((p) => p.recurring_agreement_id));
    const pending: PendingAgreement[] = agreements.filter((a) => !paidIds.has(a.id));

    return (
      <AdminDashboard
        stats={
          stats ?? {
            current_month_income: 0,
            previous_month_income: 0,
            avg_monthly_income_12mo: 0,
            current_month_expenses: 0,
            previous_month_expenses: 0,
            net_current_month: 0,
            pending_recurring_count: 0,
            pending_recurring_amount: 0,
          }
        }
        series={series}
        pending={pending}
      />
    );
  }

  const [payments, tasks] = await Promise.all([
    query<{ amount: number; period_month: string; paid_on: string; concept: string }>(
      "select amount, period_month, paid_on, concept from payments_out where recipient_id = $1 order by paid_on desc",
      [userId]
    ),
    query<{ status: "pending" | "in_progress" | "done" }>(
      "select status from tasks where assigned_to = $1 or assigned_to is null",
      [userId]
    ),
  ]);

  const currentMonth = currentPeriodMonth();
  const prevMonth = previousPeriodMonth();

  const paidCurrentMonth = payments
    .filter((p) => p.period_month === currentMonth)
    .reduce((sum, p) => sum + p.amount, 0);
  const paidPrevMonth = payments
    .filter((p) => p.period_month === prevMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const taskCounts = {
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <CollaboratorDashboard
      fullName={profile.full_name}
      paidCurrentMonth={paidCurrentMonth}
      paidPrevMonth={paidPrevMonth}
      recentPayments={payments.slice(0, 5)}
      taskCounts={taskCounts}
    />
  );
}
