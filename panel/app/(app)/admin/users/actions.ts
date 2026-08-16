"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/getSessionProfile";
import { hashPassword } from "@/lib/auth/session";
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
  await requireAdmin();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!full_name || !email || (role !== "programmer" && role !== "marketing")) {
    return { error: "Completá nombre, email y rol." };
  }

  const tempPassword = generateTempPassword();

  try {
    await query(
      "insert into profiles (email, password_hash, full_name, role) values ($1, $2, $3, $4)",
      [email, hashPassword(tempPassword), full_name, role]
    );
  } catch (err) {
    const isDuplicateEmail = (err as { code?: string }).code === "23505";
    return { error: isDuplicateEmail ? "Ya existe un usuario con ese email." : "No se pudo crear el usuario." };
  }

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
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");

  if (!userId || newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  await query("update profiles set password_hash = $1 where id = $2", [
    hashPassword(newPassword),
    userId,
  ]);

  revalidatePath("/admin/users");
  return { ok: true };
}
