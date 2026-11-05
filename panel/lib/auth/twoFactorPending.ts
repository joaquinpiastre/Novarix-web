import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Token firmado (HMAC), corta duración, para el paso intermedio entre
// "contraseña correcta" y "sesión real creada" cuando el usuario tiene 2FA
// activado. Va en su propia cookie, separada de `sessions` -- así toda fila
// de `sessions` sigue significando "sesión autenticada de verdad", sin tener
// que agregarle un estado "pendiente de 2FA".
export const TWO_FACTOR_PENDING_COOKIE = "panel_2fa_pending";
const PENDING_TTL_MS = 5 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_SECRET.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createPendingLoginToken(userId: string): string {
  const expiresAt = Date.now() + PENDING_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyPendingLoginToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, signature] = parts;

  const expectedSignature = sign(`${userId}.${expiresAtStr}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (Date.now() > Number(expiresAtStr)) return null;
  return userId;
}
