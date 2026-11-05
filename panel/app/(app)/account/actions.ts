"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import {
  deleteOtherSessionsForUser,
  hashPassword,
  verifyPassword,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";

export interface ChangePasswordState {
  error?: string;
}

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const { userId } = await getSessionProfile();

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 8) {
    return { error: "La contraseña nueva debe tener al menos 8 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas nuevas no coinciden." };
  }

  const row = await queryOne<{ password_hash: string }>(
    "select password_hash from profiles where id = $1",
    [userId]
  );
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    return { error: "La contraseña actual no es correcta." };
  }

  await query(
    "update profiles set password_hash = $1, must_change_password = false where id = $2",
    [hashPassword(newPassword), userId]
  );

  const currentToken = cookies().get(SESSION_COOKIE)?.value;
  await deleteOtherSessionsForUser(userId, currentToken);

  await recordAudit({
    actorId: userId,
    action: "profiles.change_own_password",
    entityType: "profile",
    entityId: userId,
    ip: getClientIp(),
  });

  redirect("/dashboard");
}
