import { requirePermission } from "@/lib/auth/requirePermission";
import { can } from "@/lib/auth/permissions";
import { query } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai/client";
import { loadConversation, toChatEntries } from "@/lib/ai/agent";
import { AssistantChat } from "./AssistantChat";

export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: { c?: string } }) {
  const { userId, profile } = await requirePermission("ai.use");

  const conversations = await query<{ id: string; title: string; updated_at: string }>(
    "select id, title, updated_at from ai_conversations where profile_id = $1 order by updated_at desc limit 30",
    [userId]
  );
  const current =
    searchParams.c && /^[0-9a-f-]{36}$/i.test(searchParams.c) ? await loadConversation(userId, searchParams.c) : null;

  const suggestions = [
    "¿Qué se graba esta semana y quién está a cargo?",
    "Armá 4 reels para la semana que viene para un cliente, con guion y copy, y asignáselos a alguien de marketing",
    "Resumime cómo viene un cliente: contenido, tickets y métricas de Meta",
    "¿Qué piezas no tienen fecha de grabación todavía?",
    "¿Qué tickets están abiertos y cuáles están por vencer?",
    ...(can(profile, "payments_in.manage") ? ["¿Cuánto cobramos este mes y qué falta cobrar?"] : []),
  ];

  return (
    <AssistantChat
      key={current?.id ?? "new"}
      configured={isAiConfigured()}
      conversations={conversations}
      conversationId={current?.id ?? null}
      initialEntries={current ? toChatEntries(current.messages) : []}
      suggestions={suggestions}
    />
  );
}
