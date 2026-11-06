import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Helper generico de token firmado (HMAC con SESSION_SECRET), para
// invitaciones y recuperacion de contraseña. El payload va en texto plano
// en el token (no es secreto, solo necesita integridad), separado de la
// firma -- mismo patron que lib/auth/twoFactorPending.ts, generalizado para
// no repetir la logica de HMAC/timing-safe-compare en cada feature nueva.

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno SESSION_SECRET.");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSignedToken(payload: string, ttlMs: number): string {
  const expiresAt = Date.now() + ttlMs;
  const body = `${Buffer.from(payload, "utf8").toString("base64url")}.${expiresAt}`;
  return `${body}.${sign(body)}`;
}

export function verifySignedToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [payloadB64, expiresAtStr, signature] = parts;
  const body = `${payloadB64}.${expiresAtStr}`;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (Date.now() > Number(expiresAtStr)) return null;
  try {
    return Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
