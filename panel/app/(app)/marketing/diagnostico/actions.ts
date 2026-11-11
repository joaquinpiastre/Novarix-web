"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { aiErrorMessage, isAiConfigured } from "@/lib/ai/client";
import { clientAccessError, requireTrendsAccess } from "@/lib/trends/access";
import { generateDiagnostic } from "@/lib/trends/diagnostics";
import { checkAiLimit } from "@/lib/trends/settings";

export async function generateDiagnosticAction(clientId: string): Promise<{ error?: string }> {
  const access = await requireTrendsAccess();
  const accessError = clientAccessError(access, clientId);
  if (accessError) return { error: accessError };
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
  const limit = await checkAiLimit(access.userId, access.profile.role);
  if (limit) return { error: limit };
  try {
    const res = await generateDiagnostic(clientId, { profileId: access.userId });
    if (res.error) return { error: res.error };
    await recordAudit({ actorId: access.userId, action: "diagnostic.generate", entityType: "video_diagnostic", entityId: res.id ?? null, after: { client_id: clientId }, ip: getClientIp() });
  } catch (err) {
    return { error: aiErrorMessage(err) };
  }
  revalidatePath("/marketing/diagnostico");
  return {};
}
