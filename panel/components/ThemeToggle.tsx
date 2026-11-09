"use client";

import { Moon, Sun } from "lucide-react";

/** Alterna claro/oscuro y lo recuerda en este navegador (misma clave que Seller Hub). */
export function ThemeToggle() {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("nx-theme", next);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema claro/oscuro"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-primary hover:bg-surface-hover"
    >
      <Sun className="hidden h-4 w-4 [[data-theme=dark]_&]:block" />
      <Moon className="h-4 w-4 [[data-theme=dark]_&]:hidden" />
    </button>
  );
}
