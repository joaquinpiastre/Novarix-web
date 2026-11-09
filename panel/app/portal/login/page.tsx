import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthError, AuthHeading, AuthLayout, PORTAL_AUTH_COPY } from "@/components/auth/AuthLayout";
import { signIn, verifyTwoFactorCode } from "../../login/actions";

export const metadata: Metadata = { title: "Portal de clientes" };

export default function PortalLoginPage({
  searchParams,
}: {
  searchParams: { error?: string; step?: string };
}) {
  const isTwoFactorStep = searchParams.step === "2fa";

  return (
    <AuthLayout {...PORTAL_AUTH_COPY}>
      {isTwoFactorStep ? (
        <>
          <AuthHeading title="Verificación en dos pasos" subtitle="Ingresá el código de tu app de autenticación." />
          <form action={verifyTwoFactorCode} className="space-y-4">
            <input type="hidden" name="portal" value="true" />
            <Input label="Código" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required />
            <AuthError message={searchParams.error} />
            <Button type="submit" className="min-h-11 w-full">
              Verificar
            </Button>
          </form>
        </>
      ) : (
        <>
          <AuthHeading title="Ingresá a tu portal" subtitle="Portal de clientes · Novarix Digital Agency" />
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="portal" value="true" />
            <Input label="Email" name="email" type="email" required autoComplete="email" placeholder="vos@tuempresa.com" />
            <Input label="Contraseña" name="password" type="password" required autoComplete="current-password" />
            <AuthError message={searchParams.error} />
            <Button type="submit" className="min-h-11 w-full">
              Ingresar
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-text-muted">
            <Link href="/portal/forgot-password" className="font-medium text-accent hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-text-muted">¿Todavía no sos cliente? Escribinos a novarix.agency</p>
        </>
      )}
    </AuthLayout>
  );
}
