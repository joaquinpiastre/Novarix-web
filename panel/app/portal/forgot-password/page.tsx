"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoMark } from "@/components/Logo";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? "Enviando…" : "Enviar link"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState<ForgotPasswordState, FormData>(requestPasswordReset, {});

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[0_0_40px_-12px_rgba(123,47,247,0.35)]">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={52} />
          <h1 className="mt-4 text-xl font-semibold text-text-primary">Recuperar contraseña</h1>
        </div>

        {state.sent ? (
          <p className="mt-6 text-center text-sm text-text-muted">
            Si ese email está registrado, te enviamos un link para elegir una contraseña nueva.
          </p>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <Input label="Email" name="email" type="email" required autoComplete="email" />
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <SubmitButton />
          </form>
        )}

        <Link href="/portal/login" className="mt-4 block text-center text-xs text-accent hover:underline">
          Volver al login
        </Link>
      </div>
    </div>
  );
}
