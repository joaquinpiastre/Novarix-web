import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, UserRole } from "@/lib/types/domain";

const queryOneMock = vi.fn();
const getSessionProfileMock = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("@/lib/db", () => ({ queryOne: queryOneMock }));
vi.mock("@/lib/auth/getSessionProfile", () => ({ getSessionProfile: getSessionProfileMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { requireClientAccess } = await import("./requireClientAccess");

function profile(role: UserRole, id: string): Profile {
  return { id, email: `${role}@novarix.test`, full_name: role, role, created_at: "", must_change_password: false, totp_enabled: false };
}

beforeEach(() => {
  queryOneMock.mockReset();
  getSessionProfileMock.mockReset();
  redirectMock.mockClear();
});

describe("requireClientAccess", () => {
  it("admin tiene acceso full sin consultar client_team", async () => {
    getSessionProfileMock.mockResolvedValue({ userId: "admin-1", profile: profile("admin", "admin-1") });
    const access = await requireClientAccess("client-1");
    expect(access.full).toBe(true);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it("marketing_admin tiene acceso full", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "ma-1",
      profile: profile("marketing_admin", "ma-1"),
    });
    const access = await requireClientAccess("client-1");
    expect(access.full).toBe(true);
  });

  it("marketing asignado a ese cliente tiene acceso acotado (full=false)", async () => {
    getSessionProfileMock.mockResolvedValue({ userId: "mkt-1", profile: profile("marketing", "mkt-1") });
    queryOneMock.mockResolvedValue({ "?column?": 1 });
    const access = await requireClientAccess("client-1");
    expect(access.full).toBe(false);
    expect(queryOneMock).toHaveBeenCalledWith(expect.stringContaining("client_team"), [
      "client-1",
      "mkt-1",
    ]);
  });

  it("marketing NO asignado a ese cliente es redirigido", async () => {
    getSessionProfileMock.mockResolvedValue({ userId: "mkt-1", profile: profile("marketing", "mkt-1") });
    queryOneMock.mockResolvedValue(null);
    await expect(requireClientAccess("client-1")).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("programmer no tiene acceso a clientes", async () => {
    getSessionProfileMock.mockResolvedValue({ userId: "prog-1", profile: profile("programmer", "prog-1") });
    await expect(requireClientAccess("client-1")).rejects.toThrow("REDIRECT:/dashboard");
    expect(queryOneMock).not.toHaveBeenCalled();
  });
});
