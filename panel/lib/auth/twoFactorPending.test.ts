import { describe, expect, it, vi } from "vitest";
import { createPendingLoginToken, verifyPendingLoginToken } from "./twoFactorPending";

describe("twoFactorPending", () => {
  it("un token recién creado verifica y devuelve el userId", () => {
    const token = createPendingLoginToken("user-123");
    expect(verifyPendingLoginToken(token)).toBe("user-123");
  });

  it("un token manipulado (firma inválida) no verifica", () => {
    const token = createPendingLoginToken("user-123");
    const [userId, expiresAt] = token.split(".");
    const tampered = `${userId}.${expiresAt}.firma-trucha`;
    expect(verifyPendingLoginToken(tampered)).toBeNull();
  });

  it("cambiar el userId sin recalcular la firma no verifica", () => {
    const token = createPendingLoginToken("user-123");
    const [, expiresAt, signature] = token.split(".");
    const tampered = `user-456.${expiresAt}.${signature}`;
    expect(verifyPendingLoginToken(tampered)).toBeNull();
  });

  it("un token vencido no verifica", () => {
    vi.useFakeTimers();
    try {
      const token = createPendingLoginToken("user-123");
      vi.advanceTimersByTime(6 * 60 * 1000); // > 5 min de TTL
      expect(verifyPendingLoginToken(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("undefined/null no verifica", () => {
    expect(verifyPendingLoginToken(undefined)).toBeNull();
    expect(verifyPendingLoginToken(null)).toBeNull();
  });
});
