import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth/requireClient";
import { query, queryOne } from "@/lib/db";
import type { SupportTicket, TicketAttachment, TicketMessage } from "@/lib/types/domain";
import { TicketThreadClient } from "./TicketThreadClient";

export const dynamic = "force-dynamic";

export interface ClientMessageRow extends TicketMessage {
  author_name: string;
  attachments: TicketAttachment[];
}

export default async function PortalTicketDetailPage({ params }: { params: { id: string } }) {
  const { clientId } = await requireClient();

  const ticket = await queryOne<SupportTicket>(
    "select * from support_tickets where id = $1 and client_id = $2",
    [params.id, clientId]
  );
  if (!ticket) notFound();

  const [messages, attachments] = await Promise.all([
    query<TicketMessage & { author_name: string }>(
      `select tm.*, p.full_name as author_name from ticket_messages tm
       join profiles p on p.id = tm.author_id
       where tm.ticket_id = $1 and tm.internal = false
       order by tm.created_at asc`,
      [params.id]
    ),
    query<TicketAttachment>(
      `select ta.* from ticket_attachments ta
       left join ticket_messages tm on tm.id = ta.message_id
       where ta.ticket_id = $1 and (tm.id is null or tm.internal = false)
       order by ta.created_at`,
      [params.id]
    ),
  ]);

  const attachmentsByMessage = new Map<string | null, TicketAttachment[]>();
  for (const a of attachments) {
    const list = attachmentsByMessage.get(a.message_id) ?? [];
    list.push(a);
    attachmentsByMessage.set(a.message_id, list);
  }

  const messageRows: ClientMessageRow[] = messages.map((m) => ({
    ...m,
    attachments: attachmentsByMessage.get(m.id) ?? [],
  }));

  return <TicketThreadClient ticket={ticket} messages={messageRows} />;
}
