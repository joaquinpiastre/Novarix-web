import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoMark, LogoWordmark } from "@/components/Logo";
import { signIn } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#7b2ff7]/25 blur-[100px]"
        aria-hidden
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[0_0_40px_-12px_rgba(123,47,247,0.35)]">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={52} />
          <h1 className="mt-4 text-xl font-semibold text-text-primary">
            <LogoWordmark />
          </h1>
          <p className="mt-1 text-sm text-text-muted">Panel interno</p>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Ingresá con tu cuenta para continuar.
        </p>

        <form action={signIn} className="mt-6 flex flex-col gap-4">
          <Input label="Email" name="email" type="email" required autoComplete="email" />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          {searchParams.error && <p className="text-sm text-danger">{searchParams.error}</p>}
          <Button type="submit" className="mt-2 w-full">
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
}
