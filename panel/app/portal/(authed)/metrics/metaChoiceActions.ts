"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertNotPreview, requireClient } from "@/lib/auth/requireClient";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { listMetaAssetChoices, saveMetaAssetSelection, type MetaAssetChoice } from "@/lib/meta/oauth";

// El cliente (titular) elige que cuentas de su Facebook usa el portal. El
// clientId sale SIEMPRE de la sesion (requireClient), nunca de un parametro.

const selectionSchema = z.array(z.object({ type: z.enum(["ad_account", "page", "instagram"]), external_id: z.string().min(1).max(64) })).max(200);

export async function getPortalMetaChoices(): Promise<{ choices?: MetaAssetChoice[]; error?: string }> {
  const access = await requireClient();
  if (access.clientRole !== "owner") return { error: "Solo el titular de la cuenta puede elegir las cuentas." };
  const res = await listMetaAssetChoices(access.clientId);
  // Al cliente no se le muestra a que otro cliente de Novarix pertenece una cuenta.
  return "error" in res ? { error: res.error } : { choices: res.choices.map((c) => ({ ...c, used_by: c.used_by ? "otra empresa" : null })) };
}

export async function savePortalMetaChoices(selected: z.input<typeof selectionSchema>): Promise<{ saved?: number; error?: string }> {
  const access = await requireClient();
  const preview = assertNotPreview(access);
  if (preview) return { error: preview.error };
  if (access.clientRole !== "owner") return { error: "Solo el titular de la cuenta puede elegir las cuentas." };
  const parsed = selectionSchema.safeParse(selected);
  if (!parsed.success) return { error: "Selección inválida." };
  const res = await saveMetaAssetSelection(access.clientId, parsed.data);
  if ("error" in res) return { error: res.error };
  await recordAudit({
    actorId: access.userId,
    action: "meta_assets.select_by_client",
    entityType: "client",
    entityId: access.clientId,
    after: { assets: parsed.data.map((s) => `${s.type}:${s.external_id}`) },
    ip: getClientIp(),
  });
  revalidatePath("/portal/metrics");
  return { saved: res.saved };
}
