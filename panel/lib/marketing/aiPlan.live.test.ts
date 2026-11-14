// Prueba contra la API real de Claude (cuesta centavos). No corre en `npm test`.
// RUN_AI_TESTS=1 ANTHROPIC_API_KEY=... npx vitest run lib/marketing/aiPlan.live.test.ts
import { describe, expect, it } from "vitest";
import { estimateAiCost } from "@/lib/ai/pricing";
import { AI_MODEL } from "@/lib/ai/client";
import { runPlanGeneration } from "./aiPlan";

describe.skipIf(!process.env.RUN_AI_TESTS)("plan de marketing con IA (API real)", () => {
  it("arma documento + calendario validos", async () => {
    const t0 = Date.now();
    const { plan, usages } = await runPlanGeneration({
      context:
        "Cliente: Ferretería y pinturería de barrio en San Rafael, Mendoza. Instagram con 4.100 seguidores. Lo que mejor funcionó: reels de antes y después de pintar. Le falta: píxel de Meta, Google Business completo.",
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
      budgetArs: 300000,
      instructions: "",
    });
    const secs = Math.round((Date.now() - t0) / 1000);
    const cost = usages.reduce((a, u) => a + estimateAiCost(AI_MODEL, u), 0);
    console.log(`segundos=${secs} costo≈USD ${cost.toFixed(3)} doc=${plan.document_markdown.length} chars`);
    console.log(`objetivos=${plan.objectives.length} piezas=${plan.content_calendar.length} redes=${plan.networks.join(",")} pauta=${plan.monthly_budget_ars}`);
    console.log(`entregables=${plan.deliverables.map((d) => `${d.format}:${d.committed}`).join(" ")}`);
    console.log(`ej: ${plan.content_calendar[0]?.date} ${plan.content_calendar[0]?.title} — ${plan.content_calendar[0]?.hook}`);
    console.log(plan.document_markdown.slice(0, 600));
    expect(plan.objectives.length).toBeGreaterThanOrEqual(3);
    expect(plan.content_calendar.length).toBeGreaterThanOrEqual(8);
    expect(plan.document_markdown.length).toBeGreaterThan(1500);
  }, 900_000);
});
