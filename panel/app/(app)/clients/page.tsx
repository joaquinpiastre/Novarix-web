import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { query } from "@/lib/db";
import { ClientsListClient } from "./ClientsListClient";
import type { Client } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export interface ClientRow extends Client {
  active_services_count: number;
}

export default async function ClientsPage() {
  const { userId, profile } = await getSessionProfile();
  const seesAll = can(profile, "clients.manage");

  if (!seesAll && profile.role !== "marketing") redirect("/dashboard");

  const clients = seesAll
    ? await query<ClientRow>(
        `select c.*,
                (select count(*) from client_services cs where cs.client_id = c.id and cs.status = 'active') as active_services_count
         from clients c
         order by c.name`
      )
    : await query<ClientRow>(
        `select c.*,
                (select count(*) from client_services cs where cs.client_id = c.id and cs.status = 'active') as active_services_count
         from clients c
         join client_team ct on ct.client_id = c.id
         where ct.profile_id = $1
         order by c.name`,
        [userId]
      );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Clientes</h1>
        <p className="text-sm text-text-muted">
          {seesAll ? "Todos los clientes de la agencia." : "Los clientes que tenés asignados."}
        </p>
      </div>
      <ClientsListClient clients={clients} canCreate={seesAll} />
    </div>
  );
}
