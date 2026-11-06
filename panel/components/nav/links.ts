import { can, type Permission } from "@/lib/auth/permissions";
import type { Profile } from "@/lib/types/domain";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckSquare,
  Bell,
  Users,
  Settings,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** null = visible para cualquier perfil autenticado; un array = alcanza con tener cualquiera de esos permisos. */
  permission: Permission | Permission[] | null;
}

export const NAV_LINKS: NavLink[] = [
  {
    href: "/dashboard",
    label: "Resumen",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    href: "/clients",
    label: "Clientes",
    icon: Building2,
    permission: "clients.manage",
  },
  {
    href: "/payments/out",
    label: "Pagos a equipo",
    icon: ArrowDownCircle,
    permission: null,
  },
  {
    href: "/payments/in",
    label: "Cobros a clientes",
    icon: ArrowUpCircle,
    permission: "payments_in.manage",
  },
  {
    href: "/tasks",
    label: "Tareas",
    icon: CheckSquare,
    permission: null,
  },
  {
    href: "/reminders",
    label: "Recordatorios",
    icon: Bell,
    permission: "reminders.manage",
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    icon: Users,
    permission: ["users.manage", "users.create_marketing"],
  },
  {
    href: "/account",
    label: "Mi cuenta",
    icon: Settings,
    permission: null,
  },
];

function hasAccess(profile: Profile, permission: NavLink["permission"]): boolean {
  if (permission === null) return true;
  if (Array.isArray(permission)) return permission.some((p) => can(profile, p));
  return can(profile, permission);
}

export function navLinksFor(profile: Profile): NavLink[] {
  return NAV_LINKS.filter((link) => hasAccess(profile, link.permission));
}
