import "server-only";
import { randomBytes, createHash } from "crypto";
import { query, queryOne } from "@/lib/db";
import type { ClientPortalRole } from "@/lib/types/domain";

const TTL_MS = 72 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createClientInvite(
  clientId: string,
  email: string,
  clientRole: ClientPortalRole,
  invitedBy: string
): Promise<{ inviteId: string; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS);

  const [row] = await query<{ id: string }>(
    `insert into client_invites (client_id, email, client_role, invited_by, token_hash, expires_at)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [clientId, email.trim().toLowerCase(), clientRole, invitedBy, tokenHash, expiresAt]
  );

  return { inviteId: row.id, token };
}

export interface InviteLookup {
  id: string;
  client_id: string;
  email: string;
  client_role: ClientPortalRole;
}

export async function findValidInvite(token: string): Promise<InviteLookup | null> {
  const tokenHash = hashToken(token);
  return queryOne<InviteLookup>(
    `select id, client_id, email, client_role::text as client_role from client_invites
     where token_hash = $1 and accepted_at is null and expires_at > now()`,
    [tokenHash]
  );
}

export async function markInviteAccepted(id: string): Promise<void> {
  await query("update client_invites set accepted_at = now() where id = $1", [id]);
}

export function inviteEmailHtml(clientName: string, inviteUrl: string): string {
  return `
    <p>Te invitaron a acceder al portal de clientes de Novarix para <strong>${clientName}</strong>.</p>
    <p>Este link es de un solo uso y vence en 72 horas:</p>
    <p><a href="${inviteUrl}">Crear mi contraseña</a></p>
    <p>Si no esperabas esta invitación, podés ignorar este email.</p>
  `;
}
