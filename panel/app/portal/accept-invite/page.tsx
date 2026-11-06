"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoMark } from "@/components/Logo";
import { acceptInvite, type AcceptInviteState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? "Creando cuenta…" : "Crear mi cuenta"}
    </Button>
  );
}

export default function AcceptInvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const [state, formAction] = useFormState<AcceptInviteState, FormData>(acceptInvite, {});

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[0_0_40px_-12px_rgba(123,47,247,0.35)]">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={52} />
          <h1 className="mt-4 text-xl font-semibold text-text-primary">Bienvenido al portal Novarix</h1>
          <p className="mt-1 text-sm text-text-muted">Creá tu contraseña para empezar.</p>
        </div>

        {!searchParams.token ? (
          <p className="mt-6 text-center text-sm text-danger">Link inválido.</p>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="token" value={searchParams.token} />
            <Input label="Tu nombre" name="full_name" required autoComplete="name" />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="Al menos 8 caracteres"
            />
            <Input
              label="Repetí la contraseña"
              name="confirm_password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
            />
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <SubmitButton />
          </form>
        )}
      </div>
    </div>
  );
}
