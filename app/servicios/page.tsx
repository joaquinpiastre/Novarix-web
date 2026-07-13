import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Desarrollo web y software, marketing digital y Ads, consultoría IT y asistente de IA con CRM para WhatsApp. Servicios diseñados para escalar tu negocio.",
  openGraph: {
    title: "Servicios | Novarix Digital Agency",
    description:
      "Desarrollo, marketing, consultoría IT y asistente de IA con CRM para empresas que buscan escalar.",
    url: "/servicios",
  },
};

const blocks = [
  {
    title: "Desarrollo web y software a medida",
    body:
      "Construimos desde landing pages de alto impacto hasta plataformas complejas con arquitecturas modernas. Cada línea de código pensada para el negocio, no solo para la pantalla.",
    items: [
      "Sitios corporativos",
      "Plataformas SaaS",
      "E-commerce",
      "APIs y microservicios",
      "Sistemas de gestión: stock, pedidos, reparto y tracking",
    ],
    align: "left" as const,
  },
  {
    title: "Marketing digital, SEO y Ads",
    body:
      "Diseñamos estrategias de visibilidad orgánica y campañas pagas que generan demanda predecible. Optimizamos cada peso del presupuesto para maximizar el retorno sobre la inversión.",
    items: [
      "SEO técnico y de contenido",
      "Google Ads",
      "Meta Ads",
      "Email marketing",
      "Analytics y reporting",
    ],
    align: "right" as const,
  },
  {
    title: "Consultoría IT para empresas",
    body:
      "Acompañamos a empresas en su proceso de modernización tecnológica. Desde el diagnóstico hasta la implementación, con foco en eficiencia, seguridad y escalabilidad.",
    items: [
      "Auditoría tecnológica",
      "Arquitectura de sistemas",
      "Seguridad informática",
      "Migración a la nube",
      "Stack tecnológico",
    ],
    align: "left" as const,
  },
  {
    title: "Asistente de IA y CRM",
    body:
      "Un asistente que responde tu WhatsApp automáticamente las 24 horas, toma pedidos, agenda turnos y deriva a tu equipo cuando hace falta, con un CRM que ordena todos tus clientes y conversaciones en un solo lugar.",
    items: [
      "Respuestas automáticas 24/7",
      "Toma de pedidos y cotizaciones",
      "Agenda de turnos y reservas",
      "CRM con seguimiento de clientes",
      "Campañas y reportes en tiempo real",
    ],
    align: "right" as const,
  },
];

export default function ServiciosPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-purple/20 blur-[100px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal>
            <p className="text-sm font-medium uppercase tracking-widest text-purple-bright">
              Servicios
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Servicios diseñados para{" "}
              <span className="gradient-text">escalar</span>
            </h1>
          </ScrollReveal>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-24 px-4 pb-24 sm:px-6 lg:space-y-32 lg:px-8">
        {blocks.map((b, i) => (
          <ScrollReveal
            key={b.title}
            variant={b.align === "left" ? "slideRight" : "slideLeft"}
            delay={0.05 * i}
          >
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className={b.align === "right" ? "lg:order-2" : ""}>
                <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
                  {b.title}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-text-secondary">{b.body}</p>
              </div>
              <div className={b.align === "right" ? "lg:order-1" : ""}>
                <div className="glass rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wider text-purple-bright">
                    Incluye
                  </p>
                  <ul className="mt-5 space-y-3">
                    {b.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 text-text-primary/95"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-purple-bright to-accent-magenta"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <section className="border-t border-border-subtle px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="text-xl text-text-secondary sm:text-2xl">
              ¿No sabés cuál necesitás?{" "}
              <span className="text-text-primary">Te orientamos sin costo.</span>
            </p>
            <Link
              href="/contacto"
              className="glow-btn mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-mid to-purple px-8 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.03] focus-ring"
            >
              Escribinos
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
