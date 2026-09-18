import type { Metadata } from "next";
import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { HomeProcess } from "@/components/HomeProcess";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Novarix Digital Agency: desarrollo de software, marketing digital, consultoría IT y automatización con IA en Argentina.",
  openGraph: {
    title: "Novarix Digital Agency — Tecnología que escala",
    description:
      "Transformamos negocios con desarrollo, marketing e inteligencia artificial integrados.",
    url: "/",
  },
};

function IconDev() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden>
      <path
        d="M16 18l-8 6 8 6M32 18l8 6-8 6M28 14l-8 20"
        stroke="url(#g1)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="g1" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconMarketing() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden>
      <path
        d="M10 34V22l8-4 8 4 12-6v12"
        stroke="url(#g2)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="34" r="3" fill="#7b2ff7" />
      <circle cx="26" cy="22" r="3" fill="#a855f7" />
      <circle cx="38" cy="16" r="3" fill="#c026d3" />
      <defs>
        <linearGradient id="g2" x1="10" y1="14" x2="38" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconConsulting() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden>
      <rect
        x="8"
        y="12"
        width="32"
        height="26"
        rx="4"
        stroke="url(#g3)"
        strokeWidth="2.2"
      />
      <path d="M14 20h20M14 26h12M14 32h8" stroke="#a78bca" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="g3" x1="8" y1="12" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4a1a9e" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconAI() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="8" stroke="url(#g4)" strokeWidth="2.2" />
      <path
        d="M24 8v6M24 34v6M8 24h6M34 24h6M12.5 12.5l4 4M31.5 31.5l4 4M35.5 12.5l-4 4M16.5 31.5l-4 4"
        stroke="#a855f7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="g4" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const services = [
  {
    title: "Desarrollo web y software",
    body:
      "Construimos plataformas digitales, sistemas a medida y experiencias web que convierten visitantes en clientes, incluyendo sistemas de gestión de stock, pedidos, reparto y tracking de repartidores.",
    icon: IconDev,
  },
  {
    title: "Marketing digital y Ads",
    body:
      "Estrategia SEO, campañas en Google y Meta optimizadas para generar demanda real con cada peso invertido.",
    icon: IconMarketing,
  },
  {
    title: "Consultoría IT",
    body:
      "Analizamos, planificamos y ejecutamos la transformación tecnológica de tu empresa con un roadmap claro.",
    icon: IconConsulting,
  },
  {
    title: "Asistente de IA y CRM",
    body:
      "Un asistente que responde tu WhatsApp automáticamente las 24 horas, toma pedidos y agenda turnos, con un CRM que ordena todos tus clientes y conversaciones en un solo lugar.",
    icon: IconAI,
  },
];

function IconInstant() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <path
        d="M17 4L7 18h7l-1 10 11-16h-7l1-8z"
        stroke="url(#gInstant)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="gInstant" x1="7" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <rect x="6" y="4" width="20" height="24" rx="2" stroke="url(#gOrders)" strokeWidth="2" />
      <path d="M11 11h10M11 16h10M11 21h6" stroke="#a78bca" strokeWidth="1.8" strokeLinecap="round" />
      <defs>
        <linearGradient id="gOrders" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconSchedule() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <rect x="5" y="7" width="22" height="19" rx="3" stroke="url(#gSchedule)" strokeWidth="2" />
      <path d="M5 13h22M11 4v6M21 4v6" stroke="#a78bca" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="19" r="2.2" fill="#c026d3" />
      <defs>
        <linearGradient id="gSchedule" x1="5" y1="7" x2="27" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4a1a9e" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconHandoff() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <circle cx="10" cy="11" r="4" stroke="url(#gHandoff)" strokeWidth="2" />
      <path d="M4 27c0-5 3-8 6-8s6 3 6 8" stroke="#a78bca" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 15l4 4-4 4M23 19h-9" stroke="#c026d3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="gHandoff" x1="6" y1="7" x2="14" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconCRM() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <rect x="4" y="6" width="24" height="20" rx="2" stroke="url(#gCRM)" strokeWidth="2" />
      <circle cx="11" cy="14" r="2.5" stroke="#a78bca" strokeWidth="1.8" />
      <path d="M7 22c0-2.5 1.8-4 4-4s4 1.5 4 4M19 12h6M19 17h6M19 22h4" stroke="#a78bca" strokeWidth="1.8" strokeLinecap="round" />
      <defs>
        <linearGradient id="gCRM" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconFollowUp() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <path
        d="M16 6a10 10 0 100 20 10 10 0 000-20z"
        stroke="url(#gFollowUp)"
        strokeWidth="2"
      />
      <path d="M16 11v6l4 3" stroke="#a78bca" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="gFollowUp" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4a1a9e" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconCampaign() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <path d="M5 13v6h5l8 5V8l-8 5H5z" stroke="url(#gCampaign)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M23 12a6 6 0 010 8" stroke="#a78bca" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="gCampaign" x1="5" y1="8" x2="23" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconReports() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <path d="M6 26V13M14 26V6M22 26v-9M26 26H6" stroke="url(#gReports)" strokeWidth="2.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="gReports" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const aiFeatures = [
  {
    title: "Responde al instante, 24/7",
    body: "Contesta las consultas frecuentes con el tono de tu marca, sin demoras ni ausencias.",
    icon: IconInstant,
  },
  {
    title: "Toma pedidos y cotiza",
    body: "Arma el pedido o presupuesto y lo deja listo para tu equipo.",
    icon: IconOrders,
  },
  {
    title: "Agenda turnos y reservas",
    body: "Coordina citas, reservas y entregas sin cruces de horario.",
    icon: IconSchedule,
  },
  {
    title: "Deriva a una persona cuando hace falta",
    body: "Cuando la conversación lo requiere, pasa el chat a tu equipo sin fricción.",
    icon: IconHandoff,
  },
  {
    title: "CRM integrado",
    body: "Todos los contactos, conversaciones y clientes ordenados en un solo panel. Sabés con quién hablaste, qué te preguntaron y en qué estado está cada oportunidad.",
    icon: IconCRM,
  },
  {
    title: "Seguimiento automático de clientes",
    body: "Mensajes de seguimiento y recordatorios automáticos para que ningún cliente quede sin respuesta.",
    icon: IconFollowUp,
  },
  {
    title: "Campañas y mensajes masivos",
    body: "Enviá promociones y novedades a tu base de clientes de forma segmentada.",
    icon: IconCampaign,
  },
  {
    title: "Reportes y métricas",
    body: "Cuántos mensajes entran, cuántos se responden solos y cuánto se vende, en tiempo real.",
    icon: IconReports,
  },
];

const why = [
  {
    title: "Integración total",
    body: "Un solo equipo para producto, crecimiento y operación tecnológica. Menos reuniones, más ejecución.",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M6 16h20M16 6v20"
          stroke="#a855f7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="10" stroke="rgba(168,85,247,0.35)" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Resultados desde el día uno",
    body: "Priorizamos entregables que impacten rápido en tu negocio, sin perder de vista la visión de largo plazo.",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M6 22l8-8 6 6 8-10"
          stroke="#7b2ff7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Sin burocracia",
    body: "Comunicación directa, decisiones ágiles y transparencia en cada etapa del proyecto.",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M8 20c4-6 12-6 16 0"
          stroke="#c026d3"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="12" r="2" fill="#a855f7" />
        <circle cx="22" cy="12" r="2" fill="#a855f7" />
      </svg>
    ),
  },
];

const testimonials = [
  {
    initials: "CE",
    name: "Equipo Ceramicasa",
    role: "San Rafael · Web y marketing",
    quote:
      "Necesitábamos que la web reflejara el catálogo y la seriedad del negocio, y que el marketing acompañe. Hoy tenemos un canal claro para clientes y un equipo que entiende comercio, no solo pantallas.",
  },
  {
    initials: "HS",
    name: "Hospital Español del Sur",
    role: "Institución · Mendoza",
    quote:
      "La web institucional y la app para socios nos permitieron ordenar información y trámites en un solo ecosistema multiplataforma. La implementación fue pensada para usuarios reales, no solo para el escritorio.",
  },
  {
    initials: "TR",
    name: "Equipo Tirua",
    role: "Plataforma de gestión",
    quote:
      "Armamos pagos, administración y herramientas operativas en un mismo sistema. Novarix entendió el modelo de negocio y fue iterando con nosotros hasta que el flujo diario realmente cerró.",
  },
];

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Lo que <span className="gradient-text">hacemos</span>
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-text-secondary">
              Cuatro pilares para escalar tu negocio con tecnología y crecimiento
              medible.
            </p>
          </ScrollReveal>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 0.1}>
                <article className="glass group relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm">
                  <div className="mb-5 inline-flex rounded-xl border border-border-subtle bg-bg-secondary/40 p-3 transition-colors group-hover:border-purple-bright/30">
                    <s.icon />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-text-primary">
                    {s.title}
                  </h3>
                  <p className="mt-3 flex-1 text-text-secondary leading-relaxed">{s.body}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-border-subtle bg-bg-secondary/30 px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(123,47,247,0.25),transparent_65%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Un asistente que responde tu <span className="gradient-text">WhatsApp</span> las 24 horas
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-text-secondary">
              Cada mensaje sin responder es un cliente que se pierde. El asistente de
              Novarix atiende, responde consultas, toma pedidos y agenda turnos solo,
              de día y de noche, incluso fines de semana.
            </p>
          </ScrollReveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {aiFeatures.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.06}>
                <article className="glass group relative flex h-full flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm">
                  <div className="mb-4 inline-flex w-fit rounded-xl border border-border-subtle bg-bg-secondary/40 p-2.5 transition-colors group-hover:border-purple-bright/30">
                    <f.icon />
                  </div>
                  <h3 className="font-display text-base font-semibold text-text-primary">
                    {f.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                    {f.body}
                  </p>
                </article>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={0.2}>
            <div className="mt-14 text-center">
              <Link
                href="/contacto"
                className="glow-btn inline-flex items-center justify-center rounded-full bg-white px-10 py-4 text-base font-semibold text-violet-dark transition-transform hover:scale-[1.03] focus-ring"
              >
                Quiero verlo funcionando
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-y border-border-subtle bg-bg-secondary/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Por qué <span className="gradient-text">Novarix</span>
            </h2>
          </ScrollReveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {why.map((w, i) => (
              <ScrollReveal key={w.title} delay={i * 0.12}>
                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-8 transition-all duration-300 hover:border-purple-bright/35 hover:shadow-glow-sm">
                  <div className="mb-4">{w.icon}</div>
                  <h3 className="font-display text-lg font-semibold text-text-primary">
                    {w.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">{w.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              Números que <span className="gradient-text">hablan</span>
            </h2>
          </ScrollReveal>
          <div className="mt-14 grid grid-cols-2 gap-8 lg:grid-cols-4">
            <ScrollReveal className="text-center" delay={0}>
              <p className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
                <AnimatedCounter value={3} prefix="+" suffix=" años" />
              </p>
              <p className="mt-2 text-sm text-text-secondary">Experiencia en el sector</p>
            </ScrollReveal>
            <ScrollReveal className="text-center" delay={0.08}>
              <p className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
                <AnimatedCounter value={15} prefix="+" suffix=" proyectos" />
              </p>
              <p className="mt-2 text-sm text-text-secondary">Entregados</p>
            </ScrollReveal>
            <ScrollReveal className="text-center" delay={0.16}>
              <p className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
                <AnimatedCounter value={100} suffix="%" />
              </p>
              <p className="mt-2 text-sm text-text-secondary">Clientes satisfechos</p>
            </ScrollReveal>
            <ScrollReveal className="text-center" delay={0.24}>
              <p className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
                <AnimatedCounter value={6} prefix="+" suffix=" rubros" />
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Comercio, salud, servicios locales, transporte, gastronomía y más
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Cómo <span className="gradient-text">trabajamos</span>
            </h2>
            <p className="mt-4 max-w-xl text-text-secondary">
              Un proceso claro, de izquierda a derecha, sin sorpresas.
            </p>
          </ScrollReveal>
          <div className="mt-14">
            <HomeProcess />
          </div>
        </div>
      </section>

      <section className="border-t border-border-subtle bg-bg-secondary/20 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Lo que dicen <span className="gradient-text">nuestros clientes</span>
            </h2>
          </ScrollReveal>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={0.1 * i}>
                <blockquote className="glass flex h-full flex-col rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm">
                  <p className="text-lg leading-relaxed text-text-primary/95">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-8 flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-gradient-to-br from-violet-mid to-purple font-display text-sm font-bold text-white"
                      aria-hidden
                    >
                      {t.initials}
                    </div>
                    <div>
                      <cite className="not-italic font-semibold text-text-primary">{t.name}</cite>
                      <p className="text-sm text-text-secondary">{t.role}</p>
                    </div>
                  </footer>
                </blockquote>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(123,47,247,0.35),transparent_65%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              ¿Listo para <span className="gradient-text">crecer</span>?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-text-secondary">
              Coordinemos una llamada breve y vemos cómo podemos ayudarte, sin vueltas.
            </p>
            <Link
              href="/contacto"
              className="glow-btn mt-10 inline-flex items-center justify-center rounded-full bg-white px-10 py-4 text-base font-semibold text-violet-dark transition-transform hover:scale-[1.03] focus-ring"
            >
              Hablemos de tu proyecto
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
