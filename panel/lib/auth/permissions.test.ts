import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  can,
  scopeClientsFor,
  scopePaymentsOutFor,
  scopeTasksFor,
  type Permission,
} from "./permissions";
import type { Profile, UserRole } from "@/lib/types/domain";

function profile(role: UserRole, id = "user-1"): Profile {
  return {
    id,
    email: `${role}@novarix.test`,
    full_name: role,
    role,
    created_at: new Date().toISOString(),
    must_change_password: false,
    totp_enabled: false,
    client_id: role === "client" ? "some-client-id" : null,
  };
}

const admin = profile("admin", "admin-1");
const programmer = profile("programmer", "prog-1");
const marketing = profile("marketing", "mkt-1");
const marketingAdmin = profile("marketing_admin", "mktadmin-1");
const clientUser = profile("client", "client-1");

type Row = {
  admin: boolean;
  programmer: boolean;
  marketing: boolean;
  marketing_admin: boolean;
  client: boolean;
};

// Matriz exhaustiva: una fila por permiso, con el resultado esperado para
// cada rol (sin resource). Si se agrega un Permission nuevo a ALL_PERMISSIONS
// sin agregar su fila acá, el test de "cobertura" de más abajo falla.
const MATRIX: Record<Permission, Row> = {
  "dashboard.view_all": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "payments_out.view_all": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "payments_out.manage": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "clients.manage": { admin: true, programmer: false, marketing: false, marketing_admin: true, client: false },
  "client_services.manage": { admin: true, programmer: false, marketing: false, marketing_admin: true, client: false },
  "client_team.manage": { admin: true, programmer: false, marketing: false, marketing_admin: true, client: false },
  "payments_in.manage": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "tasks.manage": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "tasks.update_status": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "reminders.manage": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "users.manage": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "users.create_marketing": { admin: true, programmer: false, marketing: false, marketing_admin: true, client: false },
  "audit_log.view": { admin: true, programmer: false, marketing: false, marketing_admin: false, client: false },
  "marketing.view_all": { admin: true, programmer: false, marketing: false, marketing_admin: true, client: false },
};

describe("can() — matriz rol x permiso (sin resource)", () => {
  for (const [permission, expected] of Object.entries(MATRIX) as [Permission, Row][]) {
    it(`${permission}`, () => {
      expect(can(admin, permission)).toBe(expected.admin);
      expect(can(programmer, permission)).toBe(expected.programmer);
      expect(can(marketing, permission)).toBe(expected.marketing);
      expect(can(marketingAdmin, permission)).toBe(expected.marketing_admin);
      expect(can(clientUser, permission)).toBe(expected.client);
    });
  }
});

describe("cobertura: todo permiso declarado tiene un caso de test", () => {
  it("MATRIX cubre exactamente ALL_PERMISSIONS", () => {
    const tested = new Set(Object.keys(MATRIX));
    const declared = new Set(ALL_PERMISSIONS);
    expect(tested).toEqual(declared);
  });
});

describe("tasks.update_status — permiso resource-aware", () => {
  it("admin puede cambiar el estado de cualquier tarea, incluso sin resource", () => {
    expect(can(admin, "tasks.update_status")).toBe(true);
  });

  it("un colaborador puede cambiar el estado de una tarea asignada a él mismo", () => {
    expect(can(programmer, "tasks.update_status", { assigned_to: programmer.id })).toBe(true);
  });

  it("un colaborador NO puede cambiar el estado de una tarea de otro", () => {
    expect(can(programmer, "tasks.update_status", { assigned_to: marketing.id })).toBe(false);
  });

  it("un colaborador NO puede cambiar el estado de una tarea sin asignar (así funciona hoy)", () => {
    expect(can(programmer, "tasks.update_status", { assigned_to: null })).toBe(false);
  });

  it("un usuario de portal NO puede cambiar el estado de ninguna tarea", () => {
    expect(can(clientUser, "tasks.update_status", { assigned_to: clientUser.id })).toBe(false);
  });
});

describe("helpers de scope", () => {
  it("scopePaymentsOutFor: all=true solo para admin", () => {
    expect(scopePaymentsOutFor(admin).all).toBe(true);
    expect(scopePaymentsOutFor(programmer).all).toBe(false);
    expect(scopePaymentsOutFor(marketing).all).toBe(false);
  });

  it("scopeTasksFor: all=true solo para admin", () => {
    expect(scopeTasksFor(admin).all).toBe(true);
    expect(scopeTasksFor(programmer).all).toBe(false);
  });

  it("scopeClientsFor: all=true para admin y marketing_admin", () => {
    expect(scopeClientsFor(admin).all).toBe(true);
    expect(scopeClientsFor(marketingAdmin).all).toBe(true);
    expect(scopeClientsFor(marketing).all).toBe(false);
    expect(scopeClientsFor(programmer).all).toBe(false);
    expect(scopeClientsFor(clientUser).all).toBe(false);
  });
});
