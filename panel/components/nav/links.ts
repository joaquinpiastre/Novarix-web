import type { UserRole } from "@/lib/types/domain";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckSquare,
  Bell,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_LINKS: NavLink[] = [
  {
    href: "/dashboard",
    label: "Resumen",
    icon: LayoutDashboard,
    roles: ["admin", "programmer", "marketing"],
  },
  {
    href: "/payments/out",
    label: "Pagos a equipo",
    icon: ArrowDownCircle,
    roles: ["admin", "programmer", "marketing"],
  },
  {
    href: "/payments/in",
    label: "Cobros a clientes",
    icon: ArrowUpCircle,
    roles: ["admin"],
  },
  {
    href: "/tasks",
    label: "Tareas",
    icon: CheckSquare,
    roles: ["admin", "programmer", "marketing"],
  },
  {
    href: "/reminders",
    label: "Recordatorios",
    icon: Bell,
    roles: ["admin"],
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    icon: Users,
    roles: ["admin"],
  },
];

export function navLinksForRole(role: UserRole): NavLink[] {
  return NAV_LINKS.filter((link) => link.roles.includes(role));
}
