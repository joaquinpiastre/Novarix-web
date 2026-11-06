import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, UserRole } from "@/lib/types/domain";

const queryOneMock = vi.fn();
const getSessionProfileMock = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const cookiesGetMock = vi.fn();
const recordAuditMock = vi.fn();

vi.mock("@/lib/db", () => ({ queryOne: queryOneMock }));
vi.mock("@/lib/auth/getSessionProfile", () => ({ getSessionProfile: getSessionProfileMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: cookiesGetMock }) }));
vi.mock("@/lib/audit/log", () => ({ recordAudit: recordAuditMock }));
vi.mock("@/lib/utils/request", () => ({ getClientIp: () => "127.0.0.1" }));

const { requireClient } = await import("./requireClient");
const { createSignedToken } = await import("./signedToken");

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
  getSessionProfileMock.mockReset();
  redirectMock.mockClear();
  cookiesGetMock.mockReset();
  recordAuditMock.mockReset();
  process.env.SESSION_SECRET = "test-secret-aislamiento";
});

describe("requireClient — aislamiento entre clientes", () => {
  it("el clientId sale de client_users, nunca de un parametro externo", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "user-A",
      profile: profile("client", "user-A"),
    });
    queryOneMock.mockResolvedValue({ client_id: "client-A", client_role: "owner" });

    const access = await requireClient();

    expect(access.clientId).toBe("client-A");
    expect(access.isAdminPreview).toBe(false);
    // la unica fuente de clientId es la fila de client_users ligada al profile_id de la sesion
    expect(queryOneMock).toHaveBeenCalledWith(expect.stringContaining("client_users"), ["user-A"]);
  });

  it("un usuario client sin membership activa es redirigido, no se le inventa un clientId", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "user-huerfano",
      profile: profile("client", "user-huerfano"),
    });
    queryOneMock.mockResolvedValue(null);

    await expect(requireClient()).rejects.toThrow("REDIRECT:/portal/login");
  });

  it("programmer/marketing sin cookie de preview son redirigidos (no entran al portal)", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "prog-1",
      profile: profile("programmer", "prog-1"),
    });
    cookiesGetMock.mockReturnValue(undefined);

    await expect(requireClient()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("admin con cookie de preview de OTRO admin (userId distinto) es rechazado", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "admin-2",
      profile: profile("admin", "admin-2"),
    });
    const tokenForAdmin1 = createSignedToken("admin-1:client-A", 30 * 60 * 1000);
    cookiesGetMock.mockReturnValue({ value: tokenForAdmin1 });

    await expect(requireClient()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("admin en modo preview valido accede de solo lectura y queda auditado", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "admin-1",
      profile: profile("admin", "admin-1"),
    });
    const token = createSignedToken("admin-1:client-B", 30 * 60 * 1000);
    cookiesGetMock.mockReturnValue({ value: token });

    const access = await requireClient();

    expect(access.clientId).toBe("client-B");
    expect(access.isAdminPreview).toBe(true);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "portal.admin_preview_access", entityId: "client-B" })
    );
  });

  it("un token de preview vencido no da acceso", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "admin-1",
      profile: profile("admin", "admin-1"),
    });
    const expiredToken = createSignedToken("admin-1:client-B", -1000);
    cookiesGetMock.mockReturnValue({ value: expiredToken });

    await expect(requireClient()).rejects.toThrow("REDIRECT:/dashboard");
  });
});
