import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { query, queryOne } from "@/lib/db";
import { formatLabel, networkLabel } from "@/lib/marketing/content";
import { AI_FALLBACK, AI_MODEL, getAiClient } from "./client";

// Generaciones puntuales (una sola llamada, sin herramientas): borrador de
// guion+copy para una pieza de contenido, y borrador de respuesta a un ticket.

const draftSchema = z.object({
  script: z.string(),
  copy: z.string(),
});

export interface ContentDraftInput {
  clientId: string;
  title: string;
  format: string;
  channels: string[];
  notes?: string | null;
  script?: string | null;
}

async function clientContext(clientId: string): Promise<string> {
  const client = await queryOne<{ name: string; industry: string | null; city: string | null; website: string | null }>(
    "select name, industry, city, website from clients where id = $1",
    [clientId]
  );
  const kit = await queryOne<{ tone_of_voice: string | null; color_palette: string | null; fonts: string | null }>(
    "select tone_of_voice, color_palette, fonts from brand_kits where client_id = $1",
    [clientId]
  );
  const recent = await query<{ title: string; format: string; copy: string | null }>(
    `select title, format, copy from content_items
     where client_id = $1 and copy is not null
     order by created_at desc limit 5`,
    [clientId]
  );
  const lines = [
    `Cliente: ${client?.name ?? "desconocido"}`,
    client?.industry ? `Rubro: ${client.industry}` : null,
    client?.city ? `Ciudad: ${client.city}` : null,
    client?.website ? `Web: ${client.website}` : null,
    kit?.tone_of_voice ? `Tono de voz de la marca: ${kit.tone_of_voice}` : null,
    recent.length
      ? `Copys recientes del cliente (para mantener el estilo):\n${recent
          .map((r) => `- [${formatLabel(r.format)}] ${r.title}: ${r.copy}`)
          .join("\n")}`
      : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function generateContentDraft(input: ContentDraftInput): Promise<{ script: string; copy: string }> {
  const context = await clientContext(input.clientId);
  const response = await getAiClient().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    ...AI_FALLBACK,
    output_config: { effort: "medium", format: betaZodOutputFormat(draftSchema) },
    system:
      "Sos guionista y redactor de redes sociales de Novarix, una agencia de marketing de Mendoza, Argentina. " +
      "Escribís en español rioplatense, natural y concreto, sin clichés de IA ni emojis de más. " +
      "El guion es para grabar: dividilo en escenas o tomas con lo que se ve y lo que se dice, con un gancho fuerte en los primeros 3 segundos " +
      "cuando es video. El copy es el texto de la publicación, adaptado a las redes indicadas, con llamado a la acción y hashtags solo si suman.",
    messages: [
      {
        role: "user",
        content: [
          `<cliente>\n${context}\n</cliente>`,
          `<pieza>`,
          `Título / idea: ${input.title}`,
          `Tipo de contenido: ${formatLabel(input.format)}`,
          `Redes: ${input.channels.map(networkLabel).join(", ") || "sin definir"}`,
          input.notes ? `Notas del equipo: ${input.notes}` : null,
          input.script ? `Guion actual (mejoralo, no lo descartes): ${input.script}` : null,
          `</pieza>`,
          "Escribí el guion y el copy para esta pieza.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("La IA no pudo generar este contenido.");
  }
  return response.parsed_output;
}

export async function suggestTicketReply(ticketId: string): Promise<string> {
  const ticket = await queryOne<{ title: string; description: string | null; client_name: string; type: string }>(
    `select t.title, t.description, c.name as client_name, t.ticket_type::text as type
     from support_tickets t join clients c on c.id = t.client_id where t.id = $1`,
    [ticketId]
  );
  if (!ticket) throw new Error("No existe el ticket.");
  const messages = await query<{ body: string; from_client: boolean; internal: boolean; author: string }>(
    `select m.body, (p.role = 'client') as from_client, m.internal, p.full_name as author
     from ticket_messages m join profiles p on p.id = m.author_id
     where m.ticket_id = $1 order by m.created_at`,
    [ticketId]
  );

  const thread = messages
    .map((m) => `${m.from_client ? "CLIENTE" : m.internal ? "NOTA INTERNA" : "NOVARIX"} (${m.author}): ${m.body}`)
    .join("\n\n");

  const response = await getAiClient().beta.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    ...AI_FALLBACK,
    output_config: { effort: "low" },
    system:
      "Redactás respuestas de soporte de Novarix (agencia de marketing y desarrollo, Mendoza, Argentina) para sus clientes. " +
      "Español rioplatense, cordial y concreto. No prometas plazos ni cosas que no estén en el hilo; si falta información, pedila. " +
      "Respondé solo con el texto del mensaje, sin saludo de firma ni comillas.",
    messages: [
      {
        role: "user",
        content: `<ticket>\nCliente: ${ticket.client_name}\nTipo: ${ticket.type}\nAsunto: ${ticket.title}\nDescripción: ${
          ticket.description ?? "-"
        }\n</ticket>\n<hilo>\n${thread || "(sin mensajes todavía)"}\n</hilo>\nEscribí la próxima respuesta de Novarix al cliente.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("La IA no pudo redactar esta respuesta.");
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
}
