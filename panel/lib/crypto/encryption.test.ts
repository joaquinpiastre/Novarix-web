import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./encryption";

describe("encrypt/decrypt", () => {
  it("hace roundtrip", () => {
    const plaintext = "token-secreto-de-meta-ads-12345";
    const payload = encrypt(plaintext);
    expect(payload).not.toContain(plaintext);
    expect(decrypt(payload)).toBe(plaintext);
  });

  it("cada cifrado usa un IV distinto (mismo texto, payload distinto)", () => {
    const a = encrypt("mismo texto");
    const b = encrypt("mismo texto");
    expect(a).not.toBe(b);
  });

  it("falla si se altera el ciphertext (auth tag de GCM)", () => {
    const payload = encrypt("dato sensible");
    const [iv, tag, data] = payload.split(".");
    const tampered = [iv, tag, data.slice(0, -4) + "AAAA"].join(".");
    expect(() => decrypt(tampered)).toThrow();
  });
});
