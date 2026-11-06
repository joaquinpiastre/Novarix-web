import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { query } from "@/lib/db";
import { Sidebar } from "@/components/nav/Sidebar";
import { MobileNav } from "@/components/nav/MobileNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { CommandPalette } from "@/components/search/CommandPalette";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { NotificationRow } from "@/lib/types/domain";
import { ChangePasswordForm } from "./account/ChangePasswordForm";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();

  // Los usuarios de portal tienen su propio layout, separado del interno.
  if (profile.role === "client") redirect("/portal");

  // Fuerza el cambio de contraseña (cuenta nueva con contraseña temporal, o
  // reseteo hecho por un admin) antes de dejar ver cualquier otra pantalla,
  // sin importar que URL se haya pedido. No se toca middleware.ts porque no
  // puede validar la sesion contra la base (ver getSessionProfile.ts).
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

  const notifications = await query<NotificationRow>(
    "select * from notifications where profile_id = $1 order by created_at desc limit 15",
    [profile.id]
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} signOut={signOut} />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <div className="flex justify-end border-b border-border px-4 py-2 sm:px-6 lg:px-10">
          <NotificationBell notifications={notifications} />
        </div>
        <main className="flex-1 px-4 pb-20 pt-6 sm:px-6 md:pb-6 lg:px-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav profile={profile} />
      <CommandPalette />
    </div>
  );
}
