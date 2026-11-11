import { describe, expect, it } from "vitest";
import { toolInputSchemas } from "./tools";

describe("herramientas de ideas: todo opcional (modo automático)", () => {
  for (const tool of ["ideas", "ganchos", "guion", "reciclador", "hashtags", "ads"] as const) {
    it(`${tool} acepta el formulario vacío`, () => {
      const parsed = toolInputSchemas[tool].safeParse({});
      expect(parsed.success).toBe(true);
      expect((parsed.data as { prompt: string }).prompt).toBe("");
    });
  }

  it("fecha necesita saber qué fecha es, pero el resto es opcional", () => {
    expect(toolInputSchemas.fecha.safeParse({}).success).toBe(false);
    expect(toolInputSchemas.fecha.safeParse({ date_name: "Día de la Madre", date: "2026-10-18" }).success).toBe(true);
  });

  it("guarda las indicaciones libres y recorta espacios", () => {
    const parsed = toolInputSchemas.ganchos.parse({ prompt: "  ganchos con humor  " });
    expect(parsed.prompt).toBe("ganchos con humor");
    expect(parsed.topic).toBe("");
  });

  it("rechaza indicaciones demasiado largas", () => {
    expect(toolInputSchemas.ideas.safeParse({ prompt: "x".repeat(2001) }).success).toBe(false);
  });

  it("ads sin objetivo deja que elija la IA", () => {
    expect(toolInputSchemas.ads.parse({}).objective).toBe("");
    expect(toolInputSchemas.ads.safeParse({ objective: "inventado" }).success).toBe(false);
  });
});
