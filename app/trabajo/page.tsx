import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

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

const cases = [
  {
    title: "Ceramicasa — comercio y presencia digital",
    type: "Desarrollo web + Marketing digital",
    challenge:
      "Cerámica y construcción en San Rafael: necesitaban un canal online sólido y marketing alineado al negocio.",
    solution:
      "Desarrollo de la aplicación web del comercio y acompañamiento en marketing digital para acercar productos y marca a su audiencia.",
    result:
      "Un solo ecosistema digital para mostrar catálogo, generar confianza y sostener la comunicación comercial.",
    tags: ["Web", "Marketing", "Retail"],
    link: {
      href: "https://www.ceramicasasanrafael.com",
      label: "ceramicasasanrafael.com",
    },
  },
  {
    title: "Hospital Español del Sur Mendocino",
    type: "Sitio web + App móvil multiplataforma",
    challenge:
      "Institución de salud que requería presencia institucional en web y una herramienta digital para socios, usable en distintos dispositivos.",
    solution:
      "Página web para la institución y aplicación multiplataforma orientada a la información y gestión vinculada a los socios.",
    result:
      "Canal institucional claro y una app accesible para afiliados, sin depender solo de canales presenciales o telefónicos.",
    tags: ["Web", "App", "Salud"],
  },
  {
    title: "NYR Funeraria — Catriel",
    type: "Automatización + Redes sociales",
    challenge:
      "Servicio sensible en Catriel: coordinar comunicación con familias y presencia en redes sin sobrecargar al equipo.",
    solution:
      "Software de automatización de mensajes para agilizar contactos y seguimiento, más gestión de redes sociales de la funeraria.",
    result:
      "Comunicación más ordenada y presencia digital coherente con la seriedad del servicio.",
    tags: ["Automatización", "Social media", "Local"],
  },
  {
    title: "Tirua — administración y pagos",
    type: "Plataforma de gestión",
    challenge:
      "Centralizar pagos, administración y operaciones cotidianas en un sistema único, sin dispersar datos ni procesos.",
    solution:
      "Desarrollo de una plataforma para administrar pagos, gestión administrativa y utilidades operativas integradas.",
    result:
      "Una base técnica para ordenar cobros, backoffice y flujos de trabajo en un solo lugar.",
    tags: ["Software", "Pagos", "Gestión"],
  },
  {
    title: "Más organizaciones y proyectos",
    type: "Web, software y marketing",
    challenge:
      "PyMEs y equipos que necesitan combinar producto digital, procesos y crecimiento sin contratar tres proveedores distintos.",
    solution:
      "Landing pages, sistemas a medida, integraciones y campañas según la etapa de cada cliente.",
    result:
      "Cartera diversa de entregas: desde presencia web hasta automatización y acompañamiento en canales digitales.",
    tags: ["Integración", "PyME", "Full service"],
  },
];

export default function TrabajoPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
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

      <div className="mx-auto max-w-7xl space-y-12 px-4 pb-8 sm:px-6 lg:space-y-16 lg:px-8">
        {cases.map((c, i) => (
          <ScrollReveal key={c.title} delay={0.08 * i}>
            <article className="glass overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm">
              <div className="grid gap-0 lg:grid-cols-5">
                <div className="border-b border-border-subtle bg-gradient-to-br from-violet-dark/40 to-bg-secondary/80 p-8 lg:col-span-2 lg:border-b-0 lg:border-r lg:border-border-subtle">
                  <p className="text-sm font-medium text-purple-bright">{c.type}</p>
                  <h2 className="mt-3 font-display text-2xl font-bold leading-snug sm:text-3xl">
                    {c.title}
                  </h2>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border-subtle bg-bg-primary/50 px-3 py-1 text-xs font-medium text-text-secondary"
                      >
                        [{t}]
                      </span>
                    ))}
                  </div>
                  {"link" in c && c.link ? (
                    <p className="mt-6">
                      <a
                        href={c.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-purple-bright underline decoration-purple-bright/40 underline-offset-4 transition-colors hover:text-purple-bright/90"
                      >
                        {c.link.label}
                      </a>
                    </p>
                  ) : null}
                </div>
                <div className="p-8 lg:col-span-3">
                  <dl className="space-y-6">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Desafío
                      </dt>
                      <dd className="mt-2 text-text-primary/95 leading-relaxed">{c.challenge}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Solución
                      </dt>
                      <dd className="mt-2 text-text-primary/95 leading-relaxed">{c.solution}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-purple-bright">
                        Resultado
                      </dt>
                      <dd className="mt-2 font-medium text-text-primary leading-relaxed">
                        {c.result}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </article>
          </ScrollReveal>
        ))}
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
