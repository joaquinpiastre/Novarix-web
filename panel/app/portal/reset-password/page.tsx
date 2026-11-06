"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoMark } from "@/components/Logo";
import { resetPassword, type ResetPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? "Guardando…" : "Elegir contraseña"}
    </Button>
  );
}

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const [state, formAction] = useFormState<ResetPasswordState, FormData>(resetPassword, {});

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[0_0_40px_-12px_rgba(123,47,247,0.35)]">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={52} />
          <h1 className="mt-4 text-xl font-semibold text-text-primary">Elegí una contraseña nueva</h1>
        </div>

        {!searchParams.token ? (
          <p className="mt-6 text-center text-sm text-danger">Link inválido.</p>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="token" value={searchParams.token} />
            <Input
              label="Contraseña nueva"
              name="new_password"
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
