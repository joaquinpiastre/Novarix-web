import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { canAccessTicket } from "@/lib/tickets/authorize";
import { can } from "@/lib/auth/permissions";
import { query, queryOne } from "@/lib/db";
import type { SupportTicket, TicketAttachment, TicketEvent, TicketMessage } from "@/lib/types/domain";
import { TicketDetailClient } from "./TicketDetailClient";

export const dynamic = "force-dynamic";

export interface TicketMessageRow extends TicketMessage {
  author_name: string;
  attachments: TicketAttachment[];
}

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const { userId, profile } = await getSessionProfile();

  const ticket = await queryOne<SupportTicket & { client_name: string }>(
    `select t.*, c.name as client_name from support_tickets t join clients c on c.id = t.client_id where t.id = $1`,
    [params.id]
  );
  if (!ticket) notFound();

  const allowed = await canAccessTicket(profile, userId, ticket.client_id, ticket.assigned_to);
  if (!allowed) notFound();

  const [messages, attachments, events, assignable, projects, services] = await Promise.all([
    query<TicketMessage & { author_name: string }>(
      `select tm.*, p.full_name as author_name from ticket_messages tm
       join profiles p on p.id = tm.author_id
       where tm.ticket_id = $1 order by tm.created_at asc`,
      [params.id]
    ),
    query<TicketAttachment>(
      "select * from ticket_attachments where ticket_id = $1 order by created_at",
      [params.id]
    ),
    query<TicketEvent & { actor_name: string | null }>(
      `select te.*, p.full_name as actor_name from ticket_events te
       left join profiles p on p.id = te.actor_id
       where te.ticket_id = $1 order by te.created_at desc`,
      [params.id]
    ),
    query<{ id: string; full_name: string }>(
      `select distinct p.id, p.full_name from client_team ct join profiles p on p.id = ct.profile_id
       where ct.client_id = $1
       union
       select id, full_name from profiles where role in ('admin', 'marketing_admin')
       order by full_name`,
      [ticket.client_id]
    ),
    query<{ id: string; name: string }>("select id, name from projects where client_id = $1", [ticket.client_id]),
    query<{ id: string; name: string }>(
      `select cs.id, sc.name from client_services cs join services_catalog sc on sc.id = cs.service_id
       where cs.client_id = $1 and cs.status = 'active'`,
      [ticket.client_id]
    ),
  ]);

  const attachmentsByMessage = new Map<string | null, TicketAttachment[]>();
  for (const a of attachments) {
    const list = attachmentsByMessage.get(a.message_id) ?? [];
    list.push(a);
    attachmentsByMessage.set(a.message_id, list);
  }

  const messageRows: TicketMessageRow[] = messages.map((m) => ({
    ...m,
    attachments: attachmentsByMessage.get(m.id) ?? [],
  }));

  return (
    <TicketDetailClient
      ticket={ticket}
      messages={messageRows}
      events={events}
      assignable={assignable}
      projects={projects}
      services={services}
      currentUserId={userId}
      canUseAi={can(profile, "ai.use")}
    />
  );
}
