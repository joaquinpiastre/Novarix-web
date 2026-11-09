import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, UserRole } from "@/lib/types/domain";

const queryMock = vi.fn();
const queryOneMock = vi.fn();
const recordAuditMock = vi.fn();

vi.mock("@/lib/db", () => ({ query: queryMock, queryOne: queryOneMock }));
vi.mock("@/lib/audit/log", () => ({ recordAudit: recordAuditMock }));
vi.mock("@/lib/notifications/create", () => ({ notify: vi.fn(), notifyMany: vi.fn() }));
vi.mock("@/app/(app)/tickets/actions", () => ({
  assignTicket: vi.fn(),
  updateTicketPriority: vi.fn(),
  updateTicketStatus: vi.fn(),
}));

const { runTool, toolDefinitionsFor } = await import("./tools");

function profile(role: UserRole): Profile {
  return {
    id: `${role}-1`, email: `${role}@novarix.test`, full_name: role, role, created_at: "", must_change_password: false,
    totp_enabled: false, client_id: null, email_notifications: true,
  };
}
const ctx = (role: UserRole) => ({ userId: `${role}-1`, profile: profile(role), ip: null });

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([]);
  queryOneMock.mockReset();
  recordAuditMock.mockReset();
});

describe("herramientas de IA — permisos", () => {
  it("marketing_admin no ve herramientas de finanzas, tareas ni recordatorios", () => {
    const names = toolDefinitionsFor(profile("marketing_admin")).map((t) => t.name);
    expect(names).toContain("crear_contenido");
    expect(names).not.toContain("ver_finanzas");
    expect(names).not.toContain("crear_tarea");
    expect(names).not.toContain("crear_recordatorio");
  });

  it("admin tiene todas, y ninguna borra registros", () => {
    const names = toolDefinitionsFor(profile("admin")).map((t) => t.name);
    expect(names).toContain("ver_finanzas");
    expect(names.some((n) => /borrar|eliminar|delete/.test(n))).toBe(false);
  });

  it("los schemas son objetos JSON válidos para la API", () => {
    for (const t of toolDefinitionsFor(profile("admin"))) {
      expect(t.input_schema.type).toBe("object");
      expect(t.input_schema).not.toHaveProperty("$schema");
    }
  });

  it("revalida el permiso al ejecutar, aunque el modelo pida una herramienta que no le ofrecimos", async () => {
    const out = await runTool(ctx("marketing_admin"), "ver_finanzas", {});
    expect(out.isError).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it("rechaza herramientas inexistentes e inputs inválidos sin tocar la base", async () => {
    expect((await runTool(ctx("admin"), "drop_table", {})).isError).toBe(true);
    const bad = await runTool(ctx("admin"), "ver_cliente", { client_id: "no-es-uuid" });
    expect(bad.isError).toBe(true);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it("toda escritura exitosa queda en el audit log como ai.<herramienta>", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "task-1" });
    const out = await runTool(ctx("admin"), "crear_tarea", { title: "Llamar al cliente" });
    expect(out.isError).toBe(false);
    expect(recordAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "ai.crear_tarea", actorId: "admin-1" }));
  });

  it("listar_tareas sin tasks.manage solo ve las propias", async () => {
    await runTool(ctx("marketing_admin"), "listar_tareas", { asignado_a: "99999999-9999-4999-8999-999999999999" });
    expect(queryMock.mock.calls[0][1][0]).toBe("marketing_admin-1");
  });
});
