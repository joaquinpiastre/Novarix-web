"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { listMetaAssetChoices, saveMetaAssetSelection, type MetaAssetChoice } from "@/lib/meta/oauth";

const selectionSchema = z.array(z.object({ type: z.enum(["ad_account", "page", "instagram"]), external_id: z.string().min(1).max(64) })).max(200);

export async function getMetaChoices(clientId: string): Promise<{ choices?: MetaAssetChoice[]; error?: string }> {
  await requireClientAccess(clientId);
  const res = await listMetaAssetChoices(clientId);
  return "error" in res ? { error: res.error } : { choices: res.choices };
}

export async function saveMetaChoices(clientId: string, selected: z.input<typeof selectionSchema>): Promise<{ saved?: number; error?: string }> {
  const { userId } = await requireClientAccess(clientId);
  const parsed = selectionSchema.safeParse(selected);
  if (!parsed.success) return { error: "Selección inválida." };
  const res = await saveMetaAssetSelection(clientId, parsed.data);
  if ("error" in res) return { error: res.error };
  await recordAudit({
    actorId: userId,
    action: "meta_assets.select",
    entityType: "client",
    entityId: clientId,
    after: { assets: parsed.data.map((s) => `${s.type}:${s.external_id}`) },
    ip: getClientIp(),
  });
  revalidatePath(`/clients/${clientId}`);
  return { saved: res.saved };
}
