import type { Profile, UserRole } from "@/lib/types/domain";

// OJO: este archivo no debe importar nada de next/headers (ni nada que lo
// importe transitivamente, como getSessionProfile.ts) -- lo usan tambien
// componentes de cliente (components/nav/links.ts). requirePermission()
// vive aparte, en requirePermission.ts, server-only.

// Matriz centralizada de permisos. Cualquier pantalla o server action nueva
// que toque datos sensibles tiene que pasar por can()/requirePermission() en
// vez de comparar profile.role a mano -- no hay RLS en la base, esto es toda
// la barrera de seguridad que hay.
export type Permission =
  | "dashboard.view_all"
  | "payments_out.view_all"
  | "payments_out.manage"
  | "clients.manage"
  | "payments_in.manage"
  | "tasks.manage"
  | "tasks.update_status"
  | "reminders.manage"
  | "users.manage"
  | "audit_log.view";

// Lista explícita de todos los permisos que existen. Se usa en los tests
// para verificar que ninguno quede sin un caso que lo ejercite (ver
// permissions.test.ts) -- si agregás un Permission nuevo, agregalo acá y
// el test de cobertura te va a obligar a testearlo.
export const ALL_PERMISSIONS: Permission[] = [
  "dashboard.view_all",
  "payments_out.view_all",
  "payments_out.manage",
  "clients.manage",
  "payments_in.manage",
  "tasks.manage",
  "tasks.update_status",
  "reminders.manage",
  "users.manage",
  "audit_log.view",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "dashboard.view_all",
    "payments_out.view_all",
    "payments_out.manage",
    "clients.manage",
    "payments_in.manage",
    "tasks.manage",
    "tasks.update_status",
    "reminders.manage",
    "users.manage",
    "audit_log.view",
  ],
  programmer: [],
  marketing: [],
};

export interface TaskLikeResource {
  assigned_to: string | null;
}

/**
 * `tasks.update_status` es el único permiso "resource-aware": un perfil sin
 * el permiso general igual puede marcar el estado de una tarea asignada a
 * él mismo. Sin `resource`, solo da true para quien tiene el permiso general
 * (admin hoy).
 */
export function can(
  profile: Profile,
  permission: Permission,
  resource?: TaskLikeResource
): boolean {
  if (ROLE_PERMISSIONS[profile.role].includes(permission)) return true;
  if (permission === "tasks.update_status" && resource) {
    return resource.assigned_to === profile.id;
  }
  return false;
}

export interface Scope {
  /** true = sin filtro (ve/gestiona todo); false = hay que filtrar por el usuario actual. */
  all: boolean;
}

export function scopePaymentsOutFor(profile: Profile): Scope {
  return { all: can(profile, "payments_out.view_all") };
}

export function scopeTasksFor(profile: Profile): Scope {
  return { all: can(profile, "tasks.manage") };
}

export function scopeClientsFor(profile: Profile): Scope {
  return { all: can(profile, "clients.manage") };
}
