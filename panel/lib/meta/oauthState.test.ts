import { describe, expect, it } from "vitest";
import { publicUrl } from "./oauthState";

const h = (init: Record<string, string>) => new Headers(init);

describe("publicUrl (vuelta del login de Facebook)", () => {
  it("usa el dominio publico que vino en x-forwarded-host, no el host interno del contenedor", () => {
    expect(publicUrl("/clients/1?tab=metricas", h({ host: "localhost:8080", "x-forwarded-host": "panel.novarix.agency" }))).toBe(
      "https://panel.novarix.agency/clients/1?tab=metricas"
    );
  });

  it("respeta el dominio del portal de clientes", () => {
    expect(publicUrl("/metrics", h({ "x-forwarded-host": "clientes.novarix.agency" }))).toBe("https://clientes.novarix.agency/metrics");
  });

  it("un host desconocido nunca se usa: cae al panel", () => {
    expect(publicUrl("/x", h({ host: "evil.example.com" }))).toBe("https://panel.novarix.agency/x");
  });

  it("en desarrollo local mantiene localhost", () => {
    expect(publicUrl("/x", h({ host: "localhost:3000" }))).toBe("http://localhost:3000/x");
  });
});
