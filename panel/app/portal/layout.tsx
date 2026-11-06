import Link from "next/link";
import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { query, queryOne } from "@/lib/db";
import { LogoMark, LogoWordmark } from "@/components/Logo";
import { Card, CardTitle } from "@/components/ui/Card";
import { signOut } from "../(app)/actions";
import { ChangePasswordForm } from "../(app)/account/ChangePasswordForm";
import type { Client } from "@/lib/types/domain";

const PORTAL_LINKS = [
  { href: "/portal", label: "Resumen" },
  { href: "/portal/content", label: "Contenido" },
  { href: "/portal/metrics", label: "Métricas" },
  { href: "/portal/payments", label: "Pagos" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, clientId } = await requirePortalAccess();

  if (profile.must_change_password) {
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

  const client = await queryOne<Client>("select * from clients where id = $1", [clientId]);
  const pendingCount = await query(
    "select 1 from content_items where client_id = $1 and status = 'aprobacion_cliente'",
    [clientId]
  );

  return (
    <div className="min-h-screen">
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
          <form action={signOut}>
            <button type="submit" className="text-sm text-text-muted hover:text-danger">
              Cerrar sesión
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {PORTAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              {l.label}
              {l.href === "/portal/content" && pendingCount.length > 0 && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {pendingCount.length}
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
