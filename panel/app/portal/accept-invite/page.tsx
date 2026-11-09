"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthError, AuthHeading, AuthLayout, PORTAL_AUTH_COPY } from "@/components/auth/AuthLayout";
import { acceptInvite, type AcceptInviteState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-h-11 w-full">
      {pending ? "Creando cuenta…" : "Crear mi cuenta"}
    </Button>
  );
}

export default function AcceptInvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const [state, formAction] = useFormState<AcceptInviteState, FormData>(acceptInvite, {});

  return (
    <AuthLayout {...PORTAL_AUTH_COPY}>
      <AuthHeading title="Bienvenido al portal Novarix" subtitle="Creá tu contraseña para empezar." />

      {!searchParams.token ? (
        <AuthError message="Link inválido o vencido. Pedí uno nuevo." />
      ) : (
        <form action={formAction} className="space-y-4">
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
          <AuthError message={state.error} />
          <SubmitButton />
        </form>
      )}
    </AuthLayout>
  );
}
