"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { hashPassword, deleteOtherSessionsForUser, SESSION_COOKIE } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { UserRole } from "@/lib/types/domain";

export interface CreateUserState {
  error?: string;
  created?: { email: string; tempPassword: string; fullName: string };
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function createCollaboratorAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const { userId: actorId } = await requirePermission("users.manage");

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!full_name || !email || (role !== "programmer" && role !== "marketing")) {
    return { error: "Completá nombre, email y rol." };
  }

  const tempPassword = generateTempPassword();
  let newUserId: string;

  try {
    const [row] = await query<{ id: string }>(
      `insert into profiles (email, password_hash, full_name, role, must_change_password)
       values ($1, $2, $3, $4, true) returning id`,
      [email, hashPassword(tempPassword), full_name, role]
    );
    newUserId = row.id;
  } catch (err) {
    const isDuplicateEmail = (err as { code?: string }).code === "23505";
    return { error: isDuplicateEmail ? "Ya existe un usuario con ese email." : "No se pudo crear el usuario." };
  }

  await recordAudit({
    actorId,
    action: "users.create",
    entityType: "profile",
    entityId: newUserId,
    after: { email, full_name, role },
    ip: getClientIp(),
  });

  revalidatePath("/admin/users");
  return { created: { email, tempPassword, fullName: full_name } };
}

export interface ResetPasswordState {
  error?: string;
  ok?: boolean;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const { userId: actorId } = await requirePermission("users.manage");

  const userId = String(formData.get("user_id") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");

  if (!userId || newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  await query(
    "update profiles set password_hash = $1, must_change_password = true where id = $2",
    [hashPassword(newPassword), userId]
  );

  // Si un admin resetea su propia contraseña, no desloguearlo de en medio de
  // la tarea: se excluye su propio token de sesion actual de la invalidacion.
  const currentToken = cookies().get(SESSION_COOKIE)?.value;
  const exceptToken = actorId === userId ? currentToken : undefined;
  await deleteOtherSessionsForUser(userId, exceptToken);

  await recordAudit({
    actorId,
    action: "users.reset_password",
    entityType: "profile",
    entityId: userId,
    ip: getClientIp(),
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
