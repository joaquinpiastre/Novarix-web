import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, UserRole } from "@/lib/types/domain";

const queryMock = vi.fn().mockResolvedValue([]);
const getSessionProfileMock = vi.fn();

vi.mock("@/lib/db", () => ({ query: queryMock }));
vi.mock("@/lib/auth/getSessionProfile", () => ({
  getSessionProfile: getSessionProfileMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateTaskStatus } = await import("./actions");

function profile(role: UserRole, id: string): Profile {
  return {
    id,
    email: `${role}@novarix.test`,
    full_name: role,
    role,
    created_at: "",
    must_change_password: false,
    totp_enabled: false,
  };
}

beforeEach(() => {
  queryMock.mockClear();
});

describe("updateTaskStatus — autorizacion a nivel de SQL", () => {
  it("admin: UPDATE sin filtro de assigned_to", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "admin-1",
      profile: profile("admin", "admin-1"),
    });

    await updateTaskStatus("task-1", "done");

    expect(queryMock).toHaveBeenCalledWith(
      "update tasks set status = $1, updated_at = now() where id = $2",
      ["done", "task-1"]
    );
  });

  it("colaborador: UPDATE filtrado por assigned_to = userId", async () => {
    getSessionProfileMock.mockResolvedValue({
      userId: "prog-1",
      profile: profile("programmer", "prog-1"),
    });

    await updateTaskStatus("task-1", "in_progress");

    expect(queryMock).toHaveBeenCalledWith(
      "update tasks set status = $1, updated_at = now() where id = $2 and assigned_to = $3",
      ["in_progress", "task-1", "prog-1"]
    );
  });
});
