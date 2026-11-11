import { afterEach, describe, expect, it } from "vitest";
import { buildMetaLoginUrl, callbackUrlForHost, isMetaOAuthConfigured } from "./oauth";
import { metaReturnPath, parseMetaOAuthState } from "./oauthState";
import { createSignedToken, verifySignedToken } from "@/lib/auth/signedToken";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe("callbackUrlForHost — nunca arma la vuelta con un dominio arbitrario", () => {
  it("acepta el panel y el portal, siempre por https", () => {
    expect(callbackUrlForHost("panel.novarix.agency")).toBe("https://panel.novarix.agency/api/meta/oauth/callback");
    expect(callbackUrlForHost("clientes.novarix.agency")).toBe("https://clientes.novarix.agency/api/meta/oauth/callback");
  });

  it("rechaza dominios desconocidos (open redirect)", () => {
    expect(callbackUrlForHost("evil.com")).toBeNull();
    expect(callbackUrlForHost("panel.novarix.agency.evil.com")).toBeNull();
    expect(callbackUrlForHost(null)).toBeNull();
  });

  it("permite localhost para desarrollo y dominios extra por env", () => {
    expect(callbackUrlForHost("localhost:3001")).toBe("http://localhost:3001/api/meta/oauth/callback");
    process.env.META_OAUTH_EXTRA_HOSTS = "panel-production-cdbd.up.railway.app";
    expect(callbackUrlForHost("panel-production-cdbd.up.railway.app")).toContain("https://panel-production-cdbd.up.railway.app/");
  });
});

describe("buildMetaLoginUrl", () => {
  it("con config_id usa Inicio de sesión para empresas (código + token de usuario del sistema)", () => {
    process.env.META_APP_ID = "123";
    process.env.META_APP_SECRET = "s";
    process.env.META_LOGIN_CONFIG_ID = "999";
    const url = new URL(buildMetaLoginUrl("st", "https://panel.novarix.agency/api/meta/oauth/callback"));
    expect(url.hostname).toBe("www.facebook.com");
    expect(url.searchParams.get("client_id")).toBe("123");
    expect(url.searchParams.get("config_id")).toBe("999");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("override_default_response_type")).toBe("true");
    expect(url.searchParams.get("scope")).toBeNull();
    expect(url.searchParams.get("state")).toBe("st");
  });

  it("sin config_id pide los permisos por scope", () => {
    process.env.META_APP_ID = "123";
    process.env.META_APP_SECRET = "s";
    delete process.env.META_LOGIN_CONFIG_ID;
    const url = new URL(buildMetaLoginUrl("st", "https://panel.novarix.agency/api/meta/oauth/callback"));
    expect(url.searchParams.get("scope")).toContain("instagram_manage_insights");
    expect(url.searchParams.get("scope")).toContain("ads_read");
  });

  it("isMetaOAuthConfigured necesita app id y secreto", () => {
    delete process.env.META_APP_SECRET;
    process.env.META_APP_ID = "123";
    expect(isMetaOAuthConfigured()).toBe(false);
  });
});

describe("state firmado", () => {
  it("ida y vuelta válida", () => {
    const token = createSignedToken(JSON.stringify({ c: "client-1", p: "user-1", f: "portal" }), 60_000);
    expect(parseMetaOAuthState(verifySignedToken(token))).toEqual({ c: "client-1", p: "user-1", f: "portal" });
  });

  it("rechaza un state adulterado o mal formado", () => {
    const token = createSignedToken(JSON.stringify({ c: "client-1", p: "user-1", f: "panel" }), 60_000);
    const tampered = token.replace(/^[^.]+/, Buffer.from(JSON.stringify({ c: "otro", p: "user-1", f: "panel" })).toString("base64url"));
    expect(verifySignedToken(tampered)).toBeNull();
    expect(parseMetaOAuthState('{"c":1}')).toBeNull();
    expect(parseMetaOAuthState("no json")).toBeNull();
  });
});

describe("metaReturnPath", () => {
  it("en el dominio del portal vuelve sin /portal", () => {
    expect(metaReturnPath("portal", "c1", "clientes.novarix.agency")).toBe("/metrics");
    expect(metaReturnPath("portal", "c1", "panel.novarix.agency")).toBe("/portal/metrics");
    expect(metaReturnPath("panel", "c1", "panel.novarix.agency")).toBe("/clients/c1?tab=metricas");
  });
});
