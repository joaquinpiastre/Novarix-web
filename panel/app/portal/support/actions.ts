"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { notifyMany } from "@/lib/notifications/create";
import type { TicketPriority } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

export async function createSupportTicket(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: actorId, clientId } = await requirePortalAccess();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Contanos qué necesitás." };
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TicketPriority;

  const [row] = await query<{ id: string }>(
    `insert into support_tickets (client_id, title, description, priority, created_by)
     values ($1,$2,$3,$4,$5) returning id`,
    [clientId, title, description, priority, actorId]
  );

  const team = await query<{ id: string }>(
    "select id from profiles where role in ('admin', 'programmer')"
  );
  await notifyMany(
    team.map((t) => t.id),
    "support_ticket_opened",
    "Nuevo ticket de soporte",
    title,
    `/clients/${clientId}`
  );

  await recordAudit({
    actorId,
    action: "support_tickets.create_by_client",
    entityType: "support_ticket",
    entityId: row.id,
    after: { title, priority },
    ip: getClientIp(),
  });

  revalidatePath("/portal/support");
  return {};
}
