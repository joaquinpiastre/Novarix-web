"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/dates";
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, type SupportTicket } from "@/lib/types/domain";
import { addClientMessage, reopenTicket, resolveTicketByClient, submitCsat, type ActionState } from "../actions";
import type { ClientMessageRow } from "./page";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function CsatForm({ ticketId }: { ticketId: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(submitCsat, {});
  const [score, setScore] = useState(5);

  return (
    <Card>
      <CardTitle>¿Cómo fue tu experiencia?</CardTitle>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input type="hidden" name="score" value={score} />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={`h-9 w-9 rounded-full border text-sm font-medium ${
                n <= score ? "border-accent bg-accent text-accent-fg" : "border-border text-text-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <Textarea name="comment" rows={2} placeholder="Comentario (opcional)" />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton label="Enviar" pendingLabel="Enviando…" />
      </form>
    </Card>
  );
}

export function TicketThreadClient({
  ticket,
  messages,
}: {
  ticket: SupportTicket;
  messages: ClientMessageRow[];
}) {
  const [messageState, messageAction] = useFormState<ActionState, FormData>(addClientMessage, {});

  const canResolve = ticket.status !== "resuelto" && ticket.status !== "cerrado";
  const canReopen =
    ticket.status === "resuelto" &&
    ticket.reopened_until != null &&
    new Date(ticket.reopened_until) > new Date();
  const needsCsat = ticket.status === "cerrado" && ticket.csat_score == null;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-text-muted">{ticket.number}</p>
            <h1 className="text-lg font-semibold text-text-primary">{ticket.title}</h1>
            <p className="text-sm text-text-muted">{TICKET_TYPE_LABELS[ticket.ticket_type]}</p>
          </div>
          <Badge tone="accent">{TICKET_STATUS_LABELS[ticket.status]}</Badge>
        </div>
        {ticket.description && <p className="mt-3 text-sm text-text-primary">{ticket.description}</p>}

        <div className="mt-4 flex gap-2">
          {canResolve && (
            <form action={resolveTicketByClient}>
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <Button type="submit" variant="secondary">
                Marcar como resuelto
              </Button>
            </form>
          )}
          {canReopen && (
            <form action={reopenTicket}>
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <Button type="submit" variant="ghost">
                Reabrir
              </Button>
            </form>
          )}
        </div>
      </Card>

      {needsCsat && <CsatForm ticketId={ticket.id} />}

      <Card>
        <CardTitle>Conversación</CardTitle>
        <ul className="mt-4 flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-xl border border-border bg-surface-hover p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-text-primary">{m.author_name}</p>
                <p className="text-xs text-text-muted">{formatDateTime(m.created_at)}</p>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-primary">{m.body}</p>
              {m.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {m.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={`/api/files/ticket-attachments/${a.id}`} className="text-xs text-accent hover:underline">
                        📎 {a.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {messages.length === 0 && <p className="text-sm text-text-muted">Sin mensajes todavía.</p>}
        </ul>

        <form action={messageAction} className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <Textarea name="body" rows={3} placeholder="Escribí tu respuesta…" required />
          <input type="file" name="file" className="text-xs text-text-muted" />
          <div className="flex items-center justify-between">
            {messageState.error && <p className="text-sm text-danger">{messageState.error}</p>}
            <SubmitButton label="Enviar" pendingLabel="Enviando…" />
          </div>
        </form>
      </Card>
    </div>
  );
}
