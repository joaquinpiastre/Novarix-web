import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { query, queryOne } from "@/lib/db";

export const SESSION_COOKIE = "panel_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await query("insert into sessions (id, user_id, expires_at) values ($1, $2, $3)", [
    token,
    userId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await query("delete from sessions where id = $1", [token]);
}

export async function getUserIdForSession(token: string): Promise<string | null> {
  const row = await queryOne<{ user_id: string }>(
    "select user_id from sessions where id = $1 and expires_at > now()",
    [token]
  );
  return row?.user_id ?? null;
}
