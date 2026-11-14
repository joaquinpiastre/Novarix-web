"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Markdown } from "@/components/ui/Markdown";
import { formatLabel, networkLabel } from "@/lib/marketing/content";
import type { AiMarketingPlan } from "@/lib/marketing/aiPlanSchema";
import { activatePlanAndCreateCalendar, generateMarketingPlanWithAi } from "./aiPlanActions";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Primer y ultimo dia del mes que viene. */
function nextMonth(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 0));
  return { start: iso(start), end: iso(end) };
}

export function AiPlanForm({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const router = useRouter();
  const def = nextMonth();
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const [budget, setBudget] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useTransition();

  return (
    <form
      className="mt-4 grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          setError(null);
          const res = await generateMarketingPlanWithAi({ client_id: clientId, period_start: start, period_end: end, budget, instructions });
          if (res.error) setError(res.error);
          else {
            onDone();
            router.refresh();
          }
        });
      }}
    >
      <p className="text-sm text-text-muted sm:col-span-2">
        Claude arma el plan completo con todo lo que sabe del cliente: rubro, kit de marca, métricas de Meta, lo que ya funcionó, lo que le falta, competidores,
        Radar y fechas comerciales. Incluye objetivos con metas, público, estrategia por canal, pauta, pilares y el calendario de piezas listo para producir.
      </p>
      <Input label="Desde" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
      <Input label="Hasta" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
      <Input label="Presupuesto de pauta mensual (opcional, ARS)" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Vacío = que lo recomiende la IA" />
      <div className="sm:col-span-2">
        <Textarea
          label="Indicaciones (opcional)"
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ej: este mes queremos vender más pólizas de auto; no usar TikTok; lanzan un producto el 15"
        />
      </div>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Button type="submit" disabled={pending} className="self-start">
          <Sparkles className="h-4 w-4" /> {pending ? "Armando el plan (1 a 3 minutos)…" : "Generar plan con IA"}
        </Button>
        {pending && <p className="text-xs text-text-muted">No cierres esta pestaña mientras se genera.</p>}
      </div>
    </form>
  );
}

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="rounded-xl border border-border p-3" open={open}>
      <summary className="cursor-pointer text-sm font-semibold text-text-primary">{title}</summary>
      <div className="mt-3 text-sm text-text-primary">{children}</div>
    </details>
  );
}

export function AiPlanView({
  plan,
  planId,
  clientId,
  status,
  calendarCreated,
  canActivate,
}: {
  plan: AiMarketingPlan;
  planId: string;
  clientId: string;
  status: string;
  calendarCreated: boolean;
  canActivate: boolean;
}) {
  const router = useRouter();
  const [pending, run] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; created?: number } | null>(null);
  if (plan.version !== 2) return null;
  const needsAction = status !== "active" || !calendarCreated;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="rounded-xl bg-accent/5 p-3 text-sm text-text-primary">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Plan armado con IA
        </p>
        {plan.executive_summary}
      </div>

      {canActivate && needsAction && (
        <div className="flex flex-col gap-2 rounded-xl border border-accent/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-primary">
            {status !== "active" ? "Revisalo y, si está bien, activalo: " : ""}se cargan las <strong>{plan.content_calendar.length} piezas</strong> en el calendario como “Idea”, con fecha, gancho y brief.
          </p>
          <Button
            disabled={pending}
            onClick={() =>
              run(async () => {
                setMsg(null);
                const res = await activatePlanAndCreateCalendar(planId, clientId);
                setMsg(res);
                router.refresh();
              })
            }
          >
            <CalendarPlus className="h-4 w-4" /> {pending ? "Cargando…" : status !== "active" ? "Activar y cargar al calendario" : "Cargar piezas al calendario"}
          </Button>
        </div>
      )}
      {msg?.error && <p className="text-sm text-danger">{msg.error}</p>}
      {msg?.created != null && (
        <p className="text-sm text-success">
          Plan activo. {msg.created} piezas cargadas en el <Link href="/calendar" className="underline">calendario</Link>.
        </p>
      )}

      <Section title="Objetivos y metas" open>
        <ol className="list-decimal space-y-2 pl-5">
          {plan.objectives.map((o, i) => (
            <li key={i}>
              <p className="font-medium">{o.objective}</p>
              <p className="text-xs text-text-muted">
                KPI: {o.kpi} · Meta: {o.target}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {plan.networks.map((n) => (
            <span key={n} className="rounded-full bg-surface-hover px-3 py-1">{networkLabel(n)}</span>
          ))}
          <span className="rounded-full bg-surface-hover px-3 py-1">
            Pauta: {plan.paid_recommended && plan.monthly_budget_ars > 0 ? `ARS ${plan.monthly_budget_ars.toLocaleString("es-AR")}/mes` : "no recomendada"}
          </span>
          {plan.deliverables.map((d) => (
            <span key={d.format} className="rounded-full bg-surface-hover px-3 py-1">{d.committed} {formatLabel(d.format)}</span>
          ))}
        </div>
      </Section>

      <Section title="Plan completo (estrategia, público, canales, pauta, KPIs, riesgos)">
        <Markdown source={plan.document_markdown} />
      </Section>

      <Section title={`Calendario de piezas (${plan.content_calendar.length})`}>
        <ul className="flex flex-col gap-2">
          {plan.content_calendar.map((c, i) => (
            <li key={i} className="rounded-lg bg-surface-hover p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="num text-xs text-text-muted">{new Date(`${c.date}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}</span>
                <Badge>{formatLabel(c.format)}</Badge>
                <span className="text-xs text-text-muted">{c.channels.map(networkLabel).join(", ")} · {c.pillar}</span>
              </div>
              <p className="mt-1 font-medium">{c.title}</p>
              <p className="text-xs">🎬 {c.hook}</p>
              <p className="text-xs text-text-muted">{c.brief}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
