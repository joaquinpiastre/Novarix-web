import Link from "next/link";
import clsx from "clsx";

const TABS = [
  { href: "/marketing/radar", label: "Buscar" },
  { href: "/marketing/radar/tableros", label: "Tableros" },
  { href: "/marketing/radar/alertas", label: "Alertas" },
  { href: "/marketing/diagnostico", label: "Diagnóstico" },
];

export function RadarHeader({ active, title, subtitle }: { active: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              t.href === active ? "border-accent text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
