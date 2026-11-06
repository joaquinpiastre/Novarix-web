"use server";

import { z } from "zod";
import { queryOne } from "@/lib/db";
import { isRateLimited, recordLoginAttempt } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/utils/request";
import { createPasswordResetToken } from "@/lib/auth/passwordReset";
import { sendEmail } from "@/lib/notifications/email";

export interface ForgotPasswordState {
  error?: string;
  sent?: boolean;
}

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Ingresá un email válido." };
  const { email } = parsed.data;
  const ip = getClientIp() ?? "unknown";

  if ((await isRateLimited(`pwreset:${email}`)) || (await isRateLimited(`pwreset_ip:${ip}`))) {
    return { error: "Demasiados intentos. Esperá unos minutos y volvé a intentar." };
  }
  await Promise.all([
    recordLoginAttempt(`pwreset:${email}`, false),
    recordLoginAttempt(`pwreset_ip:${ip}`, false),
  ]);

  // Misma respuesta exista o no la cuenta: no se revela si un email está
  // registrado (evita que alguien use este formulario para enumerar
  // clientes de Novarix).
  const user = await queryOne<{ id: string }>(
    "select id from profiles where email = $1 and role = 'client'",
    [email]
  );
  if (user) {
    const token = await createPasswordResetToken(user.id);
    if (token) {
      const url = `https://panel.novarix.agency/portal/reset-password?token=${token}`;
      await sendEmail(
        email,
        "Recuperar tu contraseña — Portal Novarix",
        `<p>Pediste recuperar tu contraseña. Este link vence en 1 hora:</p><p><a href="${url}">Elegir una contraseña nueva</a></p><p>Si no fuiste vos, ignorá este email.</p>`
      );
    }
  }

  return { sent: true };
}
