import { beforeEach, describe, expect, it, vi } from "vitest";
import { periodRange, periodText } from "./periods";

const queryMock = vi.fn();
const queryOneMock = vi.fn();
const parseMock = vi.fn();

vi.mock("@/lib/db", () => ({ query: (...a: unknown[]) => queryMock(...a), queryOne: (...a: unknown[]) => queryOneMock(...a) }));
vi.mock("@/lib/ai/clientContext", () => ({ buildClientContext: vi.fn(async () => "Cliente: Prueba") }));
vi.mock("@/lib/usage/record", () => ({ recordAiUsage: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({
  AI_MODEL: "claude-opus-5-5",
  AI_FALLBACK: {},
  getAiClient: () => ({ beta: { messages: { parse: (...a: unknown[]) => parseMock(...a) } } }),
}));

const { generateMetricsReport } = await import("./report");

describe("periodRange", () => {
  const now = new Date("2026-11-15T15:00:00Z");

  it("últimos 30 días contra los 30 anteriores, sin superponerse", () => {
    expect(periodRange("last_30", now)).toMatchObject({ from: "2026-10-17", to: "2026-11-15", prevFrom: "2026-09-17", prevTo: "2026-10-16" });
  });

  it("mes pasado contra el mes anterior completo", () => {
    expect(periodRange("last_month", now)).toMatchObject({ from: "2026-10-01", to: "2026-10-31", prevFrom: "2026-09-01", prevTo: "2026-09-30" });
  });

  it("este mes arranca el 1 y cruza bien el cambio de año", () => {
    expect(periodRange("this_month", new Date("2026-01-10T12:00:00Z"))).toMatchObject({
      from: "2026-01-01",
      to: "2026-01-10",
      prevFrom: "2025-12-01",
      prevTo: "2025-12-31",
    });
  });

  it("periodText", () => {
    expect(periodText("2026-10-01", "2026-10-31")).toBe("01/10/2026 al 31/10/2026");
  });
});

describe("generateMetricsReport", () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([]);
    queryOneMock.mockReset().mockResolvedValue(null);
    parseMock.mockReset();
  });

  it("sin métricas en el período no llama a la IA (no gasta)", async () => {
    const res = await generateMetricsReport("client-1", "last_30", { profileId: "p1" });
    expect(res.error).toMatch(/No hay métricas/);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("con pauta, le pasa a la IA los números ya calculados y guarda el reporte", async () => {
    const range = periodRange("last_30");
    queryOneMock.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes("from meta_insights_daily")) {
        const current = params[1] === range.from;
        return current
          ? { spend: 100000, impressions: 50000, reach: 30000, clicks: 1000, conversations: 40, leads: 0, purchases: 0, purchase_value: 0 }
          : { spend: 80000, impressions: 40000, reach: 25000, clicks: 600, conversations: 20, leads: 0, purchases: 0, purchase_value: 0 };
      }
      if (sql.includes("insert into metrics_reports")) return { id: "rep-1" };
      return null;
    });
    const parsed = {
      title: "t",
      summary: "s",
      health: "bien",
      highlights: [],
      channels: [],
      wins: [],
      problems: [],
      recommendations: [],
      client_message: "m",
    };
    parseMock.mockResolvedValue({ stop_reason: "end_turn", parsed_output: parsed, usage: { input_tokens: 1, output_tokens: 1 } });

    const res = await generateMetricsReport("client-1", "last_30", { profileId: "p1" }, "enfocate en WhatsApp");
    expect(res).toEqual({ id: "rep-1" });

    const request = parseMock.mock.calls[0][0] as { messages: { content: string }[] };
    const content = request.messages[0].content;
    expect(content).toContain('"costo_por_resultado":2500'); // 100000 / 40, calculado en el servidor
    expect(content).toContain('"ctr_pct":2');
    expect(content).toContain("<indicaciones_del_equipo>");
  });
});
