import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const queryOneMock = vi.fn();
const notifyMock = vi.fn();

vi.mock("@/lib/db", () => ({ query: queryMock, queryOne: queryOneMock }));
vi.mock("@/lib/notifications/create", () => ({ notify: notifyMock, notifyMany: vi.fn() }));

const { createContentItemRecord, updateContentItemRecord } = await import("./contentItems");

const CLIENT = "11111111-1111-4111-8111-111111111111";
const MARKETER = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";

const base = {
  client_id: CLIENT,
  title: "Reel lanzamiento",
  format: "reel" as const,
  channels: ["instagram", "tiktok"] as ("instagram" | "tiktok")[],
};

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([]);
  queryOneMock.mockReset();
  notifyMock.mockReset();
});

describe("contenido — delegación solo a marketing", () => {
  it("rechaza asignar a alguien que no es de marketing", async () => {
    queryOneMock.mockResolvedValueOnce({ role: "admin" });
    const result = await createContentItemRecord(ADMIN, { ...base, assigned_to: ADMIN });
    expect(result.error).toMatch(/marketing/);
    expect(queryOneMock).toHaveBeenCalledTimes(1); // nunca llega al insert
  });

  it("acepta marketing y avisa a la persona", async () => {
    queryOneMock.mockResolvedValueOnce({ role: "marketing" }).mockResolvedValueOnce({ id: "item-1" });
    const result = await createContentItemRecord(ADMIN, { ...base, assigned_to: MARKETER });
    expect(result).toEqual({ id: "item-1" });
    expect(notifyMock).toHaveBeenCalledWith(MARKETER, "content_assigned", expect.any(String), base.title, "/calendar?item=item-1");
  });

  it("acepta marketing_admin", async () => {
    queryOneMock.mockResolvedValueOnce({ role: "marketing_admin" }).mockResolvedValueOnce({ id: "item-2" });
    expect(await createContentItemRecord(ADMIN, { ...base, assigned_to: MARKETER })).toEqual({ id: "item-2" });
  });

  it("exige al menos una red social", async () => {
    const result = await createContentItemRecord(ADMIN, { ...base, channels: [] });
    expect(result.error).toMatch(/red social/);
  });

  it("interpreta la fecha de grabación en hora de Mendoza", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "item-3" });
    await createContentItemRecord(ADMIN, { ...base, recording_at: "2026-11-10T10:00" });
    const params = queryOneMock.mock.calls[0][1] as unknown[];
    expect(params[9]).toBe("2026-11-10T13:00:00.000Z");
  });

  it("en una edición, validar al nuevo responsable", async () => {
    queryOneMock
      .mockResolvedValueOnce({
        id: "item-1", client_id: CLIENT, title: "x", format: "reel", channels: ["instagram"], channel: "instagram",
        recording_at: null, scheduled_at: null, script: null, copy: null, notes: null, attachment_url: null,
        assigned_to: null, status: "idea",
      })
      .mockResolvedValueOnce({ role: "programmer" });
    const result = await updateContentItemRecord(ADMIN, "item-1", { assigned_to: ADMIN });
    expect(result.error).toMatch(/marketing/);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
