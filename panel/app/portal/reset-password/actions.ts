"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { hashPassword, createSession, SESSION_COOKIE, deleteOtherSessionsForUser } from "@/lib/auth/session";
import { verifyPasswordResetToken } from "@/lib/auth/passwordReset";
import { isRateLimited, recordLoginAttempt } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/utils/request";

export interface ResetPasswordState {
  error?: string;
}

const schema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8),
});

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return { error: "Completá los campos." };
  const { token, new_password, confirm_password } = parsed.data;
  if (new_password !== confirm_password) return { error: "Las contraseñas no coinciden." };

  const ip = getClientIp() ?? "unknown";
  if (await isRateLimited(`pwreset_consume:${ip}`)) {
    return { error: "Demasiados intentos. Esperá unos minutos." };
  }

  const userId = await verifyPasswordResetToken(token);
  await recordLoginAttempt(`pwreset_consume:${ip}`, Boolean(userId));
  if (!userId) return { error: "El link venció o ya se usó. Pedí uno nuevo." };

  await query("update profiles set password_hash = $1, must_change_password = false where id = $2", [
    hashPassword(new_password),
    userId,
  ]);

  await deleteOtherSessionsForUser(userId);
  const { token: sessionToken, expiresAt } = await createSession(userId);
  cookies().set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  redirect("/portal");
}
