"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LogOut, Menu, Search, X } from "lucide-react";
import { navLinksFor } from "./links";
import { NovarixLogo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/search/CommandPalette";
import { ROLE_LABELS, type NotificationRow, type Profile } from "@/lib/types/domain";

// Mismo armazón que Novarix Seller Hub: menú lateral fijo en escritorio,
// encabezado con menú desplegable en el celular, cuenta y tema abajo.

function NavList({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {navLinksFor(profile).map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              active ? "bg-accent/15 font-medium text-accent" : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SearchButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
      }}
      className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
    >
      <span className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        Buscar…
      </span>
      <kbd className="num rounded-md border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
    </button>
  );
}

function Account({ profile, signOut }: { profile: Profile; signOut: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <Link href="/account" className="min-w-0" title="Mi cuenta">
        <p className="truncate text-sm font-medium text-text-primary hover:underline">{profile.full_name}</p>
        <p className="truncate text-xs text-text-muted">{ROLE_LABELS[profile.role]}</p>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" /> Salir
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  profile,
  notifications,
  signOut,
  children,
}: {
  profile: Profile;
  notifications: NotificationRow[];
  signOut: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto border-r border-border bg-surface px-4 py-5 lg:flex">
        <div className="space-y-6">
          <Link href="/dashboard" className="block px-2">
            <NovarixLogo withName size={34} />
          </Link>
          <SearchButton />
          <NavList profile={profile} />
        </div>
        <div className="mt-6 space-y-4">
          <Account profile={profile} signOut={signOut} />
          <div className="flex justify-end gap-2">
            <NotificationBell notifications={notifications} placement="up" />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Celular */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <NovarixLogo withName size={28} />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} />
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-primary"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 top-14 z-20 overflow-y-auto bg-surface px-4 py-4 lg:hidden">
          <div className="mb-4">
            <SearchButton onClick={() => setOpen(false)} />
          </div>
          <NavList profile={profile} onNavigate={() => setOpen(false)} />
          <div className="mt-6 border-t border-border pt-4">
            <Account profile={profile} signOut={signOut} />
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
