import "server-only";
import { query } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encryption";
import type { CredentialRow } from "./platforms";

function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return "(no se pudo descifrar)";
  }
}

/** Lista de accesos de un cliente SIN contraseñas (el usuario y las notas si, descifrados). Quien llama ya verifico permisos. */
export async function listClientCredentials(clientId: string): Promise<CredentialRow[]> {
  const rows = await query<{
    id: string;
    platform: string;
    label: string | null;
    username_enc: string | null;
    password_enc: string | null;
    notes_enc: string | null;
    login_url: string | null;
    two_factor: string | null;
    updated_at: string;
    updated_by_name: string | null;
    last_revealed_at: string | null;
    last_revealed_by_name: string | null;
  }>(
    `select c.id, c.platform, c.label, c.username_enc, c.password_enc, c.notes_enc, c.login_url, c.two_factor, c.updated_at,
            u.full_name as updated_by_name, c.last_revealed_at, r.full_name as last_revealed_by_name
     from client_credentials c
     left join profiles u on u.id = c.updated_by
     left join profiles r on r.id = c.last_revealed_by
     where c.client_id = $1
     order by c.platform, c.label nulls first, c.created_at`,
    [clientId]
  );
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    label: r.label,
    username: safeDecrypt(r.username_enc),
    has_password: Boolean(r.password_enc),
    notes: safeDecrypt(r.notes_enc),
    login_url: r.login_url,
    two_factor: r.two_factor,
    updated_at: r.updated_at,
    updated_by_name: r.updated_by_name,
    last_revealed_at: r.last_revealed_at,
    last_revealed_by_name: r.last_revealed_by_name,
  }));
}
