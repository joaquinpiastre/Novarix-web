"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { hashPassword, createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { findValidInvite, markInviteAccepted } from "@/lib/auth/clientInvite";
import { isRateLimited, recordLoginAttempt } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/utils/request";
import { recordAudit } from "@/lib/audit/log";

export interface AcceptInviteState {
  error?: string;
}

const schema = z.object({
  token: z.string().min(1),
  full_name: z.string().trim().min(1),
  password: z.string().min(8),
  confirm_password: z.string().min(8),
});

export async function acceptInvite(
  _prevState: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return { error: "Completá todos los campos (mínimo 8 caracteres de contraseña)." };
  const { token, full_name, password, confirm_password } = parsed.data;
  if (password !== confirm_password) return { error: "Las contraseñas no coinciden." };

  const ip = getClientIp() ?? "unknown";
  if (await isRateLimited(`invite_accept:${ip}`)) {
    return { error: "Demasiados intentos. Esperá unos minutos." };
  }

  const invite = await findValidInvite(token);
  await recordLoginAttempt(`invite_accept:${ip}`, Boolean(invite));
  if (!invite) return { error: "La invitación venció o ya se usó. Pedile a Novarix que te invite de nuevo." };

  const existing = await queryOne<{ id: string }>("select id from profiles where email = $1", [invite.email]);
  let profileId: string;

  if (existing) {
    // Invitado por segunda vez (ej: se le vencio el primer link) -- el
    // profile ya existe, solo se actualiza contraseña/nombre y se activa.
    profileId = existing.id;
    await query("update profiles set password_hash = $1, full_name = $2 where id = $3", [
      hashPassword(password),
      full_name,
      profileId,
    ]);
    await query(
      `insert into client_users (profile_id, client_id, client_role, active) values ($1,$2,$3,true)
       on conflict (profile_id) do update set client_role = $3, active = true`,
      [profileId, invite.client_id, invite.client_role]
    );
  } else {
    const [row] = await query<{ id: string }>(
      `insert into profiles (email, password_hash, full_name, role) values ($1,$2,$3,'client') returning id`,
      [invite.email, hashPassword(password), full_name]
    );
    profileId = row.id;
    await query(
      "insert into client_users (profile_id, client_id, client_role, active) values ($1,$2,$3,true)",
      [profileId, invite.client_id, invite.client_role]
    );
  }

  await markInviteAccepted(invite.id);
  await recordAudit({
    actorId: profileId,
    action: "client_invites.accept",
    entityType: "client",
    entityId: invite.client_id,
    ip,
  });

  const { token: sessionToken, expiresAt } = await createSession(profileId);
  cookies().set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  redirect("/portal");
}
