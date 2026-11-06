import Link from "next/link";
import { requireClient } from "@/lib/auth/requireClient";
import { getContractedCategories } from "@/lib/portal/queries";
import { query, queryOne } from "@/lib/db";
import { stopClientPreview } from "../../(app)/clients/actions";
import { LogoMark, LogoWordmark } from "@/components/Logo";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOut } from "../../(app)/actions";
import { ChangePasswordForm } from "../../(app)/account/ChangePasswordForm";
import type { Client } from "@/lib/types/domain";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const access = await requireClient();
  const { profile, clientId, isAdminPreview } = access;

  if (profile.must_change_password && !isAdminPreview) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardTitle>Tenés que cambiar tu contraseña</CardTitle>
          <p className="mt-2 text-sm text-text-muted">
            Por seguridad, antes de seguir tenés que poner una contraseña nueva.
          </p>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
    );
  }

  const [client, categories, pendingCount, openTickets] = await Promise.all([
    queryOne<Client>("select * from clients where id = $1", [clientId]),
    getContractedCategories(clientId),
    query("select 1 from content_items where client_id = $1 and status = 'aprobacion_cliente'", [clientId]),
    query("select 1 from support_tickets where client_id = $1 and status not in ('resuelto','cerrado')", [
      clientId,
    ]),
  ]);

  const hasMarketing = categories.has("Marketing");
  const hasProjects = categories.has("Desarrollo") || categories.has("IA");

  const links: { href: string; label: string; badge: number }[] = [
    { href: "/portal", label: "Inicio", badge: 0 },
    ...(hasMarketing ? [{ href: "/portal/content", label: "Marketing", badge: pendingCount.length }] : []),
    ...(hasMarketing ? [{ href: "/portal/metrics", label: "Métricas", badge: 0 }] : []),
    ...(hasProjects ? [{ href: "/portal/projects", label: "Proyectos", badge: 0 }] : []),
    { href: "/portal/tickets", label: "Tickets", badge: openTickets.length },
    { href: "/portal/reports", label: "Reportes", badge: 0 },
    { href: "/portal/files", label: "Archivos", badge: 0 },
    { href: "/portal/payments", label: "Facturación", badge: 0 },
    { href: "/portal/team", label: "Mi equipo", badge: 0 },
    { href: "/portal/account", label: "Mi cuenta", badge: 0 },
    { href: "/portal/help", label: "Ayuda", badge: 0 },
  ];

  return (
    <div className="min-h-screen">
      {isAdminPreview && (
        <div className="flex items-center justify-between gap-3 bg-accent px-4 py-2 text-sm text-white">
          <span>Estás viendo el portal como <strong>{client?.name}</strong> (solo lectura).</span>
          <form action={stopClientPreview}>
            <button type="submit" className="underline">
              Salir
            </button>
          </form>
        </div>
      )}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark size={28} />
            <div>
              <p className="text-sm font-semibold">
                <LogoWordmark /> · Portal
              </p>
              <p className="text-xs text-text-muted">{client?.name}</p>
            </div>
          </div>
          {!isAdminPreview && (
            <form action={signOut}>
              <button type="submit" className="text-sm text-text-muted hover:text-danger">
                Cerrar sesión
              </button>
            </form>
          )}
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              {l.label}
              {l.badge > 0 && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
