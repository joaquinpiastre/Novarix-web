import { describe, expect, it } from "vitest";
import { buildAiPlan, expectedPieces, normalizeFormat, normalizeNetwork, type PlanData } from "./aiPlanSchema";

const data: PlanData = {
  executive_summary: "x",
  objectives: [{ objective: "o", kpi: "k", target: "t" }],
  audience_summary: "a",
  value_proposition: "v",
  networks: ["Instagram", "IG", "tiktok", "pinterest"],
  paid_recommended: true,
  monthly_budget_ars: 300000.4,
  content_calendar: [
    { date: "2026-12-10", title: "B", format: "Reels", network: "ig", pillar: "p", hook: "h", brief: "b" },
    { date: "2026-12-02", title: "A", format: "carousel", network: "facebook", pillar: "p", hook: "h", brief: "b" },
    { date: "2027-01-05", title: "fuera", format: "post", network: "instagram", pillar: "p", hook: "h", brief: "b" },
    { date: "mañana", title: "mal", format: "post", network: "instagram", pillar: "p", hook: "h", brief: "b" },
  ],
};

describe("plan de marketing IA: normalización", () => {
  it("formatos y redes quedan dentro de lo que entiende el calendario", () => {
    expect(normalizeFormat("Reels")).toBe("reel");
    expect(normalizeFormat("cualquiera")).toBe("otro");
    expect(normalizeNetwork("IG")).toBe("instagram");
    expect(normalizeNetwork("pinterest")).toBeNull();
  });

  it("filtra al período, ordena y calcula entregables desde el calendario", () => {
    const plan = buildAiPlan("# doc", data, "2026-12-01", "2026-12-31");
    expect(plan.content_calendar.map((c) => c.title)).toEqual(["A", "B"]);
    expect(plan.content_calendar[1]).toMatchObject({ format: "reel", channels: ["instagram"] });
    expect(plan.networks).toEqual(["instagram", "tiktok"]);
    expect(plan.deliverables).toEqual(expect.arrayContaining([{ format: "carrusel", committed: 1 }, { format: "reel", committed: 1 }]));
    expect(plan.monthly_budget_ars).toBe(300000);
    expect(plan.version).toBe(2);
  });
});


describe("frecuencia elegida", () => {
  it("cuenta las piezas según los días y piezas por día", () => {
    // diciembre 2026: 31 días; lun/mié/vie = 4+5+4 = 13 días
    expect(expectedPieces({ days: [0, 1, 2, 3, 4, 5, 6], perDay: 1 }, "2026-12-01", "2026-12-31")).toBe(31);
    expect(expectedPieces({ days: [1, 3, 5], perDay: 2 }, "2026-12-01", "2026-12-31")).toBe(26);
    expect(expectedPieces({ days: [], perDay: 1 }, "2026-12-01", "2026-12-31")).toBeNull();
    expect(expectedPieces(null, "2026-12-01", "2026-12-31")).toBeNull();
  });
});
