import { describe, expect, it } from "vitest";
import { navLinksFor } from "./links";
import type { Profile, UserRole } from "@/lib/types/domain";

function profile(role: UserRole): Profile {
  return {
    id: "user-1",
    email: `${role}@novarix.test`,
    full_name: role,
    role,
    created_at: new Date().toISOString(),
    must_change_password: false,
    totp_enabled: false,
    client_id: null,
  };
}

function hrefs(profileArg: Profile): string[] {
  return navLinksFor(profileArg).map((l) => l.href);
}

describe("navLinksFor", () => {
  it("admin ve todos los módulos", () => {
    expect(hrefs(profile("admin"))).toEqual([
      "/dashboard",
      "/clients",
      "/marketing",
      "/systems",
      "/payments/out",
      "/payments/in",
      "/tasks",
      "/reminders",
      "/admin/users",
      "/account",
    ]);
  });

  it("programmer ve ademas /systems (gestiona proyectos y activos tecnicos)", () => {
    expect(hrefs(profile("programmer"))).toEqual([
      "/dashboard",
      "/systems",
      "/payments/out",
      "/tasks",
      "/account",
    ]);
  });

  it("marketing ve clientes (filtrado a los suyos en la página) pero no cobros/pagos de otros", () => {
    expect(hrefs(profile("marketing"))).toEqual([
      "/dashboard",
      "/clients",
      "/payments/out",
      "/tasks",
      "/account",
    ]);
  });

  it("marketing_admin ve clientes, marketing y usuarios (para altas de marketing), no cobros/pagos", () => {
    expect(hrefs(profile("marketing_admin"))).toEqual([
      "/dashboard",
      "/clients",
      "/marketing",
      "/payments/out",
      "/tasks",
      "/admin/users",
      "/account",
    ]);
  });
});
