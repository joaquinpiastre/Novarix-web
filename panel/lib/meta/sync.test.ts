import { beforeEach, describe, expect, it, vi } from "vitest";

// Sync de metricas organicas con Meta simulado: el comportamiento real de la
// API (token de pagina obligatorio, metricas retiradas que dan #100, totales
// de Instagram por dia) se probo a mano contra la Graph API v26.0.

const queryMock = vi.fn();
const queryOneMock = vi.fn();
const metaGetMock = vi.fn();

vi.mock("@/lib/db", () => ({ query: (...a: unknown[]) => queryMock(...a), queryOne: (...a: unknown[]) => queryOneMock(...a) }));
vi.mock("@/lib/crypto/encryption", () => ({ decrypt: (s: string) => s }));
vi.mock("./alerts", () => ({ checkAlertsForClient: vi.fn() }));
vi.mock("./client", async () => {
  class MetaApiError extends Error {
    constructor(
      message: string,
      public code?: number
    ) {
      super(message);
    }
  }
  return { metaGet: (...a: unknown[]) => metaGetMock(...a), MetaApiError };
});

const { syncConnection } = await import("./sync");
const { MetaApiError } = await import("./client");

const CONN = { id: "conn-1", client_id: "client-1", access_token: "USER_TOKEN" };

function socialInserts() {
  return queryMock.mock.calls.filter(([sql]) => String(sql).includes("insert into social_insights_daily"));
}

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  metaGetMock.mockReset();
  queryOneMock.mockImplementation(async (sql: string) => {
    if (sql.includes("from meta_connections")) return CONN;
    if (sql.includes("count(*)")) return { n: 5 }; // ya tiene datos: sync corta
    return null;
  });
});

describe("sync de la pagina de Facebook", () => {
  beforeEach(() => {
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("from meta_assets") ? [{ id: "asset-p", client_id: "client-1", asset_type: "page", external_id: "PAGE1" }] : []
    );
  });

  it("usa el token de la pagina, saltea metricas retiradas y no marca error", async () => {
    metaGetMock.mockImplementation(async (path: string, token: string, params: Record<string, string>) => {
      if (path === "PAGE1") return { access_token: "PAGE_TOKEN", followers_count: 1785 };
      expect(token).toBe("PAGE_TOKEN");
      if (params.metric === "page_views_total") throw new MetaApiError("(#100) The value must be a valid insights metric", 100);
      return { data: [{ name: params.metric, values: [{ value: 7, end_time: "2026-11-14T08:00:00+0000" }] }] };
    });

    await syncConnection("conn-1", 3);

    const inserts = socialInserts();
    expect(inserts.length).toBeGreaterThan(0);
    const day = inserts.find(([, params]) => (params as unknown[])[2] === "2026-11-14");
    expect(day).toBeDefined();
    // columnas: followers, follower_growth, reach, views, engagement, accounts_engaged, profile_visits, link_taps
    expect((day![1] as unknown[]).slice(3)).toEqual([null, 7, 7, 7, 7, null, null, null]);
    const errorUpdates = queryMock.mock.calls.filter(([sql]) => String(sql).includes("status = 'error'"));
    expect(errorUpdates).toHaveLength(0);
  });

  it("si no responde ninguna metrica, la conexion queda con error", async () => {
    metaGetMock.mockImplementation(async (path: string) => {
      if (path === "PAGE1") return { access_token: "PAGE_TOKEN" };
      throw new MetaApiError("(#100) The value must be a valid insights metric", 100);
    });
    await syncConnection("conn-1", 3);
    const errorUpdates = queryMock.mock.calls.filter(([sql]) => String(sql).includes("status = 'error'"));
    expect(errorUpdates).toHaveLength(1);
  });
});

describe("sync de Instagram", () => {
  beforeEach(() => {
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("from meta_assets") ? [{ id: "asset-ig", client_id: "client-1", asset_type: "instagram", external_id: "IG1" }] : []
    );
  });

  it("guarda seguidores totales, nuevos seguidores y los totales de cada dia", async () => {
    metaGetMock.mockImplementation(async (path: string, _t: string, params: Record<string, string>) => {
      if (path === "IG1") return { followers_count: 4162 };
      if (path === "IG1/media") return { data: [] };
      if (params.metric_type === "total_value") {
        return { data: params.metric.split(",").map((name) => ({ name, total_value: { value: 3 } })) };
      }
      const value = params.metric === "follower_count" ? 2 : 100;
      return { data: [{ name: params.metric, values: [{ value, end_time: `${params.since}T08:00:00+0000` }] }] };
    });

    await syncConnection("conn-1", 3);

    const totalCalls = metaGetMock.mock.calls.filter(([, , p]) => (p as Record<string, string>)?.metric_type === "total_value");
    expect(totalCalls).toHaveLength(3); // un pedido por dia
    const rows = socialInserts().map(([, p]) => p as unknown[]);
    const followersRow = rows.find((r) => r[3] === 4162);
    expect(followersRow).toBeDefined();
    const seriesRow = rows.find((r) => r[4] === 2);
    expect(seriesRow?.[5]).toBe(100); // reach
    expect(rows.some((r) => r[6] === 3 && r[7] === 3 && r[8] === 3 && r[10] === 3)).toBe(true); // views, interacciones, cuentas, toques
  });
});
