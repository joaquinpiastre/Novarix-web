import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import type { Profile } from "@/lib/types/domain";
import { NewUserForm } from "./NewUserForm";
import { UsersListClient } from "./UsersListClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const profiles = await query<Profile>(
    "select id, email, full_name, role, created_at from profiles order by created_at desc"
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Usuarios</h1>
        <p className="text-sm text-text-muted">Alta de programadores y marketing.</p>
      </div>

      <NewUserForm />

      <Card>
        <CardTitle>Equipo</CardTitle>
        <UsersListClient profiles={profiles} />
      </Card>
    </div>
  );
}
