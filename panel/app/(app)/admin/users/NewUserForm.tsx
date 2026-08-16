"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createCollaboratorAction, type CreateUserState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Creando…" : "Crear usuario"}
    </Button>
  );
}

export function NewUserForm() {
  const [state, formAction] = useFormState<CreateUserState, FormData>(createCollaboratorAction, {});

  return (
    <Card>
      <CardTitle>Nuevo colaborador</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-3">
        <Input label="Nombre completo" name="full_name" required />
        <Input label="Email" name="email" type="email" required />
        <Select label="Rol" name="role" required defaultValue="">
          <option value="" disabled>
            Elegí un rol
          </option>
          <option value="programmer">Programador</option>
          <option value="marketing">Marketing</option>
        </Select>
        {state.error && <p className="text-sm text-danger sm:col-span-3">{state.error}</p>}
        <div className="sm:col-span-3">
          <SubmitButton />
        </div>
      </form>

      {state.created && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm">
          <p className="font-medium text-text-primary">
            Cuenta creada para {state.created.fullName}.
          </p>
          <p className="mt-1 text-text-muted">Pasale estos datos para que pueda ingresar:</p>
          <p className="mt-2 font-mono text-text-primary">{state.created.email}</p>
          <p className="font-mono text-text-primary">{state.created.tempPassword}</p>
        </div>
      )}
    </Card>
  );
}
