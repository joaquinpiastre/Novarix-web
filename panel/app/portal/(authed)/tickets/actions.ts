"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireClient, assertNotPreview } from "@/lib/auth/requireClient";
import { validateUpload } from "@/lib/storage/uploadLimits";
import { buildStorageKey, uploadObject } from "@/lib/storage/s3";
import { calculateSlaDueDate } from "@/lib/tickets/sla";
import { suggestAssignee } from "@/lib/tickets/assign";
import { notifyNewTicket, notifyTeamOfClientReply } from "@/lib/tickets/notify";
import { isRateLimited, recordLoginAttempt } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/utils/request";
import { recordAudit } from "@/lib/audit/log";
import type { TicketPriority, TicketType } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

const createSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  ticket_type: z.enum([
    "reclamo",
    "pedido_cambio",
    "soporte_tecnico",
    "consulta",
    "pedido_contenido",
    "facturacion",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  related_service_id: z.string().uuid().optional().or(z.literal("")),
  related_project_id: z.string().uuid().optional().or(z.literal("")),
});

export async function createTicket(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireClient();
  const previewError = assertNotPreview(access);
  if (previewError) return previewError;
  const { userId: actorId, clientId } = access;

  const ip = getClientIp() ?? "unknown";
  if (await isRateLimited(`ticket_create:${clientId}`)) {
    return { error: "Demasiados tickets creados. Esperá unos minutos." };
  }

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    ticket_type: formData.get("ticket_type"),
    priority: formData.get("priority") || "medium",
    related_service_id: formData.get("related_service_id") || "",
    related_project_id: formData.get("related_project_id") || "",
  });
  if (!parsed.success) return { error: "Completá los campos requeridos." };
  const { title, description, ticket_type, priority, related_service_id, related_project_id } = parsed.data;

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const validation = validateUpload(file);
    if (validation.error) return validation;
  }

  await recordLoginAttempt(`ticket_create:${clientId}`, true);

  const assignedTo = await suggestAssignee(clientId, ticket_type as TicketType, related_project_id || null);
  const slaDueAt = calculateSlaDueDate(priority as TicketPriority);

  const [ticket] = await query<{ id: string; number: string }>(
    `insert into support_tickets
       (client_id, title, description, ticket_type, priority, related_service_id, related_project_id, created_by, assigned_to, sla_due_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id, number`,
    [
      clientId,
      title,
      description || null,
      ticket_type,
      priority,
      related_service_id || null,
      related_project_id || null,
      actorId,
      assignedTo,
      slaDueAt,
    ]
  );

  if (file instanceof File && file.size > 0) {
    const key = buildStorageKey(`tickets/${ticket.id}`, file.name);
    await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type);
    await query(
      `insert into ticket_attachments (ticket_id, uploaded_by, storage_key, filename, content_type, size_bytes)
       values ($1,$2,$3,$4,$5,$6)`,
      [ticket.id, actorId, key, file.name, file.type, file.size]
    );
  }

  await notifyNewTicket(ticket.id, assignedTo, ticket.number, title);
  await recordAudit({ actorId, action: "tickets.create_by_client", entityType: "support_ticket", entityId: ticket.id, ip });

  revalidatePath("/portal/tickets");
  redirect(`/portal/tickets/${ticket.id}`);
}

async function findOwnedTicket(ticketId: string, clientId: string) {
  return queryOne<{
    id: string;
    number: string;
    status: string;
    resolved_at: string | null;
    assigned_to: string | null;
    reopened_until: string | null;
  }>(
    "select id, number, status::text as status, resolved_at, assigned_to, reopened_until from support_tickets where id = $1 and client_id = $2",
    [ticketId, clientId]
  );
}

const messageSchema = z.object({ ticket_id: z.string().uuid(), body: z.string().trim().min(1) });

export async function addClientMessage(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const access = await requireClient();
  const previewError = assertNotPreview(access);
  if (previewError) return previewError;
  const { userId: actorId, clientId } = access;

  const parsed = messageSchema.safeParse({ ticket_id: formData.get("ticket_id"), body: formData.get("body") });
  if (!parsed.success) return { error: "Escribí un mensaje." };

  const ticket = await findOwnedTicket(parsed.data.ticket_id, clientId);
  if (!ticket) return { error: "Ticket no encontrado." };

  const [message] = await query<{ id: string }>(
    "insert into ticket_messages (ticket_id, author_id, body, internal) values ($1,$2,$3,false) returning id",
    [ticket.id, actorId, parsed.data.body]
  );

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const validation = validateUpload(file);
    if (validation.error) return validation;
    const key = buildStorageKey(`tickets/${ticket.id}`, file.name);
    await uploadObject(key, Buffer.from(await file.arrayBuffer()), file.type);
    await query(
      `insert into ticket_attachments (ticket_id, message_id, uploaded_by, storage_key, filename, content_type, size_bytes)
       values ($1,$2,$3,$4,$5,$6)`,
      [ticket.id, message.id, actorId, key, file.name, file.type, file.size]
    );
  }

  await notifyTeamOfClientReply(clientId, ticket.assigned_to, ticket.id, ticket.number);
  revalidatePath(`/portal/tickets/${ticket.id}`);
  return {};
}

export async function resolveTicketByClient(formData: FormData): Promise<void> {
  const access = await requireClient();
  if (assertNotPreview(access)) return;
  const { clientId } = access;
  const ticketId = String(formData.get("ticket_id") ?? "");
  const ticket = await findOwnedTicket(ticketId, clientId);
  if (!ticket) return;

  await query(
    "update support_tickets set status = 'resuelto', resolved_at = coalesce(resolved_at, now()), reopened_until = now() + interval '7 days' where id = $1",
    [ticketId]
  );
  revalidatePath(`/portal/tickets/${ticketId}`);
  revalidatePath("/portal/tickets");
}

export async function reopenTicket(formData: FormData): Promise<void> {
  const access = await requireClient();
  if (assertNotPreview(access)) return;
  const { clientId } = access;
  const ticketId = String(formData.get("ticket_id") ?? "");
  const ticket = await findOwnedTicket(ticketId, clientId);
  if (!ticket) return;
  if (!ticket.reopened_until && ticket.status !== "resuelto") return;

  await query(
    "update support_tickets set status = 'en_curso' where id = $1 and (reopened_until is null or reopened_until > now())",
    [ticketId]
  );
  revalidatePath(`/portal/tickets/${ticketId}`);
  revalidatePath("/portal/tickets");
}

const csatSchema = z.object({
  ticket_id: z.string().uuid(),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().optional(),
});

export async function submitCsat(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireClient();
  const previewError = assertNotPreview(access);
  if (previewError) return previewError;
  const { clientId } = access;

  const parsed = csatSchema.safeParse({
    ticket_id: formData.get("ticket_id"),
    score: formData.get("score"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { error: "Elegí una puntuación." };

  const ticket = await findOwnedTicket(parsed.data.ticket_id, clientId);
  if (!ticket) return { error: "Ticket no encontrado." };

  await query("update support_tickets set csat_score = $1, csat_comment = $2 where id = $3", [
    parsed.data.score,
    parsed.data.comment || null,
    ticket.id,
  ]);

  revalidatePath(`/portal/tickets/${ticket.id}`);
  return {};
}
