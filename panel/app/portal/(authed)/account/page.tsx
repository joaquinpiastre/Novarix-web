import { requireClient } from "@/lib/auth/requireClient";
import { queryOne } from "@/lib/db";
import { getCompanyUsers, getPendingInvites } from "@/lib/portal/queries";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CLIENT_PORTAL_ROLE_LABELS } from "@/lib/types/domain";
import { ChangePasswordForm } from "../../../(app)/account/ChangePasswordForm";
import { toggleEmailNotifications, signOutEverywhere } from "./actions";
import { CompanyUsersCard } from "./CompanyUsersCard";

export const dynamic = "force-dynamic";

export default async function PortalAccountPage() {
  const { userId, clientId, clientRole, profile } = await requireClient();

  const emailNotifications = await queryOne<{ email_notifications: boolean }>(
    "select email_notifications from profiles where id = $1",
    [userId]
  );

  const [companyUsers, pendingInvites] = await Promise.all([
    clientRole === "owner" ? getCompanyUsers(clientId) : Promise.resolve([]),
    clientRole === "owner" ? getPendingInvites(clientId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Mi cuenta</h1>
        <p className="text-sm text-text-muted">
          {profile.full_name} · <Badge tone="neutral">{CLIENT_PORTAL_ROLE_LABELS[clientRole]}</Badge>
        </p>
      </div>

      <Card className="max-w-lg">
        <CardTitle>Cambiar contraseña</CardTitle>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </Card>

      <Card className="max-w-lg">
        <CardTitle>Notificaciones</CardTitle>
        <form action={toggleEmailNotifications} className="mt-3 flex items-center justify-between">
          <input type="hidden" name="enabled" value={String(!emailNotifications?.email_notifications)} />
          <span className="text-sm text-text-primary">Recibir notificaciones por email</span>
          <button
            type="submit"
            className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs"
          >
            {emailNotifications?.email_notifications ? "Activadas" : "Desactivadas"}
          </button>
        </form>
      </Card>

      <Card className="max-w-lg">
        <CardTitle>Seguridad</CardTitle>
        <p className="mt-2 text-xs text-text-muted">
          Si crees que alguien más entró a tu cuenta, cerrá tus otras sesiones.
        </p>
        <form action={signOutEverywhere} className="mt-3">
          <button type="submit" className="text-sm text-danger hover:underline">
            Cerrar sesión en todos los otros dispositivos
          </button>
        </form>
      </Card>

      {clientRole === "owner" && (
        <CompanyUsersCard companyUsers={companyUsers} pendingInvites={pendingInvites} />
      )}
    </div>
  );
}
