"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import {
  createContentItemRecord,
  updateContentItemRecord,
  type ContentItemInput,
} from "@/lib/marketing/contentItems";
import { generateContentDraft } from "@/lib/ai/generate";
import { aiErrorMessage, isAiConfigured } from "@/lib/ai/client";
import type { ContentStatus } from "@/lib/types/domain";

export interface SaveContentResult {
  id?: string;
  error?: string;
}

function revalidate(clientId: string) {
  revalidatePath("/calendar");
  revalidatePath(`/clients/${clientId}`);
}

/**
 * Alta o edición de una pieza desde el calendario o la pestaña Marketing.
 * Acceso: quien tenga acceso al cliente (admin, marketing_admin, marketing
 * asignado al cliente). Además, la persona a la que se le delegó la pieza
 * puede cambiarle el estado aunque no esté en el equipo de ese cliente.
 */
export async function saveContentItem(
  input: ContentItemInput & { id?: string }
): Promise<SaveContentResult> {
  const { id, ...data } = input;

  if (!id) {
    const { userId } = await requireClientAccess(String(data.client_id ?? ""));
    const result = await createContentItemRecord(userId, data);
    if (result.error) return { error: result.error };
    await recordAudit({ actorId: userId, action: "content_items.create", entityType: "content_item", entityId: result.id, after: data, ip: getClientIp() });
    revalidate(String(data.client_id));
    return { id: result.id };
  }

  const current = await queryOne<{ client_id: string; assigned_to: string | null }>(
    "select client_id, assigned_to from content_items where id = $1",
    [id]
  );
  if (!current) return { error: "No existe esa pieza de contenido." };

  const { userId, profile } = await getSessionProfile();
  let patch: Partial<ContentItemInput> = data;
  if (!can(profile, "clients.manage") && current.assigned_to === userId) {
    const onTeam = await queryOne("select 1 from client_team where client_id = $1 and profile_id = $2", [
      current.client_id,
      userId,
    ]);
    // Fuera del equipo del cliente, el responsable solo puede mover el estado.
    if (!onTeam) patch = { status: data.status };
  } else {
    await requireClientAccess(current.client_id);
  }

  const result = await updateContentItemRecord(userId, id, patch);
  if (result.error) return { error: result.error };
  await recordAudit({ actorId: userId, action: "content_items.update", entityType: "content_item", entityId: id, after: patch, ip: getClientIp() });
  revalidate(current.client_id);
  return { id };
}

export async function setContentStatus(id: string, status: ContentStatus): Promise<SaveContentResult> {
  return saveContentItem({ id, status } as ContentItemInput & { id: string });
}

export async function deleteContentItemById(id: string): Promise<SaveContentResult> {
  const current = await queryOne<{ client_id: string; title: string }>(
    "select client_id, title from content_items where id = $1",
    [id]
  );
  if (!current) return {};
  const { userId } = await requireClientAccess(current.client_id);
  await query("delete from content_items where id = $1", [id]);
  await recordAudit({ actorId: userId, action: "content_items.delete", entityType: "content_item", entityId: id, before: current, ip: getClientIp() });
  revalidate(current.client_id);
  return {};
}

export async function generateDraftAction(input: {
  client_id: string;
  title: string;
  format: string;
  channels: string[];
  notes?: string;
  script?: string;
}): Promise<{ script?: string; copy?: string; error?: string }> {
  const { userId, profile } = await requireClientAccess(input.client_id);
  if (!can(profile, "ai.use")) return { error: "No tenés acceso a la IA." };
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
  if (!input.title.trim()) return { error: "Poné al menos el título o la idea de la pieza." };
  try {
    return await generateContentDraft({
      clientId: input.client_id,
      title: input.title,
      format: input.format,
      channels: input.channels,
      notes: input.notes,
      script: input.script,
    }, { profileId: userId });
  } catch (err) {
    return { error: err instanceof Error && err.message.startsWith("La IA") ? err.message : aiErrorMessage(err) };
  }
}
