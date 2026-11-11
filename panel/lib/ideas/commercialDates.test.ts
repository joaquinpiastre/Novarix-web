import { describe, expect, it } from "vitest";
import { addDays, commercialDatesForYear, daysBetween, easterSunday, upcomingCommercialDates } from "./commercialDates";

const byName = (year: number, name: string) => commercialDatesForYear(year).find((d) => d.name === name)?.date;

describe("fechas comerciales", () => {
  it("calcula Pascuas", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("Día de la Madre es el tercer domingo de octubre", () => {
    expect(byName(2026, "Día de la Madre")).toBe("2026-10-18");
    expect(byName(2027, "Día de la Madre")).toBe("2027-10-17");
  });

  it("Día del Padre es el tercer domingo de junio y el de las Infancias el tercero de agosto", () => {
    expect(byName(2026, "Día del Padre")).toBe("2026-06-21");
    expect(byName(2026, "Día de las Infancias (del Niño)")).toBe("2026-08-16");
  });

  it("Black Friday es el último viernes de noviembre", () => {
    expect(byName(2026, "Black Friday")).toBe("2026-11-27");
  });

  it("lista las próximas fechas, cruzando el año", () => {
    const list = upcomingCommercialDates("2026-12-20", 60);
    expect(list.map((d) => d.name)).toContain("Navidad");
    expect(list.every((d) => d.date >= "2026-12-20" && d.date <= "2027-02-18")).toBe(true);
  });

  it("helpers de días", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-11-11", "2026-11-18")).toBe(7);
  });
});
