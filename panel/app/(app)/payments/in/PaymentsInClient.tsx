"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, formatMonthLabel, todayISO } from "@/lib/utils/dates";
import {
  createAgreement,
  createClientAction,
  createOneOffPayment,
  createPendingOneOffPayment,
  deactivateAgreement,
  markOneOffCollected,
  recordRecurringPayment,
  updateAgreement,
  updateOneOffPayment,
  type ActionState,
  type UpdateAgreementState,
  type UpdateOneOffPaymentState,
} from "./actions";

export interface ClientRow {
  id: string;
  name: string;
}

export interface AgreementRow {
  id: string;
  client_id: string;
  amount: number;
  billing_day: number;
  concept: string;
  client: { name: string } | null;
}

export interface PaymentInRow {
  id: string;
  client_id: string;
  amount: number;
  concept: string;
  period_month: string | null;
  date_received: string;
  client: { name: string } | null;
}

export interface PendingOneOffRow {
  id: string;
  client_id: string;
  amount: number;
  concept: string;
  client: { name: string } | null;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function NewClientForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(createClientAction, {});
  return (
    <Card>
      <CardTitle>Nuevo cliente</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" name="name" required />
        <Textarea label="Notas (opcional)" name="notes" rows={1} />
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton label="Agregar cliente" />
        </div>
      </form>
    </Card>
  );
}

function NewAgreementForm({ clients }: { clients: ClientRow[] }) {
  const [state, formAction] = useFormState<ActionState, FormData>(createAgreement, {});
  return (
    <Card>
      <CardTitle>Nuevo acuerdo recurrente</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Cliente" name="client_id" required defaultValue="">
          <option value="" disabled>
            Elegí un cliente
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input label="Monto mensual" name="amount" type="number" min={0} step="0.01" required />
        <Input label="Día de cobro" name="billing_day" type="number" min={1} max={28} required />
        <Input label="Concepto" name="concept" placeholder="Ej: mantenimiento software" required />
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton label="Crear acuerdo" />
        </div>
      </form>
    </Card>
  );
}

function EditAgreementForm({
  agreement,
  clients,
  onDone,
}: {
  agreement: AgreementRow;
  clients: ClientRow[];
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<UpdateAgreementState, FormData>(updateAgreement, {});

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="mt-3 grid gap-4 rounded-lg border border-border bg-surface-hover p-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={agreement.id} />
      <Select label="Cliente" name="client_id" required defaultValue={agreement.client_id}>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        label="Monto mensual"
        name="amount"
        type="number"
        min={0}
        step="0.01"
        defaultValue={agreement.amount}
        required
      />
      <Input
        label="Día de cobro"
        name="billing_day"
        type="number"
        min={1}
        max={28}
        defaultValue={agreement.billing_day}
        required
      />
      <Input label="Concepto" name="concept" defaultValue={agreement.concept} required />
      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton label="Guardar cambios" />
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function OneOffPaymentForm({ clients }: { clients: ClientRow[] }) {
  const [state, formAction] = useFormState<ActionState, FormData>(createOneOffPayment, {});
  return (
    <Card>
      <CardTitle>Pago puntual</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Cliente" name="client_id" required defaultValue="">
          <option value="" disabled>
            Elegí un cliente
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input label="Monto" name="amount" type="number" min={0} step="0.01" required />
        <Input label="Fecha" name="date_received" type="date" defaultValue={todayISO()} required />
        <Input label="Concepto" name="concept" placeholder="Ej: proyecto nuevo" required />
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton label="Registrar cobro" />
        </div>
      </form>
    </Card>
  );
}

function PendingOneOffPaymentForm({ clients }: { clients: ClientRow[] }) {
  const [state, formAction] = useFormState<ActionState, FormData>(createPendingOneOffPayment, {});
  return (
    <Card>
      <CardTitle>Pago puntual pendiente de cobro</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Cliente" name="client_id" required defaultValue="">
          <option value="" disabled>
            Elegí un cliente
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input label="Monto" name="amount" type="number" min={0} step="0.01" required />
        <div className="sm:col-span-2">
          <Input label="Concepto" name="concept" placeholder="Ej: proyecto nuevo" required />
        </div>
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton label="Agregar pendiente" />
        </div>
      </form>
    </Card>
  );
}

function EditOneOffPaymentForm({
  payment,
  clients,
  onDone,
}: {
  payment: PaymentInRow;
  clients: ClientRow[];
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<UpdateOneOffPaymentState, FormData>(
    updateOneOffPayment,
    {}
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="mt-3 grid gap-4 rounded-lg border border-border bg-surface-hover p-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={payment.id} />
      <Select label="Cliente" name="client_id" required defaultValue={payment.client_id}>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        label="Monto"
        name="amount"
        type="number"
        min={0}
        step="0.01"
        defaultValue={payment.amount}
        required
      />
      <Input
        label="Fecha"
        name="date_received"
        type="date"
        defaultValue={payment.date_received}
        required
      />
      <Input label="Concepto" name="concept" defaultValue={payment.concept} required />
      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton label="Guardar cambios" />
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function PaymentsInClient({
  clients,
  agreements,
  paidAgreementIds,
  pendingOneOff,
  history,
}: {
  clients: ClientRow[];
  agreements: AgreementRow[];
  paidAgreementIds: string[];
  pendingOneOff: PendingOneOffRow[];
  history: PaymentInRow[];
}) {
  const [openPanel, setOpenPanel] = useState<"client" | "agreement" | "oneoff" | "oneoffpending" | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const paidSet = new Set(paidAgreementIds);
  const pending = agreements.filter((a) => !paidSet.has(a.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Cobros a clientes</h1>
        <p className="text-sm text-text-muted">Acuerdos recurrentes y pagos puntuales.</p>
      </div>

      <Card>
        <CardTitle>Pendientes de cobro este mes</CardTitle>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No hay cobros recurrentes pendientes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {pending.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{a.client?.name ?? "—"}</p>
                  <p className="text-xs text-text-muted">
                    {a.concept} · vence el día {a.billing_day}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(a.amount)}
                  </span>
                  <form action={recordRecurringPayment.bind(null, a.id)}>
                    <Button type="submit" variant="secondary">
                      Marcar cobrado
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Pagos puntuales pendientes de cobro</CardTitle>
        {pendingOneOff.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No hay pagos puntuales pendientes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {pendingOneOff.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{p.client?.name ?? "—"}</p>
                  <p className="text-xs text-text-muted">{p.concept}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(p.amount)}
                  </span>
                  <form action={markOneOffCollected.bind(null, p.id)}>
                    <Button type="submit" variant="secondary">
                      Marcar cobrado
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Acuerdos recurrentes activos</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setOpenPanel(openPanel === "client" ? null : "client")}
            >
              <Plus size={16} /> Cliente
            </Button>
            <Button
              variant="secondary"
              onClick={() => setOpenPanel(openPanel === "agreement" ? null : "agreement")}
            >
              <Plus size={16} /> Acuerdo
            </Button>
          </div>
        </div>
        {agreements.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Todavía no hay acuerdos recurrentes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {agreements.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{a.client?.name ?? "—"}</p>
                    <p className="text-xs text-text-muted">
                      {a.concept} · día {a.billing_day} de cada mes
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">
                      {formatCurrency(a.amount)}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingId(editingId === a.id ? null : a.id)}
                    >
                      {editingId === a.id ? "Cerrar" : "Editar"}
                    </Button>
                    <form action={deactivateAgreement.bind(null, a.id)}>
                      <Button type="submit" variant="ghost">
                        Dar de baja
                      </Button>
                    </form>
                  </div>
                </div>
                {editingId === a.id && (
                  <EditAgreementForm
                    agreement={a}
                    clients={clients}
                    onDone={() => setEditingId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {openPanel === "client" && <NewClientForm />}
      {openPanel === "agreement" && <NewAgreementForm clients={clients} />}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Pagos puntuales</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpenPanel(openPanel === "oneoffpending" ? null : "oneoffpending")}
          >
            <Plus size={16} /> {openPanel === "oneoffpending" ? "Cerrar" : "Pendiente de cobro"}
          </Button>
          <Button variant="secondary" onClick={() => setOpenPanel(openPanel === "oneoff" ? null : "oneoff")}>
            <Plus size={16} /> {openPanel === "oneoff" ? "Cerrar" : "Ya cobrado"}
          </Button>
        </div>
      </div>
      {openPanel === "oneoffpending" && <PendingOneOffPaymentForm clients={clients} />}
      {openPanel === "oneoff" && <OneOffPaymentForm clients={clients} />}

      <Card>
        <CardTitle>Historial de cobros</CardTitle>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Todavía no hay cobros registrados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {history.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.client?.name ?? "—"}</p>
                    <p className="text-xs text-text-muted">
                      {p.concept} · cobrado el {formatDate(p.date_received)}
                      {p.period_month && ` · corresponde a ${formatMonthLabel(p.period_month)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {formatCurrency(p.amount)}
                    </span>
                    {p.period_month ? (
                      <Badge tone="success">Cobrado</Badge>
                    ) : (
                      <>
                        <Badge tone="accent">Puntual</Badge>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingPaymentId(editingPaymentId === p.id ? null : p.id)}
                        >
                          {editingPaymentId === p.id ? "Cerrar" : "Editar"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {editingPaymentId === p.id && (
                  <EditOneOffPaymentForm
                    payment={p}
                    clients={clients}
                    onDone={() => setEditingPaymentId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
