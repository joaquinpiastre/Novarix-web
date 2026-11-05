"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changePassword, type ChangePasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Guardando…" : "Cambiar contraseña"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useFormState<ChangePasswordState, FormData>(changePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="Contraseña actual"
        name="current_password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Input
        label="Contraseña nueva"
        name="new_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        placeholder="Al menos 8 caracteres"
      />
      <Input
        label="Repetí la contraseña nueva"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
