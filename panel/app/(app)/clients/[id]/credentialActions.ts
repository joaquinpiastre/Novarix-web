"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { CREDENTIAL_PLATFORM_VALUES, platformLabel } from "@/lib/credentials/platforms";

// Accesos de los clientes. Toda accion verifica acceso al cliente (marketing:
// solo sus clientes asignados) + permiso credentials.view. Las contraseñas
// nunca se guardan ni se registran en texto plano; mostrarlas queda auditado.

const uuid = z.string().uuid();

async function gate(clientId: string): Promise<{ userId: string; error?: string }> {
  if (!uuid.safeParse(clientId).success) return { userId: "", error: "Cliente inválido." };
  const { userId, profile } = await requireClientAccess(clientId);
  if (!can(profile, "credentials.view")) return { userId, error: "No tenés acceso a los accesos de clientes." };
  return { userId };
}

const optional = (max: number) => z.string().max(max).optional().default("");

const schema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  platform: z.enum(CREDENTIAL_PLATFORM_VALUES),
  label: optional(120),
  username: optional(300),
  // undefined = no tocar la contraseña guardada (al editar); "" = borrarla.
  password: z.string().max(500).optional(),
  notes: optional(3000),
  login_url: optional(500).refine((v) => v === "" || /^https?:\/\//i.test(v.trim()), { message: "El link tiene que empezar con http:// o https://" }),
  two_factor: optional(300),
});

export async function saveCredential(input: z.input<typeof schema>): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  const { userId, error } = await gate(d.client_id);
  if (error) return { error };

  const enc = (v: string) => (v.trim() ? encrypt(v.trim()) : null);
  const label = d.label.trim() || null;

  if (d.id) {
    const current = await queryOne<{ client_id: string }>("select client_id from client_credentials where id = $1", [d.id]);
    if (!current || current.client_id !== d.client_id) return { error: "No existe ese acceso." };
    await query(
      `update client_credentials set platform = $2, label = $3, username_enc = $4, notes_enc = $5, login_url = $6, two_factor = $7,
         password_enc = case when $8::boolean then $9 else password_enc end, updated_by = $10, updated_at = now()
       where id = $1`,
      [
        d.id,
        d.platform,
        label,
        enc(d.username),
        enc(d.notes),
        d.login_url.trim() || null,
        d.two_factor.trim() || null,
        d.password !== undefined,
        d.password !== undefined ? enc(d.password) : null,
        userId,
      ]
    );
    await recordAudit({
      actorId: userId,
      action: "credentials.update",
      entityType: "client_credential",
      entityId: d.id,
      after: { client_id: d.client_id, platform: d.platform, label, password_changed: d.password !== undefined },
      ip: getClientIp(),
    });
  } else {
    const row = await queryOne<{ id: string }>(
      `insert into client_credentials (client_id, platform, label, username_enc, password_enc, notes_enc, login_url, two_factor, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) returning id`,
      [d.client_id, d.platform, label, enc(d.username), enc(d.password ?? ""), enc(d.notes), d.login_url.trim() || null, d.two_factor.trim() || null, userId]
    );
    await recordAudit({
      actorId: userId,
      action: "credentials.create",
      entityType: "client_credential",
      entityId: row!.id,
      after: { client_id: d.client_id, platform: d.platform, label },
      ip: getClientIp(),
    });
  }
  revalidatePath(`/clients/${d.client_id}`);
  return {};
}

/** Devuelve la contraseña descifrada (para mostrar o copiar) y deja constancia de quién la vio. */
export async function revealCredentialPassword(id: string, clientId: string, purpose: "ver" | "copiar"): Promise<{ password?: string; error?: string }> {
  const { userId, error } = await gate(clientId);
  if (error) return { error };
  if (!uuid.safeParse(id).success) return { error: "Acceso inválido." };
  const row = await queryOne<{ client_id: string; password_enc: string | null; platform: string; label: string | null }>(
    "select client_id, password_enc, platform, label from client_credentials where id = $1",
    [id]
  );
  if (!row || row.client_id !== clientId) return { error: "No existe ese acceso." };
  if (!row.password_enc) return { error: "Este acceso no tiene contraseña cargada." };
  let password: string;
  try {
    password = decrypt(row.password_enc);
  } catch {
    return { error: "No se pudo descifrar (¿cambió la ENCRYPTION_KEY?)." };
  }
  await query("update client_credentials set last_revealed_at = now(), last_revealed_by = $2 where id = $1", [id, userId]);
  await recordAudit({
    actorId: userId,
    action: "credentials.reveal",
    entityType: "client_credential",
    entityId: id,
    after: { client_id: clientId, platform: platformLabel(row.platform), label: row.label, purpose },
    ip: getClientIp(),
  });
  return { password };
}

export async function deleteCredential(id: string, clientId: string): Promise<{ error?: string }> {
  const { userId, error } = await gate(clientId);
  if (error) return { error };
  const row = await queryOne<{ client_id: string; platform: string; label: string | null }>(
    "select client_id, platform, label from client_credentials where id = $1",
    [id]
  );
  if (!row || row.client_id !== clientId) return { error: "No existe ese acceso." };
  await query("delete from client_credentials where id = $1", [id]);
  await recordAudit({
    actorId: userId,
    action: "credentials.delete",
    entityType: "client_credential",
    entityId: id,
    before: { client_id: clientId, platform: row.platform, label: row.label },
    ip: getClientIp(),
  });
  revalidatePath(`/clients/${clientId}`);
  return {};
}
