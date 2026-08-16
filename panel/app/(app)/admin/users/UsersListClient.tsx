"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROLE_LABELS, type Profile } from "@/lib/types/domain";
import { formatDate } from "@/lib/utils/dates";
import { resetPasswordAction, type ResetPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Guardando…" : "Guardar contraseña"}
    </Button>
  );
}

function ChangePasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [state, formAction] = useFormState<ResetPasswordState, FormData>(resetPasswordAction, {});

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-surface-hover p-4 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex-1">
        <Input
          label="Contraseña nueva"
          name="new_password"
          type="text"
          minLength={8}
          required
          placeholder="Al menos 8 caracteres"
        />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function UsersListClient({ profiles }: { profiles: Profile[] }) {
  const [changingId, setChangingId] = useState<string | null>(null);

  return (
    <ul className="mt-3 divide-y divide-border">
      {profiles.map((p) => (
        <li key={p.id} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">{p.full_name}</p>
              <p className="text-xs text-text-muted">
                {p.email} · desde {formatDate(p.created_at.slice(0, 10))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={p.role === "admin" ? "accent" : "neutral"}>{ROLE_LABELS[p.role]}</Badge>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setChangingId(changingId === p.id ? null : p.id)}
              >
                {changingId === p.id ? "Cerrar" : "Cambiar contraseña"}
              </Button>
            </div>
          </div>
          {changingId === p.id && (
            <ChangePasswordForm userId={p.id} onDone={() => setChangingId(null)} />
          )}
        </li>
      ))}
    </ul>
  );
}
