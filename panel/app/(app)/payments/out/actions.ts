"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/getSessionProfile";
import type { PaymentOutType } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

const PAYMENT_OUT_TYPES: PaymentOutType[] = ["salary", "bonus", "other"];

export async function createPaymentOut(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdmin();

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

  await query(
    `insert into payments_out (recipient_id, amount, concept, payment_type, period_month, paid_on, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [recipient_id, amount, concept, payment_type, `${monthInput}-01`, paid_on, userId]
  );

  revalidatePath("/payments/out");
  revalidatePath("/dashboard");
  return {};
}

export async function deletePaymentOut(id: string) {
  await requireAdmin();
  await query("delete from payments_out where id = $1", [id]);
  revalidatePath("/payments/out");
  revalidatePath("/dashboard");
}
