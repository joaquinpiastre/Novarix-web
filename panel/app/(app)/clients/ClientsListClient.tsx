"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/types/domain";
import { createClient, type CreateClientState } from "./actions";
import type { ClientRow } from "./page";

const STATUS_TONE: Record<ClientStatus, "success" | "warning" | "neutral" | "danger" | "accent"> = {
  activo: "success",
  prospecto: "accent",
  pausado: "warning",
  baja: "danger",
  inactivo: "neutral",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Creando…" : "Crear cliente"}
    </Button>
  );
}

function NewClientForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useFormState<CreateClientState, FormData>(createClient, {});

  if (state.createdId) {
    return (
      <Card>
        <p className="text-sm text-text-primary">Cliente creado.</p>
        <div className="mt-3 flex gap-2">
          <Link href={`/clients/${state.createdId}`}>
            <Button type="button">Ver ficha</Button>
          </Link>
          <Button type="button" variant="secondary" onClick={onDone}>
            Cerrar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Nuevo cliente</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Nombre comercial" name="name" required />
        <Input label="Razón social" name="legal_name" />
        <Input label="CUIT" name="tax_id" />
        <Input label="Rubro" name="industry" />
        <Input label="Ciudad" name="city" />
        <Select label="Estado" name="status" defaultValue="activo">
          {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input label="Sitio web" name="website" placeholder="https://" />
        <Input label="Contacto principal" name="primary_contact_name" />
        <Input label="Teléfono de contacto" name="primary_contact_phone" />
        <Input label="Email de contacto" name="primary_contact_email" type="email" />
        <div className="sm:col-span-2">
          <Textarea
            label="Redes (una por línea: instagram: @usuario)"
            name="social_links"
            rows={2}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Notas (opcional)" name="notes" rows={2} />
        </div>
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <SubmitButton />
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ClientsListClient({
  clients,
  canCreate,
}: {
  clients: ClientRow[];
  canCreate: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");

  const filtered = useMemo(
    () => (statusFilter === "all" ? clients : clients.filter((c) => c.status === statusFilter)),
    [clients, statusFilter]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "activo", "prospecto", "pausado", "baja", "inactivo"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-muted hover:text-text-primary"
              }`}
            >
              {s === "all" ? "Todos" : CLIENT_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {canCreate && (
          <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            {showForm ? "Cerrar" : "Nuevo cliente"}
          </Button>
        )}
      </div>

      {canCreate && showForm && <NewClientForm onDone={() => setShowForm(false)} />}

      <Card>
        {filtered.length === 0 ? (
          <p className="text-sm text-text-muted">No hay clientes para este filtro.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-surface-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-muted">
                      {[c.industry, c.city].filter(Boolean).join(" · ") || "Sin rubro/ciudad cargado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">
                      {c.active_services_count} servicio{c.active_services_count === 1 ? "" : "s"}
                    </span>
                    <Badge tone={STATUS_TONE[c.status]}>{CLIENT_STATUS_LABELS[c.status]}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
