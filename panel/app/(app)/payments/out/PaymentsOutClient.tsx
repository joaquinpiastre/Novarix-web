"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, formatMonthLabel, todayISO } from "@/lib/utils/dates";
import {
  PAYMENT_OUT_TYPE_LABELS,
  ROLE_LABELS,
  type PaymentOutType,
  type UserRole,
} from "@/lib/types/domain";
import { createPaymentOut, deletePaymentOut, type ActionState } from "./actions";

export interface PaymentOutRow {
  id: string;
  amount: number;
  concept: string;
  payment_type: PaymentOutType;
  period_month: string;
  paid_on: string;
  recipient: { full_name: string } | null;
}

interface Collaborator {
  id: string;
  full_name: string;
  role: UserRole;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Guardando…" : "Registrar pago"}
    </Button>
  );
}

function NewPaymentForm({ collaborators }: { collaborators: Collaborator[] }) {
  const [state, formAction] = useFormState<ActionState, FormData>(createPaymentOut, {});

  return (
    <Card>
      <CardTitle>Nuevo pago</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Colaborador" name="recipient_id" required defaultValue="">
          <option value="" disabled>
            Elegí una persona
          </option>
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} · {ROLE_LABELS[c.role]}
            </option>
          ))}
        </Select>
        <Input label="Monto" name="amount" type="number" min={0} step="0.01" required />
        <Select label="Tipo de pago" name="payment_type" required defaultValue="salary">
          <option value="salary">Sueldo</option>
          <option value="bonus">Bono</option>
          <option value="other">Otro</option>
        </Select>
        <Input label="Mes que corresponde" name="period_month" type="month" required />
        <Input label="Fecha de pago" name="paid_on" type="date" defaultValue={todayISO()} required />
        <div className="sm:col-span-2">
          <Input label="Concepto" name="concept" placeholder="Ej: sueldo agosto, bono de fin de año" required />
        </div>
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}

export function PaymentsOutClient({
  payments,
  collaborators,
  isAdmin,
}: {
  payments: PaymentOutRow[];
  collaborators: Collaborator[];
  isAdmin: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Pagos a equipo</h1>
          <p className="text-sm text-text-muted">
            {isAdmin ? "Lo que le pagaste a cada colaborador." : "Tu historial de pagos recibidos."}
          </p>
        </div>
        {isAdmin && (
          <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            {showForm ? "Cerrar" : "Nuevo pago"}
          </Button>
        )}
      </div>

      {isAdmin && showForm && <NewPaymentForm collaborators={collaborators} />}

      <Card>
        {payments.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no hay pagos registrados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  {isAdmin && (
                    <p className="text-sm font-medium text-text-primary">
                      {p.recipient?.full_name ?? "—"}
                    </p>
                  )}
                  <p className={isAdmin ? "text-xs text-text-muted" : "text-sm font-medium text-text-primary"}>
                    {p.concept}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatMonthLabel(p.period_month)} · pagado el {formatDate(p.paid_on)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {p.payment_type !== "salary" && (
                    <Badge tone={p.payment_type === "bonus" ? "success" : "neutral"}>
                      {PAYMENT_OUT_TYPE_LABELS[p.payment_type]}
                    </Badge>
                  )}
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(p.amount)}
                  </span>
                  {isAdmin && (
                    <form action={deletePaymentOut.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="text-text-muted transition-colors hover:text-danger"
                        aria-label="Eliminar pago"
                      >
                        <Trash2 size={16} />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
