"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import {
  OPEN_TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type SupportTicket,
} from "@/lib/types/domain";
import { createTicket, type ActionState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Enviando…" : "Enviar"}
    </Button>
  );
}

function NewTicketForm({
  services,
  projects,
}: {
  services: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(createTicket, {});

  return (
    <Card>
      <CardTitle>Nuevo ticket</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Tipo" name="ticket_type" defaultValue="consulta">
          {(Object.entries(TICKET_TYPE_LABELS) as [string, string][]).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select label="Prioridad sugerida" name="priority" defaultValue="medium">
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </Select>
        {services.length > 0 && (
          <Select label="Servicio relacionado (opcional)" name="related_service_id" defaultValue="">
            <option value="">—</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        {projects.length > 0 && (
          <Select label="Proyecto relacionado (opcional)" name="related_project_id" defaultValue="">
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        <Input label="Título" name="title" required className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Textarea label="Contanos qué necesitás" name="description" rows={3} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-text-primary">Adjuntar una imagen o archivo (opcional)</label>
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,video/mp4,video/quicktime"
            className="mt-1.5 block text-sm text-text-muted"
          />
        </div>
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}

const STATUS_TONE = {
  nuevo: "warning",
  en_revision: "accent",
  en_curso: "accent",
  esperando_cliente: "neutral",
  resuelto: "success",
  cerrado: "neutral",
} as const;

export function TicketsListClient({
  tickets,
  services,
  projects,
}: {
  tickets: SupportTicket[];
  services: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const [showForm, setShowForm] = useState(tickets.length === 0);

  return (
    <div className="flex flex-col gap-5">
      {showForm ? (
        <NewTicketForm services={services} projects={projects} />
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)} className="self-start">
          <Plus size={16} /> Nuevo ticket
        </Button>
      )}

      <Card>
        {tickets.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no abriste ningún ticket.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/portal/tickets/${t.id}`} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t.title}</p>
                    <p className="text-xs text-text-muted">
                      {t.number} · {TICKET_TYPE_LABELS[t.ticket_type]} · {formatDate(t.created_at)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
