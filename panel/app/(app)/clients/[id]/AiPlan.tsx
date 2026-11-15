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
import { activatePlanAndCreateCalendar, addPlanPiecesToCalendar, generateMarketingPlanWithAi } from "./aiPlanActions";

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
  const [frequency, setFrequency] = useState<"auto" | "daily" | "5w" | "3w">("daily");
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useTransition();

  return (
    <form
      className="mt-4 grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          setError(null);
          const res = await generateMarketingPlanWithAi({ client_id: clientId, period_start: start, period_end: end, budget, instructions, frequency });
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
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-text-muted">Frecuencia de publicación</span>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as typeof frequency)}
          className="min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="daily">Todos los días (planes de hasta 1 mes)</option>
          <option value="5w">5 por semana (lunes a viernes)</option>
          <option value="3w">3 por semana</option>
          <option value="auto">Que decida la IA</option>
        </select>
      </label>
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
  calendarItems = {},
}: {
  calendarItems?: Record<string, string>;
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
            {status !== "active"
              ? "¿Te sirve todo el plan? Activalo y se cargan todas las piezas en el calendario con las fechas sugeridas. Si preferís elegir, usá la lista de abajo."
              : "Cargar en el calendario todas las piezas que faltan, con las fechas sugeridas."}
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
            <CalendarPlus className="h-4 w-4" /> {pending ? "Cargando…" : status !== "active" ? "Activar y cargar todo" : "Cargar todo lo que falta"}
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

      <Section title={`Contenido del plan: ${plan.content_calendar.length} piezas (elegí cuáles van al calendario)`} open>
        <PiecePicker plan={plan} planId={planId} clientId={clientId} calendarItems={calendarItems} />
      </Section>
    </div>
  );
}

function shortDate(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Lista de piezas del plan: se elige cuáles pasan al calendario de contenido y
 * con qué fecha de grabación y de publicación. Las que ya están se marcan.
 */
function PiecePicker({
  plan,
  planId,
  clientId,
  calendarItems,
}: {
  plan: AiMarketingPlan;
  planId: string;
  clientId: string;
  calendarItems: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, run] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dates, setDates] = useState<Record<number, { rec: string; pub: string }>>(() =>
    Object.fromEntries(plan.content_calendar.map((c, i) => [i, { rec: c.date, pub: c.date }]))
  );
  const [msg, setMsg] = useState<{ error?: string; created?: number } | null>(null);

  const pendingIdx = plan.content_calendar.map((_, i) => i).filter((i) => !calendarItems[String(i)]);
  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const add = (indexes: number[]) =>
    run(async () => {
      setMsg(null);
      const res = await addPlanPiecesToCalendar(
        planId,
        clientId,
        indexes.map((i) => ({ index: i, recording_date: dates[i].rec, publish_date: dates[i].pub }))
      );
      setMsg(res);
      if (!res.error) {
        setSelected(new Set());
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl bg-surface-hover/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-muted">
          Tildá las piezas que quieras hacer, ajustá cuándo se graban y cuándo se publican, y pasalas al calendario. {pendingIdx.length} sin agendar ·{" "}
          {plan.content_calendar.length - pendingIdx.length} ya en el calendario.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ghost" type="button" onClick={() => setSelected(selected.size === pendingIdx.length ? new Set() : new Set(pendingIdx))}>
            {selected.size === pendingIdx.length && pendingIdx.length > 0 ? "Destildar todas" : "Tildar todas"}
          </Button>
          <Button type="button" disabled={pending || selected.size === 0} onClick={() => add(Array.from(selected))}>
            <CalendarPlus className="h-4 w-4" /> {pending ? "Agregando…" : `Agregar al calendario (${selected.size})`}
          </Button>
        </div>
      </div>
      {msg?.error && <p className="text-sm text-danger">{msg.error}</p>}
      {msg?.created != null && (
        <p className="text-sm text-success">
          {msg.created} pieza{msg.created === 1 ? "" : "s"} agregada{msg.created === 1 ? "" : "s"} al <Link href="/calendar" className="underline">calendario</Link>.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {plan.content_calendar.map((c, i) => {
          const itemId = calendarItems[String(i)];
          return (
            <li key={i} className={`rounded-xl border p-3 ${selected.has(i) ? "border-accent bg-accent/5" : "border-border bg-surface-hover/40"}`}>
              <div className="flex items-start gap-3">
                {itemId ? (
                  <span className="mt-0.5 text-success" title="Ya está en el calendario">✓</span>
                ) : (
                  <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={selected.has(i)} onChange={() => toggle(i)} aria-label={`Elegir ${c.title}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="num text-xs text-text-muted">{shortDate(c.date)}</span>
                    <Badge>{formatLabel(c.format)}</Badge>
                    <span className="text-xs text-text-muted">{c.channels.map(networkLabel).join(", ")} · {c.pillar}</span>
                  </div>
                  <p className="mt-1 font-medium">{c.title}</p>
                  <p className="text-xs">🎬 {c.hook}</p>
                  <p className="text-xs text-text-muted">{c.brief}</p>

                  {itemId ? (
                    <Link href={`/calendar?item=${itemId}`} className="mt-2 inline-block text-xs text-success underline">
                      Ya está en el calendario · ver
                    </Link>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1 text-[11px] text-text-muted">
                        Grabar el
                        <input
                          type="date"
                          value={dates[i].rec}
                          onChange={(e) => setDates((d) => ({ ...d, [i]: { ...d[i], rec: e.target.value } }))}
                          className="min-h-9 rounded-lg border border-border bg-surface px-2 text-xs text-text-primary"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-text-muted">
                        Publicar el
                        <input
                          type="date"
                          value={dates[i].pub}
                          onChange={(e) => setDates((d) => ({ ...d, [i]: { ...d[i], pub: e.target.value } }))}
                          className="min-h-9 rounded-lg border border-border bg-surface px-2 text-xs text-text-primary"
                        />
                      </label>
                      <Button type="button" variant="secondary" disabled={pending || !dates[i].rec || !dates[i].pub} onClick={() => add([i])}>
                        <CalendarPlus className="h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
