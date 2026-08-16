"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { navLinksForRole } from "./links";
import type { UserRole } from "@/lib/types/domain";

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const links = navLinksForRole(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-accent" : "text-text-muted"
            )}
          >
            <Icon size={20} />
            <span className="truncate px-1">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
