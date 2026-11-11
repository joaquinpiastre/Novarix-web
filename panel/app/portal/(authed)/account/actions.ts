"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireClient, assertNotPreview } from "@/lib/auth/requireClient";
import { deleteOtherSessionsForUser, SESSION_COOKIE } from "@/lib/auth/session";
import { createClientInvite, inviteEmailHtml } from "@/lib/auth/clientInvite";
import { sendEmail } from "@/lib/notifications/email";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";

export interface ActionState {
  error?: string;
  sent?: { email: string; link: string; emailed: boolean };
}

/** Solo el owner de la empresa puede invitar compañeros, y siempre como "member" (nunca otro owner). */
export async function inviteTeammate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const access = await requireClient();
  const previewError = assertNotPreview(access);
  if (previewError) return previewError;
  if (access.clientRole !== "owner") return { error: "Solo el titular de la cuenta puede invitar." };

  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "Ingresá un email válido." };

  const existing = await queryOne("select 1 from profiles where email = $1", [parsed.data.email]);
  if (existing) return { error: "Ya existe un usuario con ese email." };

  const client = await queryOne<{ name: string }>("select name from clients where id = $1", [access.clientId]);
  const { token } = await createClientInvite(access.clientId, parsed.data.email, "member", access.userId);
  const inviteUrl = `https://panel.novarix.agency/portal/accept-invite?token=${token}`;
  const emailed = await sendEmail(
    parsed.data.email,
    "Invitación al portal de Novarix",
    inviteEmailHtml(client?.name ?? "tu empresa", inviteUrl)
  );

  await recordAudit({
    actorId: access.userId,
    action: "client_invites.create_by_owner",
    entityType: "client",
    entityId: access.clientId,
    after: { email: parsed.data.email },
    ip: getClientIp(),
  });

  revalidatePath("/portal/account");
  return { sent: { email: parsed.data.email, link: inviteUrl, emailed } };
}

/** El owner solo puede desactivar members de su propia empresa, nunca a otro owner. */
export async function deactivateTeammate(formData: FormData): Promise<void> {
  const access = await requireClient();
  if (assertNotPreview(access)) return;
  if (access.clientRole !== "owner") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const row = await queryOne<{ profile_id: string; client_role: string }>(
    "select profile_id, client_role::text as client_role from client_users where id = $1 and client_id = $2",
    [id, access.clientId]
  );
  if (!row || row.client_role === "owner") return;

  await query("update client_users set active = false where id = $1", [id]);
  await deleteOtherSessionsForUser(row.profile_id);

  await recordAudit({
    actorId: access.userId,
    action: "client_users.deactivate_by_owner",
    entityType: "client_user",
    entityId: id,
    ip: getClientIp(),
  });

  revalidatePath("/portal/account");
}

export async function toggleEmailNotifications(formData: FormData): Promise<void> {
  const { userId } = await requireClient();
  const enabled = formData.get("enabled") === "true";
  await query("update profiles set email_notifications = $1 where id = $2", [enabled, userId]);
  revalidatePath("/portal/account");
}

/** Cierra todas las demás sesiones, manteniendo la actual (así no te desloguea a mitad de la tarea). */
export async function signOutEverywhere(): Promise<void> {
  const { userId } = await requireClient();
  const currentToken = cookies().get(SESSION_COOKIE)?.value;
  await deleteOtherSessionsForUser(userId, currentToken);
  revalidatePath("/portal/account");
}
