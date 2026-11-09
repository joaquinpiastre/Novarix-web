import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthError, AuthHeading, AuthLayout, PANEL_AUTH_COPY } from "@/components/auth/AuthLayout";
import { signIn, verifyTwoFactorCode } from "./actions";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; step?: string };
}) {
  const isTwoFactorStep = searchParams.step === "2fa";

  return (
    <AuthLayout {...PANEL_AUTH_COPY}>
      {isTwoFactorStep ? (
        <>
          <AuthHeading title="Verificación en dos pasos" subtitle="Ingresá el código de tu app de autenticación (o un código de recuperación)." />
          <form action={verifyTwoFactorCode} className="space-y-4">
            <Input label="Código" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required />
            <AuthError message={searchParams.error} />
            <Button type="submit" className="min-h-11 w-full">
              Verificar
            </Button>
          </form>
        </>
      ) : (
        <>
          <AuthHeading title="Ingresá a tu panel" subtitle="Panel Novarix" />
          <form action={signIn} className="space-y-4">
            <Input label="Email" name="email" type="email" required autoComplete="email" placeholder="vos@novarix.agency" />
            <Input label="Contraseña" name="password" type="password" required autoComplete="current-password" />
            <AuthError message={searchParams.error} />
            <Button type="submit" className="min-h-11 w-full">
              Ingresar
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-text-muted">
            ¿Sos cliente de Novarix?{" "}
            <a href="/portal/login" className="font-medium text-accent hover:underline">
              Entrá al portal de clientes
            </a>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
