"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/trabajo", label: "Trabajo" },
  { href: "/contacto", label: "Contacto" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed left-0 right-0 top-0 z-50 transition-[background,backdrop-filter,border-color] duration-300 ${
        scrolled
          ? "border-b border-border-subtle bg-bg-secondary/75 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo priority />

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring ${
                    active
                      ? "text-purple-bright"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block">
          <Link
            href="/contacto"
            className="glow-btn inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-mid to-purple px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] focus-ring"
          >
            Hablemos
          </Link>
        </div>

        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary/50 text-text-primary md:hidden focus-ring"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menú</span>
          <span className="relative block h-5 w-6">
            <span
              className={`absolute left-0 top-1 block h-0.5 w-6 rounded-full bg-current transition-all duration-300 ${
                open ? "top-2.5 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-2.5 block h-0.5 w-6 rounded-full bg-current transition-all duration-300 ${
                open ? "scale-0 opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-4 block h-0.5 w-6 rounded-full bg-current transition-all duration-300 ${
                open ? "top-2.5 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-border-subtle bg-bg-secondary/95 backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 py-4">
              {links.map((l, i) => {
                const active = pathname === l.href;
                return (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <Link
                      href={l.href}
                      className={`block rounded-lg px-3 py-3 text-base font-medium focus-ring ${
                        active
                          ? "text-purple-bright"
                          : "text-text-secondary"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </motion.li>
                );
              })}
              <motion.li
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="pt-2"
              >
                <Link
                  href="/contacto"
                  className="glow-btn flex w-full items-center justify-center rounded-full bg-gradient-to-r from-violet-mid to-purple py-3 text-center text-sm font-semibold text-white focus-ring"
                >
                  Hablemos
                </Link>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
