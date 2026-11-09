"use client";

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  height?: number;
  width?: number;
  priority?: boolean;
};

/** Símbolo de Novarix (el mismo del panel y de Seller Hub) + nombre en degradé. */
export function BrandLogo({
  href = "/",
  className = "",
  height = 40,
}: BrandLogoProps) {
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
      <span
        className="font-display font-bold tracking-wide gradient-text leading-none"
        style={{ fontSize: Math.max(18, height * 0.45) }}
      >
        Novarix
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
