"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { navLinksForRole } from "./links";
import type { Profile } from "@/lib/types/domain";
import { ROLE_LABELS } from "@/lib/types/domain";

export function Sidebar({ profile, signOut }: { profile: Profile; signOut: () => void }) {
  const pathname = usePathname();
  const links = navLinksForRole(profile.role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="border-b border-border p-5">
        <p className="text-sm font-semibold text-text-primary">Novarix</p>
        <p className="text-xs text-text-muted">Panel interno</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium text-text-primary">{profile.full_name}</p>
          <p className="text-xs text-text-muted">{ROLE_LABELS[profile.role]}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-danger"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
