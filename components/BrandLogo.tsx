"use client";

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
   height?: number;
  width?: number;
  priority?: boolean;
};

export function BrandLogo({
  href = "/",
  className = "",
  height = 40,
}: BrandLogoProps) {
  const text = (
    <span
      className={`font-display font-bold tracking-wide gradient-text leading-none ${className}`}
      style={{ fontSize: Math.max(18, height * 0.45) }}
    >
      Novarix
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus-ring rounded-lg"
        aria-label="Novarix Digital Agency — Inicio"
      >
        {text}
      </Link>
    );
  }

  return <span className="inline-flex items-center">{text}</span>;
}
