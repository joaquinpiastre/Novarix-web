import { query } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { Card, CardTitle } from "@/components/ui/Card";
import type { Profile } from "@/lib/types/domain";
import { NewUserForm } from "./NewUserForm";
import { UsersListClient } from "./UsersListClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { profile } = await getSessionProfile();
  const isFullAdmin = can(profile, "users.manage");

  // Los usuarios de portal (role = 'client') no son "equipo" -- se gestionan
  // desde la ficha del cliente, no acá.
  const profiles = isFullAdmin
    ? await query<Profile>(
        `select id, email, full_name, role, created_at, must_change_password, totp_enabled, client_id
         from profiles where role != 'client' order by created_at desc`
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Usuarios</h1>
        <p className="text-sm text-text-muted">
          {isFullAdmin ? "Alta de programadores y marketing." : "Alta de cuentas de marketing."}
        </p>
      </div>

      <NewUserForm isFullAdmin={isFullAdmin} />

      {isFullAdmin && (
        <Card>
          <CardTitle>Equipo</CardTitle>
          <UsersListClient profiles={profiles} />
        </Card>
      )}
    </div>
  );
}
