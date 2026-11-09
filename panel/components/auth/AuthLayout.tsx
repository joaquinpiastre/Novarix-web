import { NovarixLogo } from "@/components/Logo";

// Pantallas de ingreso con el mismo diseño que Novarix Seller Hub: panel de
// marca a la izquierda (escritorio) y formulario a la derecha.

export function AuthLayout({
  headline,
  copy,
  children,
}: {
  headline: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-10 lg:p-12"
        style={{
          background:
            "radial-gradient(120% 90% at 20% 10%, hsl(277 80% 30%) 0%, hsl(262 60% 14%) 55%, hsl(228 46% 7%) 100%)",
        }}
      >
        <NovarixLogo variant="full" tile size={230} />
        <div className="max-w-md text-center text-white">
          <h2 className="font-display text-2xl font-semibold leading-snug">{headline}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{copy}</p>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 lg:hidden">
          <NovarixLogo variant="full" tile size={96} />
        </div>
        <div className="w-full max-w-sm">{children}</div>
        <p className="mt-10 text-xs text-text-muted">
          © {new Date().getFullYear()} Novarix Digital Agency ·{" "}
          <a href="https://novarix.agency" className="hover:underline">
            novarix.agency
          </a>
        </p>
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>}
    </div>
  );
}

export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export const PANEL_AUTH_COPY = {
  headline: "Todo Novarix en un solo lugar.",
  copy: "Clientes, contenido, campañas, tickets y finanzas del equipo, con un asistente de IA que te ayuda a cargarlo.",
};

export const PORTAL_AUTH_COPY = {
  headline: "Tu cuenta con Novarix, siempre a mano.",
  copy: "Seguí tus proyectos, aprobá contenido, mirá tus métricas y resolvé tus consultas con nuestro equipo.",
};
