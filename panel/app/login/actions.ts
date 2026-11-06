"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { createSession, destroySession, verifyPassword, SESSION_COOKIE } from "@/lib/auth/session";
import { isRateLimited, recordLoginAttempt } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/utils/request";
import {
  createPendingLoginToken,
  verifyPendingLoginToken,
  TWO_FACTOR_PENDING_COOKIE,
} from "@/lib/auth/twoFactorPending";
import { verifyTotpToken, verifyRecoveryCode } from "@/lib/auth/totp";
import { decrypt } from "@/lib/crypto/encryption";

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

async function establishSession(userId: string) {
  const { token, expiresAt } = await createSession(userId);
  cookies().set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTS, expires: expiresAt });
}

function landingPathFor(role: string): string {
  return role === "client" ? "/portal" : "/dashboard";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = getClientIp() ?? "unknown";

  if ((await isRateLimited(`email:${email}`)) || (await isRateLimited(`ip:${ip}`))) {
    redirect(
      `/login?error=${encodeURIComponent("Demasiados intentos. Esperá unos minutos y volvé a intentar.")}`
    );
  }

  const user = await queryOne<{ id: string; password_hash: string; totp_enabled: boolean; role: string }>(
    "select id, password_hash, totp_enabled, role::text as role from profiles where email = $1",
    [email]
  );
  const valid = user ? verifyPassword(password, user.password_hash) : false;

  await Promise.all([
    recordLoginAttempt(`email:${email}`, valid),
    recordLoginAttempt(`ip:${ip}`, valid),
  ]);

  if (!user || !valid) {
    redirect(`/login?error=${encodeURIComponent("Usuario o contraseña incorrectos")}`);
  }

  // Rotacion de sesion: si ya habia una cookie de sesion presente, se
  // invalida antes de emitir la nueva en vez de dejarla huerfana.
  const staleToken = cookies().get(SESSION_COOKIE)?.value;
  if (staleToken) await destroySession(staleToken);

  if (user.totp_enabled) {
    const pendingToken = createPendingLoginToken(user.id);
    cookies().set(TWO_FACTOR_PENDING_COOKIE, pendingToken, {
      ...SESSION_COOKIE_OPTS,
      maxAge: 5 * 60,
    });
    redirect("/login?step=2fa");
  }

  await establishSession(user.id);
  redirect(landingPathFor(user.role));
}

export async function verifyTwoFactorCode(formData: FormData) {
  const pendingToken = cookies().get(TWO_FACTOR_PENDING_COOKIE)?.value;
  const userId = verifyPendingLoginToken(pendingToken);

  if (!userId) {
    redirect(
      `/login?error=${encodeURIComponent("La verificación expiró. Iniciá sesión de nuevo.")}`
    );
  }

  if (await isRateLimited(`totp:${userId}`)) {
    redirect(
      `/login?step=2fa&error=${encodeURIComponent("Demasiados intentos. Esperá unos minutos.")}`
    );
  }

  const code = String(formData.get("code") ?? "").trim();
  const user = await queryOne<{ totp_secret: string | null; role: string }>(
    "select totp_secret, role::text as role from profiles where id = $1",
    [userId]
  );

  let ok = false;
  if (user?.totp_secret) {
    ok = verifyTotpToken(code, decrypt(user.totp_secret));
  }

  if (!ok) {
    const recoveryCodes = await query<{ id: string; code_hash: string }>(
      "select id, code_hash from totp_recovery_codes where profile_id = $1 and used_at is null",
      [userId]
    );
    const match = recoveryCodes.find((c) => verifyRecoveryCode(code, c.code_hash));
    if (match) {
      ok = true;
      await query("update totp_recovery_codes set used_at = now() where id = $1", [match.id]);
    }
  }

  await recordLoginAttempt(`totp:${userId}`, ok);

  if (!ok) {
    redirect(`/login?step=2fa&error=${encodeURIComponent("Código inválido.")}`);
  }

  cookies().delete(TWO_FACTOR_PENDING_COOKIE);
  await establishSession(userId);
  redirect(landingPathFor(user?.role ?? "client"));
}
