import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { WorkShowcase } from "@/components/WorkShowcase";

export const metadata: Metadata = {
  title: "Trabajo",
  description:
    "Casos de estudio: desarrollo web, marketing, software e IA. Proyectos reales con enfoque en impacto medible.",
  openGraph: {
    title: "Trabajo | Novarix Digital Agency",
    description: "Proyectos que generan impacto real en negocios argentinos.",
    url: "/trabajo",
  },
};

export default function TrabajoPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" aria-hidden />
        <div className="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-accent-magenta/15 blur-[110px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal>
            <h1 className="max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Proyectos que generan{" "}
              <span className="gradient-text">impacto real</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-text-secondary leading-relaxed">
              Cada proyecto que tomamos es diferente. Lo que no cambia es nuestro enfoque:
              entender el problema real antes de escribir una sola línea de código o activar una
              sola campaña.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <WorkShowcase />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-text-secondary/90">
          *Los resultados varían según el sector, el punto de partida y el presupuesto de cada
          proyecto.
        </p>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              ¿Tu empresa puede ser el próximo caso?
            </h2>
            <Link
              href="/contacto"
              className="glow-btn mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-mid to-purple px-8 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.03] focus-ring"
            >
              Coordinemos una charla
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
