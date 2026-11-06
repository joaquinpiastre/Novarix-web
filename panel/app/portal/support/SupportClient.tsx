"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import {
  TECH_ASSET_TYPE_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicket,
  type TechAsset,
} from "@/lib/types/domain";
import { createSupportTicket, type ActionState } from "./actions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

const STATUS_TONE = {
  open: "warning",
  in_progress: "accent",
  resolved: "success",
  closed: "neutral",
} as const;

function NewTicketForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(createSupportTicket, {});
  return (
    <Card>
      <CardTitle>Nuevo ticket</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Título" name="title" required />
        <Select label="Prioridad" name="priority" defaultValue="medium">
          {(Object.entries(TICKET_PRIORITY_LABELS) as [string, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2">
          <Textarea label="Contanos qué pasa" name="description" rows={3} />
        </div>
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton label="Enviar" pendingLabel="Enviando…" />
        </div>
      </form>
    </Card>
  );
}

export function SupportClient({
  tickets,
  techAssets,
}: {
  tickets: SupportTicket[];
  techAssets: TechAsset[];
}) {
  const [showForm, setShowForm] = useState(tickets.length === 0);

  return (
    <div className="flex flex-col gap-5">
      {showForm ? (
        <NewTicketForm />
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)} className="self-start">
          Nuevo ticket
        </Button>
      )}

      <Card>
        <CardTitle>Tus tickets</CardTitle>
        {tickets.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Todavía no abriste ningún ticket.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{t.title}</p>
                  <p className="text-xs text-text-muted">{formatDate(t.created_at)}</p>
                </div>
                <Badge tone={STATUS_TONE[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {techAssets.length > 0 && (
        <Card>
          <CardTitle>Tus activos técnicos</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {techAssets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-text-primary">{a.label}</p>
                  <p className="text-xs text-text-muted">{TECH_ASSET_TYPE_LABELS[a.asset_type]}</p>
                </div>
                <span className="text-xs text-text-muted">Vence {formatDate(a.expires_at!)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
