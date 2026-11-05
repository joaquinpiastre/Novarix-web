"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { query, queryOne } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import {
  deleteOtherSessionsForUser,
  verifyPassword,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { encrypt } from "@/lib/crypto/encryption";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  totpKeyUri,
  verifyTotpToken,
} from "@/lib/auth/totp";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";

export interface BeginEnrollmentState {
  secret?: string;
  qrDataUrl?: string;
  error?: string;
}

export async function beginTotpEnrollment(
  _prevState: BeginEnrollmentState,
  _formData: FormData
): Promise<BeginEnrollmentState> {
  const { profile } = await getSessionProfile();
  if (profile.totp_enabled) return { error: "Ya tenés el 2FA activado." };

  const secret = generateTotpSecret();
  const otpauthUrl = totpKeyUri(profile.email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, qrDataUrl };
}

export interface ConfirmEnrollmentState {
  error?: string;
  recoveryCodes?: string[];
}

export async function confirmTotpEnrollment(
  _prevState: ConfirmEnrollmentState,
  formData: FormData
): Promise<ConfirmEnrollmentState> {
  const { userId } = await getSessionProfile();

  const secret = String(formData.get("secret") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!secret || !verifyTotpToken(code, secret)) {
    return { error: "Código inválido, probá de nuevo." };
  }

  const recoveryCodes = generateRecoveryCodes();

  await query("update profiles set totp_secret = $1, totp_enabled = true where id = $2", [
    encrypt(secret),
    userId,
  ]);

  for (const rc of recoveryCodes) {
    await query("insert into totp_recovery_codes (profile_id, code_hash) values ($1, $2)", [
      userId,
      hashRecoveryCode(rc),
    ]);
  }

  await recordAudit({
    actorId: userId,
    action: "profiles.enable_2fa",
    entityType: "profile",
    entityId: userId,
    ip: getClientIp(),
  });

  revalidatePath("/account");
  return { recoveryCodes };
}

export interface DisableTotpState {
  error?: string;
  ok?: boolean;
}

export async function disableTotp(
  _prevState: DisableTotpState,
  formData: FormData
): Promise<DisableTotpState> {
  const { userId } = await getSessionProfile();

  const currentPassword = String(formData.get("current_password") ?? "");
  const row = await queryOne<{ password_hash: string }>(
    "select password_hash from profiles where id = $1",
    [userId]
  );
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    return { error: "La contraseña no es correcta." };
  }

  await query("update profiles set totp_enabled = false, totp_secret = null where id = $1", [
    userId,
  ]);
  await query("delete from totp_recovery_codes where profile_id = $1", [userId]);

  const currentToken = cookies().get(SESSION_COOKIE)?.value;
  await deleteOtherSessionsForUser(userId, currentToken);

  await recordAudit({
    actorId: userId,
    action: "profiles.disable_2fa",
    entityType: "profile",
    entityId: userId,
    ip: getClientIp(),
  });

  revalidatePath("/account");
  return { ok: true };
}
