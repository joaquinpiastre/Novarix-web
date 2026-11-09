"use client";

import { useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/dates";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type SupportTicket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types/domain";
import {
  assignTicket,
  addTeamMessage,
  convertToTask,
  suggestReplyAction,
  updateTicketPriority,
  updateTicketStatus,
  type ActionState,
} from "../actions";
import type { TicketMessageRow } from "./page";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function TicketDetailClient({
  ticket,
  messages,
  events,
  assignable,
  projects,
  services,
  currentUserId,
  canUseAi,
}: {
  ticket: SupportTicket & { client_name: string };
  messages: TicketMessageRow[];
  events: { id: string; event_type: string; actor_name: string | null; created_at: string }[];
  assignable: { id: string; full_name: string }[];
  projects: { id: string; name: string }[];
  services: { id: string; name: string }[];
  currentUserId: string;
  canUseAi: boolean;
}) {
  const [showInternal, setShowInternal] = useState(true);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [suggesting, startSuggesting] = useTransition();
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function suggestReply() {
    setSuggestError(null);
    startSuggesting(async () => {
      const result = await suggestReplyAction(ticket.id);
      if (result.error) setSuggestError(result.error);
      else if (replyRef.current && result.text) {
        replyRef.current.value = result.text;
        replyRef.current.focus();
      }
    });
  }
  const [messageState, messageAction] = useFormState<ActionState, FormData>(addTeamMessage, {});
  const [internalNote, setInternalNote] = useState(false);

  const relatedProject = projects.find((p) => p.id === ticket.related_project_id);
  const relatedService = services.find((s) => s.id === ticket.related_service_id);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-text-muted">{ticket.number}</p>
            <h1 className="text-lg font-semibold text-text-primary">{ticket.title}</h1>
            <p className="text-sm text-text-muted">
              {ticket.client_name} · {TICKET_TYPE_LABELS[ticket.ticket_type]}
              {relatedProject && ` · ${relatedProject.name}`}
              {relatedService && ` · ${relatedService.name}`}
            </p>
          </div>
          <form action={convertToTask}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <Button type="submit" variant="ghost">
              Convertir en tarea
            </Button>
          </form>
        </div>

        {ticket.description && <p className="mt-3 text-sm text-text-primary">{ticket.description}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <form action={updateTicketStatus}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <label className="text-xs text-text-muted">Estado</label>
            <select
              name="status"
              defaultValue={ticket.status}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
            >
              {(Object.entries(TICKET_STATUS_LABELS) as [TicketStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </form>

          <form action={updateTicketPriority}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <label className="text-xs text-text-muted">Prioridad</label>
            <select
              name="priority"
              defaultValue={ticket.priority}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
            >
              {(Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </form>

          <form action={assignTicket}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <label className="text-xs text-text-muted">Responsable</label>
            <select
              name="assigned_to"
              defaultValue={ticket.assigned_to ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="">Sin asignar</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </form>
        </div>

        {ticket.sla_due_at && !ticket.first_response_at && (
          <p
            className={`mt-3 text-xs ${
              new Date(ticket.sla_due_at) < new Date() ? "text-danger" : "text-text-muted"
            }`}
          >
            SLA de primera respuesta: {formatDateTime(ticket.sla_due_at)}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Conversación</CardTitle>
          <button
            type="button"
            onClick={() => setShowInternal((v) => !v)}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            {showInternal ? "Ocultar notas internas" : "Mostrar notas internas"}
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {messages
            .filter((m) => showInternal || !m.internal)
            .map((m) => (
              <li
                key={m.id}
                className={`rounded-lg border p-3 ${
                  m.internal ? "border-warning/30 bg-warning/5" : "border-border bg-surface-hover"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-text-primary">
                    {m.author_name} {m.internal && <Badge tone="warning">Nota interna</Badge>}
                  </p>
                  <p className="text-xs text-text-muted">{formatDateTime(m.created_at)}</p>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-primary">{m.body}</p>
                {m.attachments.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      <li key={a.id}>
                        <a
                          href={`/api/files/ticket-attachments/${a.id}`}
                          className="text-xs text-accent hover:underline"
                        >
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
          <input type="hidden" name="internal" value={String(internalNote)} />
          <Textarea ref={replyRef} name="body" rows={3} placeholder="Escribí una respuesta…" required />
          {canUseAi && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" onClick={suggestReply} disabled={suggesting} className="px-2 text-xs">
                <Sparkles size={14} />
                {suggesting ? "Redactando…" : "Sugerir respuesta con IA"}
              </Button>
              {suggestError && <span className="text-xs text-danger">{suggestError}</span>}
            </div>
          )}
          <input type="file" name="file" className="text-xs text-text-muted" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={internalNote}
                onChange={(e) => setInternalNote(e.target.checked)}
                className="h-3.5 w-3.5 accent-warning"
              />
              Nota interna (el cliente no la ve)
            </label>
            {messageState.error && <p className="text-sm text-danger">{messageState.error}</p>}
            <SubmitButton label={internalNote ? "Agregar nota" : "Responder al cliente"} pendingLabel="Enviando…" />
          </div>
        </form>
      </Card>

      {events.length > 0 && (
        <Card>
          <CardTitle>Historial</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="py-2 text-xs text-text-muted">
                {formatDateTime(e.created_at)} · {e.actor_name ?? "Sistema"} · {e.event_type}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
