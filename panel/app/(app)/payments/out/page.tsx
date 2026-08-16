import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { query } from "@/lib/db";
import { PaymentsOutClient, type PaymentOutRow } from "./PaymentsOutClient";

export const dynamic = "force-dynamic";

export default async function PaymentsOutPage() {
  const { userId, profile } = await getSessionProfile();
  const isAdmin = profile.role === "admin";

  const [payments, collaborators] = await Promise.all([
    isAdmin
      ? query<PaymentOutRow>(
          `select po.id, po.amount, po.concept, po.period_month, po.paid_on,
                  json_build_object('full_name', p.full_name) as recipient
           from payments_out po
           join profiles p on p.id = po.recipient_id
           order by po.paid_on desc`
        )
      : query<PaymentOutRow>(
          `select po.id, po.amount, po.concept, po.period_month, po.paid_on,
                  json_build_object('full_name', p.full_name) as recipient
           from payments_out po
           join profiles p on p.id = po.recipient_id
           where po.recipient_id = $1
           order by po.paid_on desc`,
          [userId]
        ),
    isAdmin
      ? query<{ id: string; full_name: string; role: "admin" | "programmer" | "marketing" }>(
          "select id, full_name, role from profiles where role != 'admin' order by full_name"
        )
      : Promise.resolve([]),
  ]);

  return <PaymentsOutClient payments={payments} collaborators={collaborators} isAdmin={isAdmin} />;
}
