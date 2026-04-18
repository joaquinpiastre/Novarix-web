import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/trabajo", label: "Trabajo" },
  { href: "/contacto", label: "Contacto" },
];

const social = [
  { href: "https://linkedin.com/company/novarix", label: "LinkedIn" },
  { href: "https://www.instagram.com/novarix.agency/", label: "Instagram" },
  { href: "https://github.com/novarix", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border-subtle bg-bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <BrandLogo height={44} width={200} className="opacity-90" />
            <p className="mt-4 max-w-md text-text-secondary">
              Tecnología que transforma negocios.
            </p>
          </div>
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Navegación
            </p>
            <ul className="mt-4 space-y-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-text-primary/90 transition-colors hover:text-purple-bright focus-ring rounded"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Redes
            </p>
            <ul className="mt-4 space-y-2">
              {social.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-primary/90 transition-colors hover:text-purple-bright focus-ring rounded"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-border-subtle pt-8 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>© 2025 Novarix Digital Agency. Todos los derechos reservados.</p>
          <p className="text-text-secondary/80">
            Hecho con precisión en Argentina 🇦🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
