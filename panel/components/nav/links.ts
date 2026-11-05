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
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** null = visible para cualquier perfil autenticado. */
  permission: Permission | null;
}

export const NAV_LINKS: NavLink[] = [
  {
    href: "/dashboard",
    label: "Resumen",
    icon: LayoutDashboard,
    permission: null,
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
    permission: "users.manage",
  },
  {
    href: "/account",
    label: "Mi cuenta",
    icon: Settings,
    permission: null,
  },
];

export function navLinksFor(profile: Profile): NavLink[] {
  return NAV_LINKS.filter((link) => link.permission === null || can(profile, link.permission));
}
