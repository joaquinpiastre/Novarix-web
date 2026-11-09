"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthError, AuthHeading, AuthLayout, PORTAL_AUTH_COPY } from "@/components/auth/AuthLayout";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-h-11 w-full">
      {pending ? "Enviando…" : "Enviar link"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState<ForgotPasswordState, FormData>(requestPasswordReset, {});

  return (
    <AuthLayout {...PORTAL_AUTH_COPY}>
      <AuthHeading title="Recuperar contraseña" subtitle="Te mandamos un link a tu email para elegir una nueva." />

      {state.sent ? (
        <p className="mt-6 text-center text-sm text-text-muted">
          Si ese email está registrado, te enviamos un link para elegir una contraseña nueva.
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <Input label="Email" name="email" type="email" required autoComplete="email" />
          <AuthError message={state.error} />
          <SubmitButton />
        </form>
      )}

      <Link href="/portal/login" className="mt-4 block text-center text-xs text-accent hover:underline">
        Volver al login
      </Link>
    </AuthLayout>
  );
}
