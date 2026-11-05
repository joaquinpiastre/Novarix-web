import { describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  totpKeyUri,
  verifyRecoveryCode,
  verifyTotpToken,
} from "./totp";

describe("totp", () => {
  it("un token generado con el secreto correcto verifica OK", () => {
    const secret = generateTotpSecret();
    const token = authenticator.generate(secret);
    expect(verifyTotpToken(token, secret)).toBe(true);
  });

  it("un token generado con otro secreto NO verifica", () => {
    const secret = generateTotpSecret();
    const otherSecret = generateTotpSecret();
    const token = authenticator.generate(otherSecret);
    expect(verifyTotpToken(token, secret)).toBe(false);
  });

  it("un código basura no rompe, devuelve false", () => {
    expect(verifyTotpToken("no-es-un-numero", generateTotpSecret())).toBe(false);
  });

  it("totpKeyUri arma una URI otpauth válida", () => {
    const uri = totpKeyUri("admin@novarix.test", generateTotpSecret());
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("Panel%20Novarix");
  });
});

describe("recovery codes", () => {
  it("hash/verify hace roundtrip", () => {
    const [code] = generateRecoveryCodes(1);
    const hash = hashRecoveryCode(code);
    expect(verifyRecoveryCode(code, hash)).toBe(true);
    expect(verifyRecoveryCode("codigo-incorrecto", hash)).toBe(false);
  });

  it("genera la cantidad pedida, todos distintos", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });
});
