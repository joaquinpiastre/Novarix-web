"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkPlus, ExternalLink, RotateCcw, Send, Trash2, Users } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { IDEA_SOURCE_LABELS, type ChatMessage, type IdeaBankItem } from "@/lib/ideas/types";
import type { CommercialDate } from "@/lib/ideas/commercialDates";
import type { VideoCardData } from "@/lib/trends/view";
import { formatCount } from "@/lib/trends/view";
import { VideoCard } from "../radar/_components/VideoCard";
import {
  addCommercialDate,
  addCompetitor,
  chatAction,
  competitorTopPosts,
  deleteIdea,
  removeCommercialDate,
  removeCompetitor,
  resetChatAction,
  saveIdea,
  sendIdeaToCalendar,
} from "./actions";
import { DateIdeasButton } from "./ToolForms";

// ===== Banco de ideas =====

export function BankPanel({ clientId, items }: { clientId: string; items: IdeaBankItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      router.refresh();
    });

  if (items.length === 0) {
    return <Card className="text-sm text-text-muted">El banco está vacío. Guardá ideas desde cualquier herramienta, el chat o el Radar.</Card>;
  }
  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}
      {items.map((i) => (
        <Card key={i.id} className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{IDEA_SOURCE_LABELS[i.source] ?? i.source}</Badge>
            {i.pillar && <Badge>{i.pillar}</Badge>}
            {i.content_item_id && <Badge tone="success">En calendario</Badge>}
            <span className="text-xs text-text-muted">
              {new Date(i.created_at).toLocaleDateString("es-AR")}
              {i.author ? ` · ${i.author}` : ""}
            </span>
          </div>
          <p className="font-medium text-text-primary">{i.title}</p>
          {i.body && (
            <details className="text-sm text-text-muted">
              <summary className="cursor-pointer">Ver detalle</summary>
              <p className="mt-1 whitespace-pre-line">{i.body}</p>
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            {i.content_item_id ? (
              <Link href={`/calendar?item=${i.content_item_id}`} className="text-sm text-accent underline">Ver en el calendario</Link>
            ) : (
              <>
                <Button variant="secondary" disabled={pending} onClick={() => act(() => sendIdeaToCalendar(i.id, false))}>Al calendario</Button>
                <Button variant="ghost" disabled={pending} onClick={() => act(() => sendIdeaToCalendar(i.id, true))}>
                  <Send className="h-4 w-4" /> Al cliente para aprobar
                </Button>
              </>
            )}
            {i.reference_url && (
              <a href={i.reference_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 px-2 text-sm text-text-muted">
                <ExternalLink className="h-4 w-4" /> Referencia
              </a>
            )}
            <Button variant="ghost" disabled={pending} onClick={() => confirm("¿Borrar la idea?") && act(() => deleteIdea(i.id))} title="Borrar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ===== Competidores =====

interface Competitor {
  id: string;
  name: string;
  ig_username: string | null;
  fb_page_id: string | null;
  notes: string | null;
}

function adLibraryUrl(c: Competitor): string {
  const base = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=AR&media_type=all";
  return c.fb_page_id
    ? `${base}&search_type=page&view_all_page_id=${c.fb_page_id}`
    : `${base}&search_type=keyword_unordered&q=${encodeURIComponent(c.name)}`;
}

export function CompetitorsPanel({
  clientId,
  competitors,
  clients,
  igConfigured,
}: {
  clientId: string;
  competitors: Competitor[];
  clients: { id: string; name: string }[];
  igConfigured: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", ig_username: "", fb_page_id: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Record<string, { cards?: VideoCardData[]; followers?: number | null; error?: string }>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="grid gap-3 sm:grid-cols-5 sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const res = await addCompetitor(clientId, form);
              if (res.error) setError(res.error);
              else {
                setForm({ name: "", ig_username: "", fb_page_id: "", notes: "" });
                router.refresh();
              }
            });
          }}
        >
          <Input label="Competidor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Instagram (@usuario)" value={form.ig_username} onChange={(e) => setForm({ ...form, ig_username: e.target.value })} />
          <Input label="ID página de Facebook (opcional)" inputMode="numeric" value={form.fb_page_id} onChange={(e) => setForm({ ...form, fb_page_id: e.target.value })} />
          <Input label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" disabled={pending || !form.name.trim()}>
            <Users className="h-4 w-4" /> Agregar
          </Button>
          {error && <p className="text-sm text-danger sm:col-span-5">{error}</p>}
        </form>
        <p className="mt-3 text-xs text-text-muted">
          Los posts se leen con Business Discovery de Instagram (solo cuentas Business o Creator). La API de la Biblioteca de Anuncios de Meta solo devuelve anuncios
          comerciales que llegaron a la UE o el Reino Unido; para Argentina abrimos la Biblioteca filtrada por anunciante.
          {!igConfigured && " Falta configurar la cuenta de Instagram de búsqueda (TRENDS_IG_ACCESS_TOKEN)."}
        </p>
      </Card>

      {competitors.length === 0 && <p className="text-sm text-text-muted">Todavía no hay competidores cargados para este cliente.</p>}
      {competitors.map((c) => {
        const p = posts[c.id];
        return (
          <Card key={c.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-text-primary">{c.name}</p>
                <p className="text-xs text-text-muted">
                  {c.ig_username ? `@${c.ig_username}` : "sin Instagram"}
                  {p?.followers != null ? ` · ${formatCount(p.followers)} seguidores` : ""}
                  {c.notes ? ` · ${c.notes}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.ig_username && (
                  <Button
                    variant="secondary"
                    disabled={loading === c.id}
                    onClick={async () => {
                      setLoading(c.id);
                      const res = await competitorTopPosts(c.id);
                      setPosts((prev) => ({ ...prev, [c.id]: res }));
                      setLoading(null);
                    }}
                  >
                    {loading === c.id ? "Cargando…" : "Ver mejores posts"}
                  </Button>
                )}
                <a href={adLibraryUrl(c)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-border px-3 text-sm text-text-primary hover:bg-surface-hover">
                  <ExternalLink className="h-4 w-4" /> Biblioteca de anuncios
                </a>
                <Button variant="ghost" title="Quitar" onClick={() => confirm(`¿Quitar a ${c.name}?`) && start(async () => { await removeCompetitor(c.id); router.refresh(); })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {p?.error && <p className="text-sm text-danger">{p.error}</p>}
            {p?.cards && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {p.cards.map((v) => <VideoCard key={v.videoId} v={v} clientId={clientId} clients={clients} />)}
                {p.cards.length === 0 && <p className="text-sm text-text-muted">No hay reels recientes.</p>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ===== Fechas comerciales =====

export function DatesPanel({ clientId, dates, today, canAddGlobal }: { clientId: string; dates: (CommercialDate & { days: number; customId?: string })[]; today: string; canAddGlobal: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", date: "", notes: "", only_this_client: true });
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="grid gap-3 sm:grid-cols-4 sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const res = await addCommercialDate(clientId, form);
              if (res.error) setError(res.error);
              else {
                setForm({ name: "", date: "", notes: "", only_this_client: true });
                router.refresh();
              }
            });
          }}
        >
          <Input label="Fecha propia (aniversario, evento local…)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Día" type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" disabled={pending || !form.name.trim() || !form.date}>Agregar</Button>
          {canAddGlobal && (
            <label className="flex items-center gap-2 text-sm text-text-primary sm:col-span-4">
              <input type="checkbox" checked={form.only_this_client} onChange={(e) => setForm({ ...form, only_this_client: e.target.checked })} />
              Solo para este cliente (destildado: para todos los clientes)
            </label>
          )}
          {error && <p className="text-sm text-danger sm:col-span-4">{error}</p>}
        </form>
        <p className="mt-3 text-xs text-text-muted">El equipo recibe un aviso unos días antes de cada fecha. Las marcadas como estimadas las fija cada año un organizador (CACE, DGE, Gobierno de Mendoza): confirmalas.</p>
      </Card>

      {dates.map((d) => (
        <Card key={d.key} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-text-primary">{d.name}</p>
                <Badge tone={d.days <= 14 ? "warning" : "neutral"}>{d.days === 0 ? "Hoy" : `en ${d.days} días`}</Badge>
                {d.estimated && <Badge>Estimada</Badge>}
                {d.scope !== "nacional" && <Badge tone="accent">{d.scope === "mendoza" ? "Mendoza" : "Propia"}</Badge>}
              </div>
              <p className="text-xs text-text-muted">
                {new Date(`${d.date}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {d.hint ? ` · ${d.hint}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(open === d.key ? null : d.key)}>{open === d.key ? "Cerrar" : "Ideas"}</Button>
              {d.customId && (
                <Button variant="ghost" title="Borrar fecha" onClick={() => start(async () => { await removeCommercialDate(d.customId!, clientId); router.refresh(); })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {open === d.key && <DateIdeasButton clientId={clientId} name={d.name} date={d.date} hint={d.hint} />}
        </Card>
      ))}
    </div>
  );
}

// ===== Chat de estrategia =====

export function ChatPanel({ clientId, initial }: { clientId: string; initial: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    start(async () => {
      const res = await chatAction(clientId, text);
      if (res.error) setError(res.error);
      if (res.messages) setMessages(res.messages);
    });
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <CardTitle>Chat de estrategia</CardTitle>
        <Button
          variant="ghost"
          disabled={pending || messages.length === 0}
          onClick={() => start(async () => { await resetChatAction(clientId); setMessages([]); setSaved(new Set()); })}
        >
          <RotateCcw className="h-4 w-4" /> Nueva charla
        </Button>
      </div>
      <p className="text-xs text-text-muted">La IA conoce el plan, las métricas, el kit de marca y lo último del Radar de este cliente. Las respuestas útiles se guardan como ideas.</p>
      <div className="flex max-h-[60vh] min-h-[200px] flex-col gap-3 overflow-y-auto rounded-xl bg-surface-hover/50 p-3">
        {messages.length === 0 && <p className="m-auto text-sm text-text-muted">Ej: “¿Qué serie de reels haríamos este mes para subir alcance?”</p>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-sm text-accent-fg" : "max-w-[95%] rounded-2xl bg-surface px-3 py-2 text-sm text-text-primary"}>
            <p className="whitespace-pre-line">{m.content}</p>
            {m.role === "assistant" && (
              <button
                type="button"
                disabled={saved.has(i)}
                onClick={async () => {
                  const firstLine = m.content.split("\n").find((l) => l.trim())?.replace(/^[#*\-\s]+/, "").slice(0, 120) ?? "Idea del chat";
                  const res = await saveIdea(clientId, { title: firstLine, body: m.content, source: "chat" });
                  if (!res.error) setSaved((s) => new Set(s).add(i));
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-accent disabled:text-success"
              >
                <BookmarkPlus className="h-3.5 w-3.5" /> {saved.has(i) ? "Guardada en el banco" : "Guardar como idea"}
              </button>
            )}
          </div>
        ))}
        {pending && <p className="text-sm text-text-muted">Pensando…</p>}
        <div ref={bottom} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex-1">
          <Textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Preguntá lo que quieras sobre este cliente…"
          />
        </div>
        <Button type="submit" disabled={pending || !draft.trim()}>
          <Send className="h-4 w-4" /> Enviar
        </Button>
      </form>
    </Card>
  );
}
