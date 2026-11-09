"use client";

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  height?: number;
  width?: number;
  priority?: boolean;
  /** Muestra "DIGITAL AGENCY" debajo del nombre, como en el logo completo. */
  subtitle?: boolean;
};

/** Símbolo de Novarix (la flecha/N violeta) con brillo. */
export function BrandMark({
  size = 64,
  className = "",
  float = false,
}: {
  size?: number;
  className?: string;
  /** Animación suave de flotación (para portadas). */
  float?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-mark.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{
        height: size,
        width: "auto",
        filter: "drop-shadow(0 0 18px rgba(168, 85, 247, 0.5))",
      }}
      className={`block select-none ${float ? "animate-float" : ""} ${className}`}
      draggable={false}
    />
  );
}

/** Símbolo + "Novarix" en degradé (+ "Digital Agency" opcional). */
export function BrandLogo({
  href = "/",
  className = "",
  height = 40,
  subtitle = false,
}: BrandLogoProps) {
  const nameSize = Math.max(18, height * 0.45);
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.png"
        alt=""
        aria-hidden
        style={{
          height: height * 0.9,
          width: "auto",
          filter: "drop-shadow(0 0 10px rgba(168, 85, 247, 0.45))",
        }}
        className="block"
      />
      <span className="flex flex-col">
        <span
          className="font-display font-bold tracking-wide gradient-text leading-none"
          style={{ fontSize: nameSize }}
        >
          Novarix
        </span>
        {subtitle && (
          <span
            className="mt-1 font-display font-semibold uppercase leading-none text-purple-bright/90"
            style={{ fontSize: Math.max(8, nameSize * 0.36), letterSpacing: "0.32em" }}
          >
            Digital Agency
          </span>
        )}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus-ring rounded-lg"
        aria-label="Novarix Digital Agency — Inicio"
      >
        {content}
      </Link>
    );
  }

  return <span className="inline-flex items-center">{content}</span>;
}

/** Logo completo vertical (símbolo grande + nombre + Digital Agency), para fondos oscuros. */
export function BrandLockup({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <BrandMark size={size} float />
      <span
        className="mt-5 font-display font-bold tracking-wide gradient-text leading-none"
        style={{ fontSize: size * 0.32 }}
      >
        Novarix
      </span>
      <span
        className="mt-2 font-display font-semibold uppercase leading-none text-purple-bright/90"
        style={{ fontSize: Math.max(10, size * 0.085), letterSpacing: "0.34em" }}
      >
        Digital Agency
      </span>
    </div>
  );
}
