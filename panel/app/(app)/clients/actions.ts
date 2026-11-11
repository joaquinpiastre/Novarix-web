"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { randomBytes } from "crypto";
import { deleteOtherSessionsForUser, hashPassword } from "@/lib/auth/session";
import { createSignedToken } from "@/lib/auth/signedToken";
import { ADMIN_PREVIEW_COOKIE, ADMIN_PREVIEW_TTL_MS } from "@/lib/auth/requireClient";
import { createClientInvite, inviteEmailHtml } from "@/lib/auth/clientInvite";
import { sendEmail } from "@/lib/notifications/email";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { ClientStatus } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

function parseSocialLinks(raw: string): Record<string, string> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const links: Record<string, string> = {};
  for (const line of trimmed.split("\n")) {
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key && value) links[key.trim().toLowerCase()] = value;
  }
  return Object.keys(links).length > 0 ? links : null;
}

export interface CreateClientState extends ActionState {
  createdId?: string;
}

export async function createClient(
  _prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const { userId: actorId } = await requirePermission("clients.manage");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const legal_name = String(formData.get("legal_name") ?? "").trim() || null;
  const tax_id = String(formData.get("tax_id") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const primary_contact_name = String(formData.get("primary_contact_name") ?? "").trim() || null;
  const primary_contact_phone = String(formData.get("primary_contact_phone") ?? "").trim() || null;
  const primary_contact_email = String(formData.get("primary_contact_email") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "activo") as ClientStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const social_links = parseSocialLinks(String(formData.get("social_links") ?? ""));

  const [row] = await query<{ id: string }>(
    `insert into clients (
       name, legal_name, tax_id, industry, city, website, social_links,
       primary_contact_name, primary_contact_phone, primary_contact_email,
       status, notes, account_owner_id
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     returning id`,
    [
      name,
      legal_name,
      tax_id,
      industry,
      city,
      website,
      social_links ? JSON.stringify(social_links) : null,
      primary_contact_name,
      primary_contact_phone,
      primary_contact_email,
      status,
      notes,
      actorId,
    ]
  );

  await recordAudit({
    actorId,
    action: "clients.create",
    entityType: "client",
    entityId: row.id,
    after: { name, status },
    ip: getClientIp(),
  });

  revalidatePath("/clients");
  return { createdId: row.id };
}

export interface UpdateClientState extends ActionState {
  ok?: boolean;
}

export async function updateClient(
  _prevState: UpdateClientState,
  formData: FormData
): Promise<UpdateClientState> {
  const { userId: actorId } = await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Falta el nombre." };

  const legal_name = String(formData.get("legal_name") ?? "").trim() || null;
  const tax_id = String(formData.get("tax_id") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const primary_contact_name = String(formData.get("primary_contact_name") ?? "").trim() || null;
  const primary_contact_phone = String(formData.get("primary_contact_phone") ?? "").trim() || null;
  const primary_contact_email = String(formData.get("primary_contact_email") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "activo") as ClientStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const social_links = parseSocialLinks(String(formData.get("social_links") ?? ""));

  const before = await queryOne("select * from clients where id = $1", [id]);

  await query(
    `update clients set
       name=$1, legal_name=$2, tax_id=$3, industry=$4, city=$5, website=$6,
       social_links=$7, primary_contact_name=$8, primary_contact_phone=$9,
       primary_contact_email=$10, status=$11, notes=$12
     where id=$13`,
    [
      name,
      legal_name,
      tax_id,
      industry,
      city,
      website,
      social_links ? JSON.stringify(social_links) : null,
      primary_contact_name,
      primary_contact_phone,
      primary_contact_email,
      status,
      notes,
      id,
    ]
  );

  await recordAudit({
    actorId,
    action: "clients.update",
    entityType: "client",
    entityId: id,
    before,
    after: { name, status },
    ip: getClientIp(),
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function addClientService(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_services.manage");

  const client_id = String(formData.get("client_id") ?? "");
  const service_id = String(formData.get("service_id") ?? "");
  const feeRaw = String(formData.get("fee") ?? "").trim();
  const fee = feeRaw ? Number(feeRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!client_id || !service_id) return;

  const [row] = await query<{ id: string }>(
    `insert into client_services (client_id, service_id, fee, notes)
     values ($1, $2, $3, $4) returning id`,
    [client_id, service_id, fee, notes]
  );

  await recordAudit({
    actorId,
    action: "client_services.add",
    entityType: "client_service",
    entityId: row.id,
    after: { client_id, service_id, fee },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
}

export async function removeClientService(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_services.manage");

  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  if (!id) return;

  await query(
    "update client_services set status = 'ended', ended_at = current_date where id = $1",
    [id]
  );

  await recordAudit({
    actorId,
    action: "client_services.end",
    entityType: "client_service",
    entityId: id,
    ip: getClientIp(),
  });

  if (client_id) revalidatePath(`/clients/${client_id}`);
}

export async function addTeamMember(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_team.manage");

  const client_id = String(formData.get("client_id") ?? "");
  const profile_id = String(formData.get("profile_id") ?? "");
  const role_on_account = String(formData.get("role_on_account") ?? "colaborador").trim();
  if (!client_id || !profile_id) return;

  await query(
    `insert into client_team (client_id, profile_id, role_on_account)
     values ($1, $2, $3)
     on conflict (client_id, profile_id) do update set role_on_account = excluded.role_on_account`,
    [client_id, profile_id, role_on_account]
  );

  await recordAudit({
    actorId,
    action: "client_team.add",
    entityType: "client_team",
    entityId: client_id,
    after: { profile_id, role_on_account },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("client_team.manage");

  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  if (!id) return;

  await query("delete from client_team where id = $1", [id]);

  await recordAudit({
    actorId,
    action: "client_team.remove",
    entityType: "client_team",
    entityId: id,
    ip: getClientIp(),
  });

  if (client_id) revalidatePath(`/clients/${client_id}`);
}

// ===== Usuarios del portal =====

const inviteSchema = z.object({
  client_id: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  client_role: z.enum(["owner", "member"]),
});

export interface InviteClientUserState extends ActionState {
  sent?: { email: string; link: string; emailed: boolean };
}

/** Alta por invitación: link firmado de un solo uso (72hs) por email, en vez de contraseña temporal en pantalla. */
export async function inviteClientUser(
  _prevState: InviteClientUserState,
  formData: FormData
): Promise<InviteClientUserState> {
  const { userId: actorId } = await requirePermission("clients.manage");

  const parsed = inviteSchema.safeParse({
    client_id: formData.get("client_id"),
    email: formData.get("email"),
    client_role: formData.get("client_role") || "member",
  });
  if (!parsed.success) return { error: "Revisá los datos de la invitación." };
  const { client_id, email, client_role } = parsed.data;

  const existing = await queryOne("select 1 from profiles where email = $1", [email]);
  if (existing) return { error: "Ya existe un usuario con ese email." };

  const client = await queryOne<{ name: string }>("select name from clients where id = $1", [client_id]);
  if (!client) return { error: "Cliente no encontrado." };

  const { token } = await createClientInvite(client_id, email, client_role, actorId);
  const inviteUrl = `https://panel.novarix.agency/portal/accept-invite?token=${token}`;
  const emailed = await sendEmail(email, "Invitación al portal de Novarix", inviteEmailHtml(client.name, inviteUrl));

  await recordAudit({
    actorId,
    action: "client_invites.create",
    entityType: "client",
    entityId: client_id,
    after: { email, client_role },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
  // El link se muestra a quien invita para que lo pueda mandar por WhatsApp (sin Resend el email no sale).
  return { sent: { email, link: inviteUrl, emailed } };
}

export async function cancelInvite(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("clients.manage");
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  if (!id) return;

  await query("delete from client_invites where id = $1 and accepted_at is null", [id]);
  await recordAudit({
    actorId,
    action: "client_invites.cancel",
    entityType: "client_invite",
    entityId: id,
    ip: getClientIp(),
  });
  if (client_id) revalidatePath(`/clients/${client_id}`);
}

// ===== Cuentas del portal creadas por Novarix (sin invitacion) =====

const PORTAL_LOGIN_URL = "https://panel.novarix.agency/portal/login";

export interface ClientCredentials {
  full_name: string;
  email: string;
  password: string;
  login_url: string;
  must_change: boolean;
}

export interface CreateClientAccountState extends ActionState {
  created?: ClientCredentials;
}

/** Contraseña aleatoria legible (sin caracteres que se confunden: 0/O, 1/l/I). */
function generatePortalPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

const accountSchema = z.object({
  client_id: z.string().uuid(),
  full_name: z.string().trim().min(1, { message: "Poné el nombre." }).max(120),
  email: z.string().trim().toLowerCase().email({ message: "Email inválido." }),
  client_role: z.enum(["owner", "member"]),
  password: z
    .string()
    .trim()
    .max(100)
    .refine((v) => v === "" || v.length >= 8, { message: "La contraseña tiene que tener al menos 8 caracteres." }),
  must_change: z.boolean(),
});

/**
 * Admin/marketing_admin crean la cuenta del portal del cliente directamente
 * (email + contraseña), sin invitacion. Si no se escribe contraseña, se
 * genera una. Las credenciales se muestran una sola vez para pasarlas.
 */
export async function createClientUserAccount(
  _prevState: CreateClientAccountState,
  formData: FormData
): Promise<CreateClientAccountState> {
  const { userId: actorId } = await requirePermission("clients.manage");
  const parsed = accountSchema.safeParse({
    client_id: formData.get("client_id"),
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    client_role: formData.get("client_role") || "member",
    password: String(formData.get("password") ?? ""),
    must_change: formData.get("must_change") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const d = parsed.data;

  const client = await queryOne<{ name: string }>("select name from clients where id = $1", [d.client_id]);
  if (!client) return { error: "Cliente no encontrado." };
  const existing = await queryOne<{ role: string }>("select role::text as role from profiles where email = $1", [d.email]);
  if (existing) {
    return {
      error:
        existing.role === "client"
          ? "Ya existe una cuenta de portal con ese email (puede ser de otro cliente)."
          : "Ese email ya es de un usuario del equipo de Novarix.",
    };
  }

  const password = d.password || generatePortalPassword();
  const [profile] = await query<{ id: string }>(
    `insert into profiles (email, password_hash, full_name, role, must_change_password)
     values ($1, $2, $3, 'client', $4) returning id`,
    [d.email, hashPassword(password), d.full_name, d.must_change]
  );
  await query(
    "insert into client_users (profile_id, client_id, client_role, active) values ($1, $2, $3, true)",
    [profile.id, d.client_id, d.client_role]
  );
  // Si habia una invitacion pendiente para ese email, ya no hace falta.
  await query("delete from client_invites where email = $1 and accepted_at is null", [d.email]);

  await recordAudit({
    actorId,
    action: "client_users.create_account",
    entityType: "client",
    entityId: d.client_id,
    after: { email: d.email, full_name: d.full_name, client_role: d.client_role, must_change: d.must_change },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${d.client_id}`);
  return {
    created: { full_name: d.full_name, email: d.email, password, login_url: PORTAL_LOGIN_URL, must_change: d.must_change },
  };
}

/** Nueva contraseña temporal para un usuario del portal (cierra sus sesiones abiertas). */
export async function resetClientUserPassword(clientUserId: string, clientId: string): Promise<{ error?: string; created?: ClientCredentials }> {
  const { userId: actorId } = await requirePermission("clients.manage");
  const row = await queryOne<{ profile_id: string; email: string; full_name: string }>(
    `select cu.profile_id, p.email, p.full_name from client_users cu join profiles p on p.id = cu.profile_id
     where cu.id = $1 and cu.client_id = $2 and p.role = 'client'`,
    [clientUserId, clientId]
  );
  if (!row) return { error: "No existe ese usuario." };
  const password = generatePortalPassword();
  await query("update profiles set password_hash = $1, must_change_password = true where id = $2", [hashPassword(password), row.profile_id]);
  await deleteOtherSessionsForUser(row.profile_id);
  await recordAudit({
    actorId,
    action: "client_users.reset_password",
    entityType: "client_user",
    entityId: clientUserId,
    ip: getClientIp(),
  });
  return { created: { full_name: row.full_name, email: row.email, password, login_url: PORTAL_LOGIN_URL, must_change: true } };
}

/** El owner también puede desactivar compañeros; admin/marketing_admin a cualquiera. Nunca borra el perfil. */
export async function setClientUserActive(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("clients.manage");
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const row = await queryOne<{ profile_id: string }>(
    "update client_users set active = $1 where id = $2 returning profile_id",
    [active, id]
  );
  if (row && !active) await deleteOtherSessionsForUser(row.profile_id);

  await recordAudit({
    actorId,
    action: "client_users.set_active",
    entityType: "client_user",
    entityId: id,
    after: { active },
    ip: getClientIp(),
  });

  if (client_id) revalidatePath(`/clients/${client_id}`);
}

/** "Ver como cliente": modo de solo lectura para admin/marketing_admin, registrado en audit log en cada acceso (ver requireClient()). */
export async function startClientPreview(formData: FormData): Promise<void> {
  const { userId } = await requirePermission("clients.manage");
  const client_id = String(formData.get("client_id") ?? "");
  if (!client_id) return;

  const token = createSignedToken(`${userId}:${client_id}`, ADMIN_PREVIEW_TTL_MS);
  cookies().set(ADMIN_PREVIEW_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_PREVIEW_TTL_MS / 1000,
  });

  await recordAudit({
    actorId: userId,
    action: "portal.admin_preview_start",
    entityType: "client",
    entityId: client_id,
    ip: getClientIp(),
  });

  redirect("/portal");
}

export async function stopClientPreview(): Promise<void> {
  const { userId } = await getSessionProfile();
  cookies().delete(ADMIN_PREVIEW_COOKIE);
  await recordAudit({
    actorId: userId,
    action: "portal.admin_preview_stop",
    entityType: "client",
    ip: getClientIp(),
  });
  redirect("/dashboard");
}
