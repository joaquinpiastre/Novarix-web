"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { getClientIp } from "@/lib/utils/request";
import { aiErrorMessage, isAiConfigured } from "@/lib/ai/client";
import { loadConversation, runAssistantTurn, toChatEntries, type ChatEntry } from "@/lib/ai/agent";

export interface SendResult {
  conversationId?: string;
  entries?: ChatEntry[];
  error?: string;
}

const sendSchema = z.object({
  conversationId: z.string().uuid().nullable(),
  text: z.string().trim().min(1).max(8000),
});

export async function sendAssistantMessage(conversationId: string | null, text: string): Promise<SendResult> {
  const { userId, profile } = await requirePermission("ai.use");
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY en Railway)." };
  const parsed = sendSchema.safeParse({ conversationId, text });
  if (!parsed.success) return { error: "Escribí un mensaje (hasta 8000 caracteres)." };

  try {
    const result = await runAssistantTurn({ userId, profile, ip: getClientIp() }, parsed.data.conversationId, parsed.data.text);
    // La IA pudo haber cambiado datos de cualquier pantalla.
    if (result.wroteData) revalidatePath("/", "layout");
    const conversation = await loadConversation(userId, result.conversationId);
    return {
      conversationId: result.conversationId,
      entries: toChatEntries(conversation?.messages ?? []),
      error: result.error,
    };
  } catch (err) {
    return { conversationId: parsed.data.conversationId ?? undefined, error: aiErrorMessage(err) };
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const { userId } = await requirePermission("ai.use");
  await query("delete from ai_conversations where id = $1 and profile_id = $2", [id, userId]);
  revalidatePath("/assistant");
}
