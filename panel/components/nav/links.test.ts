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
    email_notifications: true,
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
      "/calendar",
      "/assistant",
      "/systems",
      "/payments/out",
      "/payments/in",
      "/finance",
      "/tickets",
      "/tasks",
      "/reminders",
      "/admin/users",
      "/account",
    ]);
  });

  it("programmer ve ademas /systems y /tickets (gestiona proyectos, activos tecnicos y soporte de sus clientes)", () => {
    expect(hrefs(profile("programmer"))).toEqual([
      "/dashboard",
      "/systems",
      "/payments/out",
      "/tickets",
      "/tasks",
      "/account",
    ]);
  });

  it("marketing ve clientes y su calendario (filtrado a lo suyo en la página), sin IA ni cobros/pagos de otros", () => {
    expect(hrefs(profile("marketing"))).toEqual([
      "/dashboard",
      "/clients",
      "/calendar",
      "/payments/out",
      "/tickets",
      "/tasks",
      "/account",
    ]);
  });

  it("marketing_admin ve clientes, marketing, calendario, IA y usuarios (para altas de marketing), no cobros/pagos", () => {
    expect(hrefs(profile("marketing_admin"))).toEqual([
      "/dashboard",
      "/clients",
      "/marketing",
      "/calendar",
      "/assistant",
      "/payments/out",
      "/tickets",
      "/tasks",
      "/admin/users",
      "/account",
    ]);
  });
});
