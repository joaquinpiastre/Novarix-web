"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { PendingInvite, PortalCompanyUser } from "@/lib/portal/queries";
import { deactivateTeammate, inviteTeammate, type ActionState } from "./actions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function CompanyUsersCard({
  companyUsers,
  pendingInvites,
}: {
  companyUsers: PortalCompanyUser[];
  pendingInvites: PendingInvite[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(inviteTeammate, {});

  return (
    <Card className="max-w-lg">
      <div className="flex items-center justify-between">
        <CardTitle>Usuarios de tu empresa</CardTitle>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Cerrar" : "Invitar"}
        </Button>
      </div>

      {showForm && (
        <form action={formAction} className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-hover p-4">
          <Input label="Email de tu compañero/a" name="email" type="email" required />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.sent && <p className="text-sm text-success">Invitación enviada.</p>}
          <SubmitButton label="Enviar invitación" pendingLabel="Enviando…" />
        </form>
      )}

      <ul className="mt-4 divide-y divide-border">
        {companyUsers.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm text-text-primary">{u.full_name}</p>
              <p className="text-xs text-text-muted">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={u.client_role === "owner" ? "accent" : "neutral"}>
                {u.client_role === "owner" ? "Titular" : u.active ? "Activo" : "Inactivo"}
              </Badge>
              {u.client_role !== "owner" && u.active && (
                <form action={deactivateTeammate}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="text-xs text-danger hover:underline">
                    Quitar acceso
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      {pendingInvites.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Invitaciones pendientes</p>
          <ul className="mt-2 divide-y divide-border">
            {pendingInvites.map((i) => (
              <li key={i.id} className="py-1.5 text-sm text-text-muted">
                {i.email}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
