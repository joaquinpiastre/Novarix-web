"use client";

import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
  type BeginEnrollmentState,
  type ConfirmEnrollmentState,
  type DisableTotpState,
} from "./totpActions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function EnableFlow() {
  const [beginState, beginAction] = useFormState<BeginEnrollmentState, FormData>(
    beginTotpEnrollment,
    {}
  );
  const [confirmState, confirmAction] = useFormState<ConfirmEnrollmentState, FormData>(
    confirmTotpEnrollment,
    {}
  );

  if (confirmState.recoveryCodes) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text-primary">2FA activado.</p>
        <p className="text-sm text-text-muted">
          Guardá estos códigos de recuperación en un lugar seguro. Cada uno sirve una sola vez si
          perdés el acceso a tu app de autenticación. No se vuelven a mostrar.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-hover p-3 font-mono text-sm">
          {confirmState.recoveryCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (beginState.secret && beginState.qrDataUrl) {
    return (
      <form action={confirmAction} className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Escaneá este código con tu app de autenticación (Google Authenticator, Authy, etc.) y
          después ingresá el código de 6 dígitos para confirmar.
        </p>
        <Image
          src={beginState.qrDataUrl}
          alt="Código QR para activar 2FA"
          width={200}
          height={200}
          unoptimized
          className="rounded-lg border border-border"
        />
        <input type="hidden" name="secret" value={beginState.secret} />
        <Input label="Código" name="code" inputMode="numeric" autoComplete="one-time-code" required />
        {confirmState.error && <p className="text-sm text-danger">{confirmState.error}</p>}
        <SubmitButton label="Confirmar" pendingLabel="Verificando…" />
      </form>
    );
  }

  return (
    <form action={beginAction}>
      {beginState.error && <p className="mb-3 text-sm text-danger">{beginState.error}</p>}
      <SubmitButton label="Activar 2FA" pendingLabel="Generando…" />
    </form>
  );
}

function DisableFlow() {
  const [state, formAction] = useFormState<DisableTotpState, FormData>(disableTotp, {});

  if (state.ok) {
    return <p className="text-sm text-text-muted">2FA desactivado.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        Para desactivar el 2FA, confirmá tu contraseña actual.
      </p>
      <Input
        label="Contraseña actual"
        name="current_password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton label="Desactivar 2FA" pendingLabel="Desactivando…" />
    </form>
  );
}

export function TwoFactorSection({ enabled }: { enabled: boolean }) {
  return enabled ? <DisableFlow /> : <EnableFlow />;
}
