"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthError, AuthHeading, AuthLayout, PORTAL_AUTH_COPY } from "@/components/auth/AuthLayout";
import { resetPassword, type ResetPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-h-11 w-full">
      {pending ? "Guardando…" : "Elegir contraseña"}
    </Button>
  );
}

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const [state, formAction] = useFormState<ResetPasswordState, FormData>(resetPassword, {});

  return (
    <AuthLayout {...PORTAL_AUTH_COPY}>
      <AuthHeading title="Elegí una contraseña nueva" />

      {!searchParams.token ? (
        <AuthError message="Link inválido o vencido. Pedí uno nuevo." />
      ) : (
        <form action={formAction} className="space-y-4">
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
          <AuthError message={state.error} />
          <SubmitButton />
        </form>
      )}
    </AuthLayout>
  );
}
