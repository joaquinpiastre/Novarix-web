"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { currentPeriodMonth, todayISO } from "@/lib/utils/dates";

export interface ActionState {
  error?: string;
}

export async function createClientAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: actorId } = await requirePermission("clients.manage");

  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "El nombre del cliente es obligatorio." };

  const [row] = await query<{ id: string }>(
    "insert into clients (name, notes) values ($1, $2) returning id",
    [name, notes || null]
  );

  await recordAudit({
    actorId,
    action: "clients.create",
    entityType: "client",
    entityId: row.id,
    after: { name, notes: notes || null },
    ip: getClientIp(),
  });

  revalidatePath("/payments/in");
  return {};
}

export async function createAgreement(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: actorId } = await requirePermission("payments_in.manage");

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

  const [row] = await query<{ id: string }>(
    "insert into recurring_agreements (client_id, amount, billing_day, concept) values ($1, $2, $3, $4) returning id",
    [client_id, amount, billing_day, concept]
  );

  await recordAudit({
    actorId,
    action: "recurring_agreements.create",
    entityType: "recurring_agreement",
    entityId: row.id,
    after: { client_id, amount, billing_day, concept },
    ip: getClientIp(),
  });

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
  const { userId: actorId } = await requirePermission("payments_in.manage");

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

  const before = await queryOne("select * from recurring_agreements where id = $1", [id]);

  await query(
    "update recurring_agreements set client_id = $1, amount = $2, billing_day = $3, concept = $4 where id = $5",
    [client_id, amount, billing_day, concept, id]
  );

  await recordAudit({
    actorId,
    action: "recurring_agreements.update",
    entityType: "recurring_agreement",
    entityId: id,
    before,
    after: { client_id, amount, billing_day, concept },
    ip: getClientIp(),
  });

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deactivateAgreement(id: string) {
  const { userId: actorId } = await requirePermission("payments_in.manage");

  const before = await queryOne("select * from recurring_agreements where id = $1", [id]);
  await query("update recurring_agreements set active = false where id = $1", [id]);

  await recordAudit({
    actorId,
    action: "recurring_agreements.deactivate",
    entityType: "recurring_agreement",
    entityId: id,
    before,
    after: { active: false },
    ip: getClientIp(),
  });

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
}

export async function recordRecurringPayment(agreementId: string) {
  const { userId } = await requirePermission("payments_in.manage");

  const agreement = await queryOne<{ id: string; client_id: string; amount: number; concept: string }>(
    "select id, client_id, amount, concept from recurring_agreements where id = $1",
    [agreementId]
  );
  if (!agreement) return;

  const period_month = currentPeriodMonth();
  const date_received = todayISO();

  const [row] = await query<{ id: string }>(
    `insert into payments_in (client_id, recurring_agreement_id, amount, concept, period_month, date_received, created_by)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [agreement.client_id, agreement.id, agreement.amount, agreement.concept, period_month, date_received, userId]
  );

  await recordAudit({
    actorId: userId,
    action: "payments_in.record_recurring",
    entityType: "payment_in",
    entityId: row.id,
    after: {
      client_id: agreement.client_id,
      recurring_agreement_id: agreement.id,
      amount: agreement.amount,
      concept: agreement.concept,
      period_month,
      date_received,
    },
    ip: getClientIp(),
  });

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
}

export async function createOneOffPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requirePermission("payments_in.manage");

  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const concept = String(formData.get("concept") ?? "").trim();
  const date_received = String(formData.get("date_received") ?? "");

  if (!client_id || !amount || amount <= 0 || !concept || !date_received) {
    return { error: "Completá todos los campos con valores válidos." };
  }

  const [row] = await query<{ id: string }>(
    "insert into payments_in (client_id, amount, concept, date_received, created_by) values ($1, $2, $3, $4, $5) returning id",
    [client_id, amount, concept, date_received, userId]
  );

  await recordAudit({
    actorId: userId,
    action: "payments_in.create_oneoff",
    entityType: "payment_in",
    entityId: row.id,
    after: { client_id, amount, concept, date_received },
    ip: getClientIp(),
  });

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return {};
}

export async function createPendingOneOffPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requirePermission("payments_in.manage");

  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const concept = String(formData.get("concept") ?? "").trim();

  if (!client_id || !amount || amount <= 0 || !concept) {
    return { error: "Completá todos los campos con valores válidos." };
  }

  const [row] = await query<{ id: string }>(
    "insert into payments_in (client_id, amount, concept, date_received, created_by) values ($1, $2, $3, null, $4) returning id",
    [client_id, amount, concept, userId]
  );

  await recordAudit({
    actorId: userId,
    action: "payments_in.create_pending_oneoff",
    entityType: "payment_in",
    entityId: row.id,
    after: { client_id, amount, concept, date_received: null },
    ip: getClientIp(),
  });

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return {};
}

export async function markOneOffCollected(id: string) {
  const { userId: actorId } = await requirePermission("payments_in.manage");

  const before = await queryOne("select * from payments_in where id = $1", [id]);
  const date_received = todayISO();

  await query(
    "update payments_in set date_received = $1 where id = $2 and recurring_agreement_id is null and date_received is null",
    [date_received, id]
  );

  await recordAudit({
    actorId,
    action: "payments_in.mark_collected",
    entityType: "payment_in",
    entityId: id,
    before,
    after: { date_received },
    ip: getClientIp(),
  });

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
  const { userId: actorId } = await requirePermission("payments_in.manage");

  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const amount = Number(formData.get("amount"));
  const concept = String(formData.get("concept") ?? "").trim();
  const date_received = String(formData.get("date_received") ?? "");

  if (!id || !client_id || !amount || amount <= 0 || !concept || !date_received) {
    return { error: "Completá todos los campos con valores válidos." };
  }

  const before = await queryOne("select * from payments_in where id = $1", [id]);

  // Only ever touches one-off payments — recurring-derived rows keep their
  // link to the agreement/period intact and aren't editable here.
  await query(
    `update payments_in set client_id = $1, amount = $2, concept = $3, date_received = $4
     where id = $5 and recurring_agreement_id is null`,
    [client_id, amount, concept, date_received, id]
  );

  await recordAudit({
    actorId,
    action: "payments_in.update_oneoff",
    entityType: "payment_in",
    entityId: id,
    before,
    after: { client_id, amount, concept, date_received },
    ip: getClientIp(),
  });

  revalidatePath("/payments/in");
  revalidatePath("/dashboard");
  return { ok: true };
}
