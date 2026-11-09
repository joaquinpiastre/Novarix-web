import clsx from "clsx";

/**
 * Logo de Novarix, el mismo de Novarix Seller Hub (PNG con fondo transparente).
 * - mark: solo el símbolo (+ nombre en tipografía opcional). Sirve sobre fondos claros y oscuros.
 * - full: logo completo (símbolo + "Novarix" + "Digital Agency"). El texto es violeta oscuro:
 *   usarlo sobre superficies claras (por eso `tile` lo apoya en un recuadro blanco).
 */
export function NovarixLogo({
  variant = "mark",
  withName = false,
  subtitle = "Panel",
  tile = false,
  className,
  size = 32,
}: {
  variant?: "mark" | "full";
  withName?: boolean;
  subtitle?: string;
  tile?: boolean;
  className?: string;
  size?: number;
}) {
  if (variant === "full") {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/brand/logo-full.png" alt="Novarix Digital Agency" style={{ height: size, width: "auto" }} className="block" />
    );
    return tile ? (
      <div className={clsx("inline-block rounded-2xl bg-white p-5 shadow-card", className)}>{img}</div>
    ) : (
      <div className={className}>{img}</div>
    );
  }
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-mark.png" alt={withName ? "" : "Novarix"} style={{ height: size, width: "auto" }} className="block" />
      {withName && (
        <span className="font-display text-[17px] font-semibold leading-none tracking-tight text-text-primary">
          Novarix
          <span className="ml-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            {subtitle}
          </span>
        </span>
      )}
    </span>
  );
}
