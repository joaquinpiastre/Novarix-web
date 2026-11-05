"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { PaymentOutType } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

const PAYMENT_OUT_TYPES: PaymentOutType[] = ["salary", "bonus", "other"];

export async function createPaymentOut(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requirePermission("payments_out.manage");

  const recipient_id = String(formData.get("recipient_id") ?? "");
  const amount = Number(formData.get("amount"));
  const concept = String(formData.get("concept") ?? "").trim();
  const monthInput = String(formData.get("period_month") ?? "");
  const paid_on = String(formData.get("paid_on") ?? "");
  const payment_type = String(formData.get("payment_type") ?? "salary") as PaymentOutType;

  if (
    !recipient_id ||
    !amount ||
    amount <= 0 ||
    !concept ||
    !monthInput ||
    !paid_on ||
    !PAYMENT_OUT_TYPES.includes(payment_type)
  ) {
    return { error: "Completá todos los campos con valores válidos." };
  }

  const [row] = await query<{ id: string }>(
    `insert into payments_out (recipient_id, amount, concept, payment_type, period_month, paid_on, created_by)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [recipient_id, amount, concept, payment_type, `${monthInput}-01`, paid_on, userId]
  );

  await recordAudit({
    actorId: userId,
    action: "payments_out.create",
    entityType: "payment_out",
    entityId: row.id,
    after: { recipient_id, amount, concept, payment_type, period_month: monthInput, paid_on },
    ip: getClientIp(),
  });

  revalidatePath("/payments/out");
  revalidatePath("/dashboard");
  return {};
}

export async function deletePaymentOut(id: string) {
  const { userId } = await requirePermission("payments_out.manage");

  const existing = await queryOne("select * from payments_out where id = $1", [id]);
  await query("delete from payments_out where id = $1", [id]);

  await recordAudit({
    actorId: userId,
    action: "payments_out.delete",
    entityType: "payment_out",
    entityId: id,
    before: existing,
    ip: getClientIp(),
  });

  revalidatePath("/payments/out");
  revalidatePath("/dashboard");
}
