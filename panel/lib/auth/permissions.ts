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
  | "client_services.manage"
  | "client_team.manage"
  | "payments_in.manage"
  | "tasks.manage"
  | "tasks.update_status"
  | "reminders.manage"
  | "users.manage"
  | "users.create_marketing"
  | "audit_log.view"
  | "marketing.view_all"
  | "systems.manage"
  | "tickets.manage_all";

// Lista explícita de todos los permisos que existen. Se usa en los tests
// para verificar que ninguno quede sin un caso que lo ejercite (ver
// permissions.test.ts) -- si agregás un Permission nuevo, agregalo acá y
// el test de cobertura te va a obligar a testearlo.
export const ALL_PERMISSIONS: Permission[] = [
  "dashboard.view_all",
  "payments_out.view_all",
  "payments_out.manage",
  "clients.manage",
  "client_services.manage",
  "client_team.manage",
  "payments_in.manage",
  "tasks.manage",
  "tasks.update_status",
  "reminders.manage",
  "users.manage",
  "users.create_marketing",
  "audit_log.view",
  "marketing.view_all",
  "systems.manage",
  "tickets.manage_all",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "dashboard.view_all",
    "payments_out.view_all",
    "payments_out.manage",
    "clients.manage",
    "client_services.manage",
    "client_team.manage",
    "payments_in.manage",
    "tasks.manage",
    "tasks.update_status",
    "reminders.manage",
    "users.manage",
    "users.create_marketing",
    "audit_log.view",
    "marketing.view_all",
    "systems.manage",
    "tickets.manage_all",
  ],
  // Ve y gestiona clientes/servicios/equipo y metricas de marketing de TODOS
  // los clientes, pero no sueldos, no cobros de software, no gestion de
  // usuarios en general (solo puede dar de alta cuentas de rol `marketing`).
  marketing_admin: [
    "clients.manage",
    "client_services.manage",
    "client_team.manage",
    "users.create_marketing",
    "marketing.view_all",
    "tickets.manage_all",
  ],
  // Gestiona proyectos y activos tecnicos de todos los clientes
  // (dominio/hosting/SSL, bots de GHL) -- es el area tecnica. Los tickets
  // los ve igual que marketing: solo los de sus clientes asignados (ver
  // scopeTicketsFor), por eso no tiene tickets.manage_all.
  programmer: ["systems.manage"],
  marketing: [],
  // No tiene ningun permiso interno -- su acceso es exclusivamente al
  // portal (/portal), gateado por requireClient(), no por esta matriz.
  client: [],
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
  if (permission === "tasks.update_status" && resource && profile.role !== "client") {
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

export function scopeTicketsFor(profile: Profile): Scope {
  return { all: can(profile, "tickets.manage_all") };
}
