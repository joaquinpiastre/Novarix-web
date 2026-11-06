import { query } from "@/lib/db";
import { ClientsListClient } from "./ClientsListClient";
import type { Client } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export interface ClientRow extends Client {
  active_services_count: number;
}

export default async function ClientsPage() {
  const clients = await query<ClientRow>(
    `select c.*,
            (select count(*) from client_services cs where cs.client_id = c.id and cs.status = 'active') as active_services_count
     from clients c
     order by c.name`
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Clientes</h1>
        <p className="text-sm text-text-muted">Todos los clientes de la agencia, activos y pasados.</p>
      </div>
      <ClientsListClient clients={clients} />
    </div>
  );
}
