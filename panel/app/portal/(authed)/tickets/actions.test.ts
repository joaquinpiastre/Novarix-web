import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const queryOneMock = vi.fn();
const requireClientMock = vi.fn();
const assertNotPreviewMock = vi.fn(() => null);
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("@/lib/db", () => ({ query: queryMock, queryOne: queryOneMock }));
vi.mock("@/lib/auth/requireClient", () => ({
  requireClient: requireClientMock,
  assertNotPreview: assertNotPreviewMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/storage/s3", () => ({ buildStorageKey: vi.fn(() => "key"), uploadObject: vi.fn() }));
vi.mock("@/lib/storage/uploadLimits", () => ({ validateUpload: vi.fn(() => ({})) }));
vi.mock("@/lib/tickets/sla", () => ({ calculateSlaDueDate: vi.fn(() => new Date()) }));
vi.mock("@/lib/tickets/assign", () => ({ suggestAssignee: vi.fn(async () => null) }));
vi.mock("@/lib/tickets/notify", () => ({
  notifyNewTicket: vi.fn(),
  notifyTeamOfClientReply: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({
  isRateLimited: vi.fn(async () => false),
  recordLoginAttempt: vi.fn(),
}));
vi.mock("@/lib/utils/request", () => ({ getClientIp: () => "127.0.0.1" }));
vi.mock("@/lib/audit/log", () => ({ recordAudit: vi.fn() }));

const { createTicket, addClientMessage, resolveTicketByClient } = await import("./actions");

const CLIENT_A = "11111111-1111-1111-1111-111111111111";
const CLIENT_B = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  requireClientMock.mockReset();
  assertNotPreviewMock.mockReset().mockReturnValue(null);
  redirectMock.mockClear();
  queryMock.mockResolvedValue([{ id: "ticket-1", number: "NVX-0001" }]);
});

describe("aislamiento entre clientes — acciones de tickets del portal", () => {
  it("createTicket inserta SIEMPRE con el client_id de requireClient(), nunca de formData", async () => {
    requireClientMock.mockResolvedValue({ userId: "user-A", clientId: CLIENT_A, clientRole: "owner" });

    const fd = new FormData();
    fd.set("title", "Necesito ayuda");
    fd.set("ticket_type", "consulta");
    fd.set("priority", "medium");
    // el cliente A intenta inyectar el id del cliente B via un campo oculto manipulado
    fd.set("client_id", CLIENT_B);

    await expect(createTicket({}, fd)).rejects.toThrow("REDIRECT:/portal/tickets/ticket-1");

    const insertCall = queryMock.mock.calls.find(([sql]) => sql.includes("insert into support_tickets"));
    expect(insertCall).toBeDefined();
    const [, params] = insertCall!;
    expect(params[0]).toBe(CLIENT_A);
    expect(params).not.toContain(CLIENT_B);
  });

  it("addClientMessage no encuentra (y no modifica) un ticket que pertenece a otro cliente", async () => {
    requireClientMock.mockResolvedValue({ userId: "user-A", clientId: CLIENT_A, clientRole: "owner" });
    // simula que el SQL real (where id = $1 and client_id = $2) no devuelve fila
    // porque el ticket pedido es de CLIENT_B.
    queryOneMock.mockResolvedValue(null);

    const fd = new FormData();
    fd.set("ticket_id", "33333333-3333-4333-a333-333333333333");
    fd.set("body", "hola");

    const result = await addClientMessage({}, fd);

    expect(result.error).toBe("Ticket no encontrado.");
    expect(queryOneMock).toHaveBeenCalledWith(expect.stringContaining("client_id = $2"), [
      "33333333-3333-4333-a333-333333333333",
      CLIENT_A,
    ]);
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("insert into ticket_messages"), expect.anything());
  });

  it("resolveTicketByClient es un no-op silencioso si el ticket no es del cliente en sesión", async () => {
    requireClientMock.mockResolvedValue({ userId: "user-A", clientId: CLIENT_A, clientRole: "owner" });
    queryOneMock.mockResolvedValue(null);

    const fd = new FormData();
    fd.set("ticket_id", "44444444-4444-4444-4444-444444444444");

    await resolveTicketByClient(fd);

    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("update support_tickets set status = 'resuelto'"), expect.anything());
  });

  it("modo preview de admin (solo lectura) bloquea la creación de tickets", async () => {
    requireClientMock.mockResolvedValue({ userId: "admin-1", clientId: CLIENT_A, clientRole: "owner", isAdminPreview: true });
    assertNotPreviewMock.mockReturnValue({ error: "preview" });

    const fd = new FormData();
    fd.set("title", "x");
    fd.set("ticket_type", "consulta");

    const result = await createTicket({}, fd);
    expect(result.error).toBe("preview");
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("insert into support_tickets"), expect.anything());
  });
});
