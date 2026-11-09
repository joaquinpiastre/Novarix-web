import { requireClient } from "@/lib/auth/requireClient";
import { getContractedServices, getProjects } from "@/lib/portal/queries";
import { query } from "@/lib/db";
import type { SupportTicket } from "@/lib/types/domain";
import { TicketsListClient } from "./TicketsListClient";

export const dynamic = "force-dynamic";

export default async function PortalTicketsPage() {
  const { clientId } = await requireClient();

  const [tickets, services, projects] = await Promise.all([
    query<SupportTicket>(
      "select * from support_tickets where client_id = $1 order by status in ('resuelto','cerrado'), created_at desc",
      [clientId]
    ),
    getContractedServices(clientId),
    getProjects(clientId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Tickets</h1>
        <p className="text-sm text-text-muted">Reclamos, pedidos, soporte técnico, consultas y facturación.</p>
      </div>
      <TicketsListClient
        tickets={tickets}
        services={services.map((s) => ({ id: s.service_id, name: s.name }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
