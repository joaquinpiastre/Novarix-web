import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contactá a Novarix Digital Agency: primera consulta sin costo. Email, WhatsApp y formulario. Respuesta en menos de 24hs hábiles.",
  openGraph: {
    title: "Contacto | Novarix Digital Agency",
    description: "Hablemos de lo que necesitás. Consulta inicial sin costo.",
    url: "/contacto",
  },
};

export default function ContactoPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-purple/20 blur-[100px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Hablemos de lo que <span className="gradient-text">necesitás</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-text-secondary">
              Completá el formulario o escribinos por el canal que te quede más cómodo.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-24 lg:grid-cols-3 lg:gap-10 lg:px-8">
        <div className="lg:col-span-2">
          <ContactForm />
        </div>
        <aside className="space-y-6">
          <ScrollReveal variant="slideLeft" delay={0.1}>
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold text-text-primary">
                Datos de contacto
              </h2>
              <ul className="mt-5 space-y-4 text-text-secondary">
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary/80">
                    Email
                  </span>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mt-1 inline-block text-text-primary transition-colors hover:text-purple-bright focus-ring rounded"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary/80">
                    WhatsApp
                  </span>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-text-primary transition-colors hover:text-purple-bright focus-ring rounded"
                  >
                    {WHATSAPP_DISPLAY}
                  </a>
                </li>
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary/80">
                    Horario
                  </span>
                  <p className="mt-1 text-text-primary">Lun–Vie 9 a 18hs (ARG)</p>
                </li>
                <li>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary/80">
                    Tiempo de respuesta
                  </span>
                  <p className="mt-1 text-text-primary">Menos de 24hs hábiles</p>
                </li>
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="slideLeft" delay={0.18}>
            <div className="rounded-2xl border border-purple-bright/30 bg-gradient-to-br from-violet-dark/50 to-purple/20 p-6 shadow-glow-sm">
              <p className="font-display text-lg font-semibold text-text-primary">
                Primera consulta sin costo
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Te orientamos sobre el mejor camino para tu proyecto, sin compromiso.
              </p>
              <Link
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-purple-bright hover:underline focus-ring rounded"
              >
                O por WhatsApp →
              </Link>
            </div>
          </ScrollReveal>
        </aside>
      </div>
    </div>
  );
}
