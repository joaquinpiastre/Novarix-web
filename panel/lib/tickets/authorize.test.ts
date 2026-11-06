import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, UserRole } from "@/lib/types/domain";

const queryOneMock = vi.fn();
vi.mock("@/lib/db", () => ({ queryOne: queryOneMock }));

const { canAccessTicket } = await import("./authorize");

function profile(role: UserRole, id: string): Profile {
  return {
    id,
    email: `${role}@novarix.test`,
    full_name: role,
    role,
    created_at: "",
    must_change_password: false,
    totp_enabled: false,
    client_id: null,
    email_notifications: true,
  };
}

beforeEach(() => {
  queryOneMock.mockReset();
});

describe("canAccessTicket — aislamiento de tickets entre clientes", () => {
  it("admin/marketing_admin (tickets.manage_all) acceden a cualquier ticket sin consultar client_team", async () => {
    const admin = profile("admin", "admin-1");
    const ok = await canAccessTicket(admin, "admin-1", "client-A", null);
    expect(ok).toBe(true);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it("el responsable asignado accede sin estar en client_team", async () => {
    const programmer = profile("programmer", "prog-1");
    const ok = await canAccessTicket(programmer, "prog-1", "client-A", "prog-1");
    expect(ok).toBe(true);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it("programmer asignado al equipo de ese cliente accede", async () => {
    const programmer = profile("programmer", "prog-1");
    queryOneMock.mockResolvedValue({ "?column?": 1 });
    const ok = await canAccessTicket(programmer, "prog-1", "client-A", null);
    expect(ok).toBe(true);
    expect(queryOneMock).toHaveBeenCalledWith(expect.stringContaining("client_team"), ["client-A", "prog-1"]);
  });

  it("programmer SIN asignar a ese cliente y sin ser el responsable es rechazado", async () => {
    const programmer = profile("programmer", "prog-1");
    queryOneMock.mockResolvedValue(null);
    const ok = await canAccessTicket(programmer, "prog-1", "client-B", "otro-user");
    expect(ok).toBe(false);
  });

  it("marketing de un cliente no puede acceder a tickets de otro cliente no asignado", async () => {
    const marketing = profile("marketing", "mkt-1");
    queryOneMock.mockResolvedValue(null);
    const ok = await canAccessTicket(marketing, "mkt-1", "client-C", null);
    expect(ok).toBe(false);
    expect(queryOneMock).toHaveBeenCalledWith(expect.stringContaining("client_team"), ["client-C", "mkt-1"]);
  });
});
