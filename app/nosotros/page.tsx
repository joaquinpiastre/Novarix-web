import type { Metadata } from "next";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Historia, valores y forma de trabajo de Novarix Digital Agency. Equipo argentino enfocado en resultados reales para PyMEs y empresas en crecimiento.",
  openGraph: {
    title: "Nosotros | Novarix Digital Agency",
    description:
      "Un socio tecnológico real: claridad, compromiso y evolución continua.",
    url: "/nosotros",
  },
};

const values = [
  {
    title: "Claridad",
    body: "Hablamos en el idioma del negocio, no del código.",
  },
  {
    title: "Compromiso",
    body: "El proyecto del cliente es nuestro proyecto.",
  },
  {
    title: "Evolución",
    body: "Aprendemos, iteramos y mejoramos constantemente.",
  },
];

const audience = [
  {
    title: "PyMEs locales",
    body: "Negocios que necesitan presencia digital, sistemas simples y marketing que se entienda en el día a día.",
  },
  {
    title: "Empresas en crecimiento",
    body: "Equipos que escalan y requieren arquitectura, procesos y campañas alineados con nuevos objetivos.",
  },
  {
    title: "Profesionales independientes",
    body: "Expertos que quieren un canal propio de captación sin depender solo de terceros.",
  },
];

export default function NosotrosPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" aria-hidden />
        <div className="pointer-events-none absolute left-1/4 top-32 h-64 w-64 rounded-full bg-violet-mid/25 blur-[90px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal>
            <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Construimos el futuro digital de las{" "}
              <span className="gradient-text">empresas argentinas</span>
            </h1>
          </ScrollReveal>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Nuestra historia</h2>
          <p className="mt-6 text-lg leading-relaxed text-text-secondary">
            Novarix nació de una convicción simple: las empresas merecen un socio tecnológico
            real, no un proveedor más. Empezamos trabajando con PyMEs y profesionales
            independientes que necesitaban tecnología de nivel enterprise sin los costos ni la
            complejidad de una consultora grande. Hoy seguimos siendo eso: un equipo chico con
            capacidad grande, comprometido con los resultados de cada cliente. Nuestro recorrido
            incluye comercio (por ejemplo Ceramicasa en San Rafael), instituciones de salud,
            servicios locales y plataformas de gestión y pagos, siempre combinando desarrollo,
            marketing y operación cuando hace falta.
          </p>
        </ScrollReveal>
      </section>

      <section className="border-y border-border-subtle bg-bg-secondary/25 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Valores</h2>
          </ScrollReveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {values.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.1}>
                <div className="glass h-full rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm">
                  <h3 className="font-display text-xl font-semibold text-purple-bright">
                    {v.title}
                  </h3>
                  <p className="mt-4 text-text-secondary leading-relaxed">{v.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Nuestra forma de trabajar</h2>
          <p className="mt-6 text-lg leading-relaxed text-text-secondary">
            Trabajamos de forma ágil, con ciclos cortos de entrega y comunicación constante. No
            prometemos lo que no podemos cumplir y preferimos sorprender con resultados antes que
            impresionar con presentaciones. Cada proyecto arranca con un diagnóstico honesto de la
            situación actual y termina cuando el cliente está realmente satisfecho con el
            resultado.
          </p>
        </ScrollReveal>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Con quiénes trabajamos
            </h2>
          </ScrollReveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {audience.map((a, i) => (
              <ScrollReveal key={a.title} delay={i * 0.1}>
                <div className="rounded-2xl border border-border-subtle bg-bg-primary/50 p-8 transition-all duration-300 hover:border-purple-bright/35 hover:shadow-glow-sm">
                  <h3 className="font-display text-lg font-semibold text-text-primary">
                    {a.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-text-secondary">{a.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
