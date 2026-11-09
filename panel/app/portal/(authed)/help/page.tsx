import { Card, CardTitle } from "@/components/ui/Card";
import { SLA_HOURS_BY_PRIORITY, TICKET_PRIORITY_LABELS } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "¿Cómo abro un ticket?",
    a: 'Entrá a "Tickets" en el menú y tocá "Nuevo ticket". Elegí el tipo (reclamo, pedido, soporte técnico, consulta, contenido o facturación), contanos qué necesitás y, si hace falta, adjuntá una captura o foto.',
  },
  {
    q: "¿Cómo apruebo una pieza de contenido?",
    a: 'Entrá a "Marketing" → "Contenido". Las piezas que están esperando tu aprobación aparecen arriba. Podés aprobarlas directamente o pedir cambios con un comentario.',
  },
  {
    q: "¿Cuánto tardan en responderme un ticket?",
    a: "Depende de la prioridad que tenga el ticket (horario hábil, lunes a viernes de 9 a 18, hora de Argentina).",
  },
  {
    q: "¿Puedo reabrir un ticket ya resuelto?",
    a: "Sí, hasta 7 días después de que se marcó como resuelto. Después de eso, te pedimos que abras uno nuevo.",
  },
  {
    q: "¿Quién puede ver mis tickets y mis datos?",
    a: "Solo las personas de tu empresa con acceso al portal y el equipo de Novarix asignado a tu cuenta. Nunca otro cliente.",
  },
];

export default function PortalHelpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Centro de ayuda</h1>
        <p className="text-sm text-text-muted">Preguntas frecuentes sobre el portal.</p>
      </div>

      <Card>
        <CardTitle>Tiempos de respuesta por prioridad</CardTitle>
        <ul className="mt-3 divide-y divide-border">
          {(Object.entries(SLA_HOURS_BY_PRIORITY) as [keyof typeof TICKET_PRIORITY_LABELS, number][]).map(
            ([priority, hours]) => (
              <li key={priority} className="flex items-center justify-between py-2 text-sm">
                <span className="text-text-primary">{TICKET_PRIORITY_LABELS[priority]}</span>
                <span className="text-text-muted">{hours} horas hábiles</span>
              </li>
            )
          )}
        </ul>
      </Card>

      {FAQS.map((f) => (
        <Card key={f.q}>
          <CardTitle>{f.q}</CardTitle>
          <p className="mt-2 text-sm text-text-primary">{f.a}</p>
        </Card>
      ))}
    </div>
  );
}
