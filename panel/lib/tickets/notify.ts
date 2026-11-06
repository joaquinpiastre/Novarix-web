import "server-only";
import { query } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notifications/create";

export async function notifyNewTicket(
  ticketId: string,
  assignedTo: string | null,
  number: string,
  title: string
): Promise<void> {
  const link = `/tickets/${ticketId}`;
  const admins = await query<{ id: string }>(
    "select id from profiles where role in ('admin', 'marketing_admin')"
  );
  const recipients = new Set(admins.map((a) => a.id));
  if (assignedTo) recipients.add(assignedTo);
  await notifyMany(Array.from(recipients), "ticket_new", `Nuevo ticket ${number}`, title, link);
}

export async function notifyClientOfReply(clientId: string, ticketId: string, number: string): Promise<void> {
  const users = await query<{ profile_id: string }>(
    "select profile_id from client_users where client_id = $1 and active = true",
    [clientId]
  );
  await notifyMany(
    users.map((u) => u.profile_id),
    "ticket_reply",
    `Nueva respuesta en ${number}`,
    undefined,
    `/portal/tickets/${ticketId}`
  );
}

export async function notifyTeamOfClientReply(
  clientId: string,
  assignedTo: string | null,
  ticketId: string,
  number: string
): Promise<void> {
  const link = `/tickets/${ticketId}`;
  if (assignedTo) {
    await notify(assignedTo, "ticket_client_reply", `El cliente respondió en ${number}`, undefined, link);
    return;
  }
  const team = await query<{ profile_id: string }>(
    "select profile_id from client_team where client_id = $1",
    [clientId]
  );
  await notifyMany(team.map((t) => t.profile_id), "ticket_client_reply", `El cliente respondió en ${number}`, undefined, link);
}

export async function notifyClientOfStatusChange(
  clientId: string,
  ticketId: string,
  number: string,
  statusLabel: string
): Promise<void> {
  const users = await query<{ profile_id: string }>(
    "select profile_id from client_users where client_id = $1 and active = true",
    [clientId]
  );
  await notifyMany(
    users.map((u) => u.profile_id),
    "ticket_status",
    `${number} ahora está "${statusLabel}"`,
    undefined,
    `/portal/tickets/${ticketId}`
  );
}
