"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clapperboard, Megaphone, Plus } from "lucide-react";
import clsx from "clsx";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ContentItemDialog, type Option } from "@/components/content/ContentItemDialog";
import { formatLabel, networkLabel } from "@/lib/marketing/content";
import { CONTENT_STATUS_LABELS, type ContentItem, type ContentStatus } from "@/lib/types/domain";
import { mendozaDateKey, mendozaTime } from "@/lib/utils/dates";

export interface CalendarItem extends ContentItem {
  client_name: string;
  assignee_name: string | null;
}

interface CalendarEvent {
  kind: "recording" | "publish";
  at: string;
  item: CalendarItem;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const STATUS_TONE: Record<ContentStatus, string> = {
  idea: "border-l-text-muted",
  copy: "border-l-warning",
  diseno: "border-l-warning",
  revision_interna: "border-l-accent",
  aprobacion_cliente: "border-l-accent",
  programado: "border-l-success",
  publicado: "border-l-success",
};

function EventChip({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const { item, kind } = event;
  const Icon = kind === "recording" ? Clapperboard : Megaphone;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={clsx(
        "w-full rounded-md border border-border border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight transition-colors hover:border-accent",
        STATUS_TONE[item.status],
        kind === "recording" ? "bg-surface-hover" : "bg-surface opacity-75"
      )}
      title={`${kind === "recording" ? "Grabación" : "Publicación"} · ${item.client_name} · ${item.title}`}
    >
      <span className="flex items-center gap-1 text-text-muted">
        <Icon size={11} className="shrink-0" />
        {mendozaTime(event.at)} · {item.client_name}
      </span>
      <span className="line-clamp-2 font-medium text-text-primary">{item.title}</span>
    </button>
  );
}

export function CalendarView({
  month,
  days,
  items,
  unscheduled,
  focused,
  clients,
  marketers,
  filters,
  canManage,
  canUseAi,
}: {
  month: string;
  days: string[];
  items: CalendarItem[];
  unscheduled: CalendarItem[];
  focused: CalendarItem | null;
  clients: Option[];
  marketers: Option[];
  filters: { client: string; person: string };
  canManage: boolean;
  canUseAi: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ item: CalendarItem | null; date?: string } | null>(
    focused ? { item: focused } : null
  );
  useEffect(() => {
    if (focused) setDialog({ item: focused });
  }, [focused]);

  const [showPublish, setShowPublish] = useState(true);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const push = (e: CalendarEvent) => {
      const key = mendozaDateKey(e.at);
      map.set(key, [...(map.get(key) ?? []), e]);
    };
    for (const item of items) {
      if (item.recording_at) push({ kind: "recording", at: item.recording_at, item });
      if (showPublish && item.scheduled_at) push({ kind: "publish", at: item.scheduled_at, item });
    }
    for (const list of Array.from(map.values())) list.sort((a, b) => a.at.localeCompare(b.at));
    return map;
  }, [items, showPublish]);

  const monthDate = parseISO(`${month}-01`);
  const todayKey = mendozaDateKey(new Date().toISOString());
  const recordingsThisMonth = items.filter((i) => i.recording_at && mendozaDateKey(i.recording_at).startsWith(month)).length;

  function hrefWith(changes: Record<string, string>) {
    const params = new URLSearchParams({ m: month, client: filters.client, person: filters.person, ...changes });
    for (const [k, v] of Array.from(params.entries())) if (!v) params.delete(k);
    return `/calendar?${params.toString()}`;
  }

  const dialogClients: Option[] = clients.length
    ? clients
    : Array.from(new Map(items.concat(unscheduled).map((i) => [i.client_id, { id: i.client_id, name: i.client_name }])).values());

  const openNew = (date?: string) => canManage && setDialog({ item: null, date });
  const openItem = (item: CalendarItem) => setDialog({ item });


  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Calendario de contenido</h1>
          <p className="text-sm text-text-muted">
            {canManage
              ? "Qué se graba y cuándo, de todos los clientes. Tocá un día para agendar una pieza."
              : "El contenido que tenés delegado."}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => openNew()}>
            <Plus size={16} />
            Nueva pieza
          </Button>
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Link href={hrefWith({ m: format(subMonths(monthDate, 1), "yyyy-MM") })} className="rounded-xl p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary" aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </Link>
          <span className="min-w-[150px] text-center text-sm font-semibold capitalize text-text-primary">
            {format(monthDate, "MMMM yyyy", { locale: es })}
          </span>
          <Link href={hrefWith({ m: format(addMonths(monthDate, 1), "yyyy-MM") })} className="rounded-xl p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary" aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </Link>
          <Link href={hrefWith({ m: format(new Date(), "yyyy-MM") })} className="ml-1 text-xs text-accent hover:underline">
            Hoy
          </Link>
        </div>

        {canManage && (
          <>
            <select
              value={filters.client}
              onChange={(e) => router.push(hrefWith({ client: e.target.value }))}
              className="rounded-xl border border-border bg-surface-hover px-3 py-1.5 text-sm text-text-primary"
              aria-label="Filtrar por cliente"
            >
              <option value="">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filters.person}
              onChange={(e) => router.push(hrefWith({ person: e.target.value }))}
              className="rounded-xl border border-border bg-surface-hover px-3 py-1.5 text-sm text-text-primary"
              aria-label="Filtrar por responsable"
            >
              <option value="">Todo el equipo</option>
              {marketers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={showPublish} onChange={(e) => setShowPublish(e.target.checked)} />
          Mostrar publicaciones
        </label>
        <div className="flex w-full flex-wrap gap-4 text-xs text-text-muted sm:w-auto">
          <span className="flex items-center gap-1"><Clapperboard size={12} /> Grabación ({recordingsThisMonth})</span>
          <span className="flex items-center gap-1"><Megaphone size={12} /> Publicación</span>
        </div>
      </Card>

      {/* Escritorio: grilla mensual */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = day.startsWith(month);
            const events = eventsByDay.get(day) ?? [];
            return (
              <div
                key={day}
                onClick={() => openNew(day)}
                className={clsx(
                  "min-h-[120px] border-b border-r border-border p-1.5",
                  inMonth ? "bg-surface" : "bg-bg",
                  canManage && "cursor-pointer hover:bg-surface-hover/50"
                )}
              >
                <span
                  className={clsx(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    day === todayKey ? "bg-accent font-semibold text-accent-fg" : inMonth ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {events.map((e) => (
                    <EventChip key={`${e.kind}-${e.item.id}`} event={e} onOpen={() => openItem(e.item)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Celular: agenda por día */}
      <div className="flex flex-col gap-3 md:hidden">
        {days
          .filter((d) => d.startsWith(month) && (eventsByDay.get(d)?.length ?? 0) > 0)
          .map((day) => (
            <Card key={day} className="p-3">
              <p className={clsx("text-sm font-semibold capitalize", day === todayKey ? "text-accent" : "text-text-primary")}>
                {format(parseISO(day), "EEEE d", { locale: es })}
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {(eventsByDay.get(day) ?? []).map((e) => (
                  <EventChip key={`${e.kind}-${e.item.id}`} event={e} onOpen={() => openItem(e.item)} />
                ))}
              </div>
            </Card>
          ))}
        {!days.some((d) => d.startsWith(month) && (eventsByDay.get(d)?.length ?? 0) > 0) && (
          <p className="text-sm text-text-muted">No hay nada agendado este mes.</p>
        )}
      </div>

      <Card>
        <CardTitle>Sin fecha de grabación</CardTitle>
        <p className="mt-1 text-xs text-text-muted">Ideas y piezas en curso que todavía no tienen día. Abrilas para agendarlas.</p>
        {unscheduled.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Todo agendado.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {unscheduled.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className="flex w-full flex-wrap items-center gap-2 py-2 text-left text-sm hover:text-accent"
                >
                  <span className="font-medium text-text-primary">{item.title}</span>
                  <span className="text-xs text-text-muted">
                    {item.client_name} · {formatLabel(item.format)} · {(item.channels ?? []).map(networkLabel).join(", ")}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {item.assignee_name && <span className="text-xs text-text-muted">{item.assignee_name}</span>}
                    <Badge>{CONTENT_STATUS_LABELS[item.status]}</Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ContentItemDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        item={dialog?.item ?? null}
        defaults={{
          client_id: filters.client || "",
          assigned_to: filters.person || "",
          recording_at: dialog?.date ? `${dialog.date}T10:00` : "",
        }}
        clients={dialogClients}
        marketers={marketers}
        canUseAi={canUseAi}
        readOnly={!canManage}
      />
    </div>
  );
}
