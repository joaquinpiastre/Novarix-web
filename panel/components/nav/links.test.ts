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
  };
}

function hrefs(profileArg: Profile): string[] {
  return navLinksFor(profileArg).map((l) => l.href);
}

describe("navLinksFor", () => {
  it("admin ve los 6 módulos + Mi cuenta", () => {
    expect(hrefs(profile("admin"))).toEqual([
      "/dashboard",
      "/payments/out",
      "/payments/in",
      "/tasks",
      "/reminders",
      "/admin/users",
      "/account",
    ]);
  });

  it("programmer solo ve lo que no requiere permiso admin-only + Mi cuenta", () => {
    expect(hrefs(profile("programmer"))).toEqual([
      "/dashboard",
      "/payments/out",
      "/tasks",
      "/account",
    ]);
  });

  it("marketing ve lo mismo que programmer hoy", () => {
    expect(hrefs(profile("marketing"))).toEqual([
      "/dashboard",
      "/payments/out",
      "/tasks",
      "/account",
    ]);
  });
});
