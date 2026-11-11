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
  TrendingUp,
  Wrench,
  PiggyBank,
  Ticket,
  CalendarDays,
  Sparkles,
  Radar,
  Lightbulb,
  Gauge,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** null = visible para cualquier perfil autenticado; un array = alcanza con tener cualquiera de esos permisos. */
  permission: Permission | Permission[] | null;
  /** Chequeo extra, ademas del permiso (ej: "marketing" ve /clients aunque no tenga clients.manage, filtrado a lo suyo en la pagina). */
  extraCheck?: (profile: Profile) => boolean;
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
    extraCheck: (profile) => profile.role === "marketing",
  },
  {
    href: "/marketing",
    label: "Marketing",
    icon: TrendingUp,
    permission: "marketing.view_all",
  },
  {
    href: "/calendar",
    label: "Calendario",
    icon: CalendarDays,
    permission: "marketing.view_all",
    // marketing (no admin) ve solo lo que tiene delegado, en modo lectura.
    extraCheck: (profile) => profile.role === "marketing",
  },
  {
    href: "/marketing/radar",
    label: "Radar viral",
    icon: Radar,
    // marketing lo ve acotado a sus clientes asignados (lib/trends/access.ts).
    permission: "trends.use",
  },
  {
    href: "/marketing/ideas",
    label: "Ideas",
    icon: Lightbulb,
    permission: "trends.use",
  },
  {
    href: "/assistant",
    label: "Asistente IA",
    icon: Sparkles,
    permission: "ai.use",
  },
  {
    href: "/systems",
    label: "Sistemas",
    icon: Wrench,
    permission: "systems.manage",
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
    href: "/finance",
    label: "Finanzas",
    icon: PiggyBank,
    permission: "payments_in.manage",
  },
  {
    href: "/tickets",
    label: "Tickets",
    icon: Ticket,
    permission: null,
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
    href: "/admin/consumo",
    label: "Consumo IA",
    icon: Gauge,
    permission: "usage.view",
  },
  {
    href: "/account",
    label: "Mi cuenta",
    icon: Settings,
    permission: null,
  },
];

function hasPermission(profile: Profile, permission: NavLink["permission"]): boolean {
  if (permission === null) return true;
  if (Array.isArray(permission)) return permission.some((p) => can(profile, p));
  return can(profile, permission);
}

export function navLinksFor(profile: Profile): NavLink[] {
  return NAV_LINKS.filter(
    (link) => hasPermission(profile, link.permission) || link.extraCheck?.(profile)
  );
}
