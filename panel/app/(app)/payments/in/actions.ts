"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/getSessionProfile";
import { currentPeriodMonth, todayISO } from "@/lib/utils/dates";

export interface ActionState {
  error?: string;
}

export async function createClientAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "El nombre del cliente es obligatorio." };

  await query("insert into clients (name, notes) values ($1, $2)", [name, notes || null]);

  revalidatePath("/payments/in");
  return {};
}

export async function createAgreement(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const billing_day = Number(formData.get("billing_day"));
  const concept = String(formData.get("concept") ?? "").trim();

  if (!client_id || !amount || amount <= 0 || !billing_day || !concept) {
    return { error: "Completá todos los campos con valores válidos." };
  }
  if (billing_day < 1 || billing_day > 28) {
    return { error: "El día de cobro debe estar entre 1 y 28." };
  }

  await query(
    "insert into recurring_agreements (client_id, amount, billing_day, concept) values ($1, $2, $3, $4)",
    [client_id, amount, billing_day, concept]
  );

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return {};
}

export interface UpdateAgreementState {
  error?: string;
  ok?: boolean;
}

export async function updateAgreement(
  _prevState: UpdateAgreementState,
  formData: FormData
): Promise<UpdateAgreementState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const billing_day = Number(formData.get("billing_day"));
  const concept = String(formData.get("concept") ?? "").trim();

  if (!id || !client_id || !amount || amount <= 0 || !billing_day || !concept) {
    return { error: "Completá todos los campos con valores válidos." };
  }
  if (billing_day < 1 || billing_day > 28) {
    return { error: "El día de cobro debe estar entre 1 y 28." };
  }

  await query(
    "update recurring_agreements set client_id = $1, amount = $2, billing_day = $3, concept = $4 where id = $5",
    [client_id, amount, billing_day, concept, id]
  );

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deactivateAgreement(id: string) {
  await requireAdmin();
  await query("update recurring_agreements set active = false where id = $1", [id]);
  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
}

export async function recordRecurringPayment(agreementId: string) {
  const { userId } = await requireAdmin();

  const agreement = await queryOne<{ id: string; client_id: string; amount: number; concept: string }>(
    "select id, client_id, amount, concept from recurring_agreements where id = $1",
    [agreementId]
  );
  if (!agreement) return;

  await query(
    `insert into payments_in (client_id, recurring_agreement_id, amount, concept, period_month, date_received, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      agreement.client_id,
      agreement.id,
      agreement.amount,
      agreement.concept,
      currentPeriodMonth(),
      todayISO(),
      userId,
    ]
  );

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
}

export async function createOneOffPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdmin();

  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const concept = String(formData.get("concept") ?? "").trim();
  const date_received = String(formData.get("date_received") ?? "");

  if (!client_id || !amount || amount <= 0 || !concept || !date_received) {
    return { error: "Completá todos los campos con valores válidos." };
  }

  await query(
    "insert into payments_in (client_id, amount, concept, date_received, created_by) values ($1, $2, $3, $4, $5)",
    [client_id, amount, concept, date_received, userId]
  );

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return {};
}

export async function createPendingOneOffPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdmin();

  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const concept = String(formData.get("concept") ?? "").trim();

  if (!client_id || !amount || amount <= 0 || !concept) {
    return { error: "Completá todos los campos con valores válidos." };
  }

  await query(
    "insert into payments_in (client_id, amount, concept, date_received, created_by) values ($1, $2, $3, null, $4)",
    [client_id, amount, concept, userId]
  );

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return {};
}

export async function markOneOffCollected(id: string) {
  await requireAdmin();
  await query(
    "update payments_in set date_received = $1 where id = $2 and recurring_agreement_id is null and date_received is null",
    [todayISO(), id]
  );
  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
}

export interface UpdateOneOffPaymentState {
  error?: string;
  ok?: boolean;
}

export async function updateOneOffPayment(
  _prevState: UpdateOneOffPaymentState,
  formData: FormData
): Promise<UpdateOneOffPaymentState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const concept = String(formData.get("concept") ?? "").trim();
  const date_received = String(formData.get("date_received") ?? "");

  if (!id || !client_id || !amount || amount <= 0 || !concept || !date_received) {
    return { error: "Completá todos los campos con valores válidos." };
  }

  // Only ever touches one-off payments — recurring-derived rows keep their
  // link to the agreement/period intact and aren't editable here.
  await query(
    `update payments_in set client_id = $1, amount = $2, concept = $3, date_received = $4
     where id = $5 and recurring_agreement_id is null`,
    [client_id, amount, concept, date_received, id]
  );

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return { ok: true };
}
