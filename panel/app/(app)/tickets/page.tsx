import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { scopeTicketsFor } from "@/lib/auth/permissions";
import { query } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import {
  OPEN_TICKET_STATUSES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from "@/lib/types/domain";
import { TicketFilters } from "./TicketFilters";

export const dynamic = "force-dynamic";

interface TicketRow {
  id: string;
  number: string;
  title: string;
  client_id: string;
  client_name: string;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  sla_due_at: string | null;
  first_response_at: string | null;
}

export default async function TicketsInboxPage({
  searchParams,
}: {
  searchParams: { client?: string; status?: string; type?: string; priority?: string; overdue?: string };
}) {
  const { userId, profile } = await getSessionProfile();
  const scope = scopeTicketsFor(profile);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!scope.all) {
    params.push(userId);
    conditions.push(
      `(t.assigned_to = $${params.length} or t.client_id in (select client_id from client_team where profile_id = $${params.length}))`
    );
  }
  if (searchParams.client) {
    params.push(searchParams.client);
    conditions.push(`t.client_id = $${params.length}`);
  }
  if (searchParams.status) {
    params.push(searchParams.status);
    conditions.push(`t.status = $${params.length}`);
  } else {
    conditions.push(`t.status not in ('resuelto', 'cerrado')`);
  }
  if (searchParams.type) {
    params.push(searchParams.type);
    conditions.push(`t.ticket_type = $${params.length}`);
  }
  if (searchParams.priority) {
    params.push(searchParams.priority);
    conditions.push(`t.priority = $${params.length}`);
  }
  if (searchParams.overdue === "true") {
    conditions.push(`t.sla_due_at is not null and t.sla_due_at < now() and t.first_response_at is null`);
  }

  const where = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

  const tickets = await query<TicketRow>(
    `select t.id, t.number, t.title, t.client_id, c.name as client_name, t.ticket_type, t.status,
            t.priority, t.assigned_to, p.full_name as assignee_name, t.created_at, t.sla_due_at, t.first_response_at
     from support_tickets t
     join clients c on c.id = t.client_id
     left join profiles p on p.id = t.assigned_to
     ${where}
     order by t.priority = 'urgent' desc, t.priority = 'high' desc, t.created_at desc`,
    params
  );

  const clients = await query<{ id: string; name: string }>(
    "select id, name from clients order by name"
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Tickets</h1>
          <p className="text-sm text-text-muted">
            {scope.all ? "Todos los clientes." : "Solo tus clientes asignados."}
          </p>
        </div>
        {scope.all && (
          <Link href="/tickets/metrics" className="text-sm text-accent hover:underline">
            Ver métricas →
          </Link>
        )}
      </div>

      <TicketFilters clients={clients} current={searchParams} />

      <Card>
        {tickets.length === 0 ? (
          <p className="text-sm text-text-muted">No hay tickets con estos filtros.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => {
              const overdue = t.sla_due_at && !t.first_response_at && new Date(t.sla_due_at) < new Date();
              return (
                <li key={t.id} className="py-3">
                  <Link href={`/tickets/${t.id}`} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-text-muted">{t.number}</span>
                        <p className="text-sm font-medium text-text-primary">{t.title}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {t.client_name} · {TICKET_TYPE_LABELS[t.ticket_type]}
                        {t.assignee_name ? ` · ${t.assignee_name}` : " · Sin asignar"}
                        {" · "}
                        {formatDate(t.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {overdue && <Badge tone="danger">Vencido</Badge>}
                      <Badge tone={t.priority === "urgent" || t.priority === "high" ? "danger" : "neutral"}>
                        {TICKET_PRIORITY_LABELS[t.priority]}
                      </Badge>
                      <Badge tone={OPEN_TICKET_STATUSES.includes(t.status) ? "warning" : "success"}>
                        {TICKET_STATUS_LABELS[t.status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
