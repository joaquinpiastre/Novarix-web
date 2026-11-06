"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { notify, notifyMany } from "@/lib/notifications/create";

async function notifyInternalTeam(
  clientId: string,
  assignedTo: string | null,
  kind: string,
  title: string,
  body: string,
  link: string
): Promise<void> {
  if (assignedTo) {
    await notify(assignedTo, kind, title, body, link);
    return;
  }
  const team = await query<{ profile_id: string }>(
    "select profile_id from client_team where client_id = $1",
    [clientId]
  );
  await notifyMany(team.map((t) => t.profile_id), kind, title, body, link);
}

export interface ActionState {
  error?: string;
}

async function findOwnedItem(
  contentItemId: string,
  clientId: string
): Promise<{ title: string; assigned_to: string | null } | null> {
  return queryOne<{ title: string; assigned_to: string | null }>(
    "select title, assigned_to from content_items where id = $1 and client_id = $2",
    [contentItemId, clientId]
  );
}

export async function approveContent(formData: FormData): Promise<void> {
  const { userId: actorId, clientId } = await requirePortalAccess();
  const id = String(formData.get("id") ?? "");
  const item = id ? await findOwnedItem(id, clientId) : null;
  if (!item) return;

  await query(
    "update content_items set status = 'programado', updated_at = now() where id = $1 and client_id = $2",
    [id, clientId]
  );

  await notifyInternalTeam(
    clientId,
    item.assigned_to,
    "content_approved",
    "El cliente aprobó una pieza",
    item.title,
    `/clients/${clientId}`
  );

  await recordAudit({
    actorId,
    action: "content_items.approve_by_client",
    entityType: "content_item",
    entityId: id,
    ip: getClientIp(),
  });

  revalidatePath("/portal/content");
}

export async function requestChanges(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: actorId, clientId } = await requirePortalAccess();
  const id = String(formData.get("id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  const item = id ? await findOwnedItem(id, clientId) : null;
  if (!item) return { error: "Pieza no encontrada." };
  if (!comment) return { error: "Contanos qué cambiarías." };

  await query(
    "update content_items set status = 'revision_interna', updated_at = now() where id = $1 and client_id = $2",
    [id, clientId]
  );

  await query(
    `insert into comments (entity_type, entity_id, client_id, author_id, body, visible_to_client)
     values ('content_item', $1, $2, $3, $4, true)`,
    [id, clientId, actorId, comment]
  );

  await notifyInternalTeam(
    clientId,
    item.assigned_to,
    "content_changes_requested",
    "El cliente pidió cambios",
    `"${item.title}": ${comment}`,
    `/clients/${clientId}`
  );

  await recordAudit({
    actorId,
    action: "content_items.request_changes",
    entityType: "content_item",
    entityId: id,
    ip: getClientIp(),
  });

  revalidatePath("/portal/content");
  return {};
}

export async function addClientComment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: actorId, clientId } = await requirePortalAccess();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!id || !(await findOwnedItem(id, clientId))) return { error: "Pieza no encontrada." };
  if (!body) return { error: "Escribí un comentario." };

  await query(
    `insert into comments (entity_type, entity_id, client_id, author_id, body, visible_to_client)
     values ('content_item', $1, $2, $3, $4, true)`,
    [id, clientId, actorId, body]
  );

  revalidatePath("/portal/content");
  return {};
}
