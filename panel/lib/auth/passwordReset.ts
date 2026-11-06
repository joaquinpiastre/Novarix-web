import "server-only";
import { queryOne } from "@/lib/db";
import { createSignedToken, verifySignedToken } from "./signedToken";

const TTL_MS = 60 * 60 * 1000; // 1h

// Token de un solo uso sin tabla nueva: el payload incluye un fragmento del
// password_hash actual. Apenas se resetea la contraseña, ese fragmento deja
// de matchear y el mismo link ya no sirve para un segundo reset.
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const row = await queryOne<{ password_hash: string }>(
    "select password_hash from profiles where id = $1",
    [userId]
  );
  if (!row) return null;
  const fingerprint = row.password_hash.slice(0, 16);
  return createSignedToken(`${userId}:${fingerprint}`, TTL_MS);
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const payload = verifySignedToken(token);
  if (!payload) return null;
  const [userId, fingerprint] = payload.split(":");
  if (!userId || !fingerprint) return null;

  const row = await queryOne<{ password_hash: string }>(
    "select password_hash from profiles where id = $1",
    [userId]
  );
  if (!row || row.password_hash.slice(0, 16) !== fingerprint) return null;
  return userId;
}
