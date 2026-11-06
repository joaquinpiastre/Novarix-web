import { describe, expect, it } from "vitest";
import { addBusinessHours, calculateSlaDueDate } from "./sla";

// Mendoza es UTC-3 fijo. 12:00 UTC == 09:00 Mendoza.
function mendoza(y: number, m: number, d: number, h: number, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h + 3, min));
}

describe("addBusinessHours", () => {
  it("suma horas dentro del mismo dia habil", () => {
    const start = mendoza(2026, 3, 9, 10); // lunes 10:00
    const result = addBusinessHours(start, 3);
    expect(result.getTime()).toBe(mendoza(2026, 3, 9, 13).getTime());
  });

  it("cruza al dia siguiente si se pasa de las 18", () => {
    const start = mendoza(2026, 3, 9, 16); // lunes 16:00
    const result = addBusinessHours(start, 4); // 2hs hoy (hasta 18) + 2hs mañana
    expect(result.getTime()).toBe(mendoza(2026, 3, 10, 11).getTime());
  });

  it("salta el fin de semana", () => {
    const start = mendoza(2026, 3, 13, 17); // viernes 17:00
    const result = addBusinessHours(start, 2); // 1h hoy + 1h el lunes
    expect(result.getTime()).toBe(mendoza(2026, 3, 16, 10).getTime());
  });

  it("si arranca fuera de horario, lo lleva al proximo horario habil", () => {
    const start = mendoza(2026, 3, 9, 20); // lunes 20:00 (fuera de horario)
    const result = addBusinessHours(start, 1);
    expect(result.getTime()).toBe(mendoza(2026, 3, 10, 10).getTime());
  });

  it("si arranca un sabado, lo lleva al lunes", () => {
    const start = mendoza(2026, 3, 14, 10); // sabado
    const result = addBusinessHours(start, 1);
    expect(result.getTime()).toBe(mendoza(2026, 3, 16, 10).getTime());
  });
});

describe("calculateSlaDueDate", () => {
  it("urgente son 2hs habiles", () => {
    const start = mendoza(2026, 3, 9, 10);
    expect(calculateSlaDueDate("urgent", start).getTime()).toBe(mendoza(2026, 3, 9, 12).getTime());
  });
});
