"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { canAccessTicket } from "@/lib/tickets/authorize";
import { validateUpload } from "@/lib/storage/uploadLimits";
import { buildStorageKey, uploadObject } from "@/lib/storage/s3";
import { notifyClientOfReply, notifyClientOfStatusChange } from "@/lib/tickets/notify";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import {
  TICKET_STATUS_LABELS,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

async function loadTicketOrThrow(ticketId: string) {
  const { userId, profile } = await getSessionProfile();
  const ticket = await queryOne<{ client_id: string; assigned_to: string | null; number: string }>(
    "select client_id, assigned_to, number from support_tickets where id = $1",
    [ticketId]
  );
  if (!ticket) throw new Error("Ticket no encontrado.");
  const allowed = await canAccessTicket(profile, userId, ticket.client_id, ticket.assigned_to);
  if (!allowed) throw new Error("No autorizado.");
  return { userId, profile, ticket };
}

export async function assignTicket(formData: FormData): Promise<void> {
  const ticketId = String(formData.get("ticket_id") ?? "");
  const assignedTo = String(formData.get("assigned_to") ?? "") || null;
  const { userId: actorId, ticket } = await loadTicketOrThrow(ticketId);

  await query("update support_tickets set assigned_to = $1 where id = $2", [assignedTo, ticketId]);
  await query(
    `insert into ticket_events (ticket_id, actor_id, event_type, from_value, to_value)
     values ($1,$2,'assign',$3,$4)`,
    [ticketId, actorId, ticket.assigned_to, assignedTo]
  );

  await recordAudit({
    actorId,
    action: "tickets.assign",
    entityType: "support_ticket",
    entityId: ticketId,
    after: { assignedTo },
    ip: getClientIp(),
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
}

export async function updateTicketStatus(formData: FormData): Promise<void> {
  const ticketId = String(formData.get("ticket_id") ?? "");
  const status = String(formData.get("status") ?? "") as TicketStatus;
  const { userId: actorId, ticket } = await loadTicketOrThrow(ticketId);
  if (!status) return;

  const current = await queryOne<{ status: TicketStatus }>(
    "select status from support_tickets where id = $1",
    [ticketId]
  );
  const resolving = status === "resuelto" || status === "cerrado";

  await query(
    `update support_tickets set status = $1${resolving ? ", resolved_at = coalesce(resolved_at, now())" : ""}
     where id = $2`,
    [status, ticketId]
  );
  await query(
    `insert into ticket_events (ticket_id, actor_id, event_type, from_value, to_value)
     values ($1,$2,'status',$3,$4)`,
    [ticketId, actorId, current?.status ?? null, status]
  );

  await notifyClientOfStatusChange(ticket.client_id, ticketId, ticket.number, TICKET_STATUS_LABELS[status]);

  await recordAudit({
    actorId,
    action: "tickets.update_status",
    entityType: "support_ticket",
    entityId: ticketId,
    after: { status },
    ip: getClientIp(),
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
}

export async function updateTicketPriority(formData: FormData): Promise<void> {
  const ticketId = String(formData.get("ticket_id") ?? "");
  const priority = String(formData.get("priority") ?? "") as TicketPriority;
  const { userId: actorId, ticket } = await loadTicketOrThrow(ticketId);
  if (!priority) return;

  const current = await queryOne<{ priority: TicketPriority }>(
    "select priority from support_tickets where id = $1",
    [ticketId]
  );
  await query("update support_tickets set priority = $1 where id = $2", [priority, ticketId]);
  await query(
    `insert into ticket_events (ticket_id, actor_id, event_type, from_value, to_value)
     values ($1,$2,'priority',$3,$4)`,
    [ticketId, actorId, current?.priority ?? null, priority]
  );

  await recordAudit({
    actorId,
    action: "tickets.update_priority",
    entityType: "support_ticket",
    entityId: ticketId,
    after: { priority },
    ip: getClientIp(),
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
}

const messageSchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().trim().min(1),
  internal: z.enum(["true", "false"]).optional(),
});

export async function addTeamMessage(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = messageSchema.safeParse({
    ticket_id: formData.get("ticket_id"),
    body: formData.get("body"),
    internal: formData.get("internal") || "false",
  });
  if (!parsed.success) return { error: "Escribí un mensaje." };
  const { ticket_id, body, internal } = parsed.data;
  const isInternal = internal === "true";

  const { userId: actorId, ticket } = await loadTicketOrThrow(ticket_id);

  const [message] = await query<{ id: string }>(
    "insert into ticket_messages (ticket_id, author_id, body, internal) values ($1,$2,$3,$4) returning id",
    [ticket_id, actorId, body, isInternal]
  );

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const validation = validateUpload(file);
    if (validation.error) return validation;
    const key = buildStorageKey(`tickets/${ticket_id}`, file.name);
    await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type);
    await query(
      `insert into ticket_attachments (ticket_id, message_id, uploaded_by, storage_key, filename, content_type, size_bytes)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [ticket_id, message.id, actorId, key, file.name, file.type, file.size]
    );
  }

  if (!isInternal) {
    const hadFirstResponse = await queryOne(
      "select 1 from support_tickets where id = $1 and first_response_at is not null",
      [ticket_id]
    );
    if (!hadFirstResponse) {
      await query("update support_tickets set first_response_at = now() where id = $1", [ticket_id]);
    }
    await notifyClientOfReply(ticket.client_id, ticket_id, ticket.number);
  }

  revalidatePath(`/tickets/${ticket_id}`);
  return {};
}

export async function convertToTask(formData: FormData): Promise<void> {
  const ticketId = String(formData.get("ticket_id") ?? "");
  const { userId: actorId, ticket } = await loadTicketOrThrow(ticketId);

  const ticketRow = await queryOne<{ title: string; assigned_to: string | null }>(
    "select title, assigned_to from support_tickets where id = $1",
    [ticketId]
  );
  if (!ticketRow) return;

  await query(
    "insert into tasks (title, description, assigned_to, created_by, ticket_id) values ($1,$2,$3,$4,$5)",
    [`[${ticket.number}] ${ticketRow.title}`, null, ticketRow.assigned_to, actorId, ticketId]
  );

  await query(
    `insert into ticket_events (ticket_id, actor_id, event_type, to_value) values ($1,$2,'convert_to_task',$3)`,
    [ticketId, actorId, ticket.number]
  );

  await recordAudit({
    actorId,
    action: "tickets.convert_to_task",
    entityType: "support_ticket",
    entityId: ticketId,
    ip: getClientIp(),
  });

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tasks");
}
