import { requireAdmin } from "@/lib/auth/getSessionProfile";
import { query } from "@/lib/db";
import { currentPeriodMonth } from "@/lib/utils/dates";
import {
  PaymentsInClient,
  type AgreementRow,
  type ClientRow,
  type PaymentInRow,
  type PendingOneOffRow,
} from "./PaymentsInClient";

export const dynamic = "force-dynamic";

export default async function PaymentsInPage() {
  await requireAdmin();

  const [clients, agreements, paidThisMonth, pendingOneOff, history] = await Promise.all([
    query<ClientRow>("select id, name from clients order by name"),
    query<AgreementRow>(
      `select ra.id, ra.client_id, ra.amount, ra.billing_day, ra.concept,
              json_build_object('name', c.name) as client
       from recurring_agreements ra
       join clients c on c.id = ra.client_id
       where ra.active = true
       order by ra.billing_day`
    ),
    query<{ recurring_agreement_id: string }>(
      "select recurring_agreement_id from payments_in where period_month = $1 and recurring_agreement_id is not null",
      [currentPeriodMonth()]
    ),
    query<PendingOneOffRow>(
      `select pi.id, pi.client_id, pi.amount, pi.concept,
              json_build_object('name', c.name) as client
       from payments_in pi
       join clients c on c.id = pi.client_id
       where pi.date_received is null and pi.recurring_agreement_id is null
       order by pi.created_at`
    ),
    query<PaymentInRow>(
      `select pi.id, pi.client_id, pi.amount, pi.concept, pi.period_month, pi.date_received,
              json_build_object('name', c.name) as client
       from payments_in pi
       join clients c on c.id = pi.client_id
       where pi.date_received is not null
       order by pi.date_received desc
       limit 30`
    ),
  ]);

  const paidIds = new Set(paidThisMonth.map((p) => p.recurring_agreement_id));

  return (
    <PaymentsInClient
      clients={clients}
      agreements={agreements}
      paidAgreementIds={[...paidIds]}
      pendingOneOff={pendingOneOff}
      history={history}
    />
  );
}
