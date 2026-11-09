"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageSquarePlus, Send, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ChatEntry } from "@/lib/ai/agent";
import { deleteConversation, sendAssistantMessage } from "./actions";

// Links internos que devuelve la IA (/calendar?item=…, /clients/<id>, …) se
// vuelven clickeables; el resto del texto se muestra tal cual.
const LINK_RE = /(\/(?:calendar|clients|tasks|tickets|marketing|reminders|finance|systems)(?:[/?][^\s)\]]*)?)/g;

function RichText({ text }: { text: string }) {
  return (
    <>
      {text
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .split(LINK_RE)
        .map((part, i) =>
          i % 2 === 1 ? (
            <Link key={i} href={part} className="text-accent underline underline-offset-2">
              {part}
            </Link>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          )
        )}
    </>
  );
}

export function AssistantChat({
  configured,
  conversations,
  conversationId,
  initialEntries,
  suggestions,
}: {
  configured: boolean;
  conversations: { id: string; title: string; updated_at: string }[];
  conversationId: string | null;
  initialEntries: ChatEntry[];
  suggestions: string[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<ChatEntry[]>(initialEntries);
  const [currentId, setCurrentId] = useState<string | null>(conversationId);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, pending]);

  function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setDraft("");
    setEntries((prev) => [...prev, { role: "user", text: message, actions: [] }]);
    startTransition(async () => {
      const result = await sendAssistantMessage(currentId, message);
      if (result.entries) setEntries(result.entries);
      if (result.error) setError(result.error);
      if (result.conversationId && result.conversationId !== currentId) {
        setCurrentId(result.conversationId);
        router.replace(`/assistant?c=${result.conversationId}`, { scroll: false });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 lg:w-64">
        <Link
          href="/assistant"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-hover px-4 py-2 text-sm font-medium text-text-primary hover:border-accent"
        >
          <MessageSquarePlus size={16} />
          Nueva conversación
        </Link>
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto lg:max-h-[70vh]">
          {conversations.map((c) => (
            <li key={c.id} className="group flex items-center gap-1">
              <Link
                href={`/assistant?c=${c.id}`}
                className={clsx(
                  "flex-1 truncate rounded-lg px-3 py-1.5 text-sm",
                  c.id === currentId ? "bg-surface-hover text-text-primary" : "text-text-muted hover:text-text-primary"
                )}
              >
                {c.title}
              </Link>
              <button
                type="button"
                aria-label="Borrar conversación"
                onClick={async () => {
                  if (!confirm("¿Borrar esta conversación?")) return;
                  await deleteConversation(c.id);
                  if (c.id === currentId) router.push("/assistant");
                }}
                className="p-1 text-text-muted opacity-0 hover:text-danger group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <Card className="flex min-h-[70vh] flex-1 flex-col p-0">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Sparkles size={18} className="text-accent" />
          <div>
            <h1 className="text-sm font-semibold text-text-primary">Asistente IA</h1>
            <p className="text-xs text-text-muted">
              Consulta y carga datos del panel con tus permisos. No puede borrar registros ni tocar el sistema.
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {!configured && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              La IA todavía no está activada: falta cargar ANTHROPIC_API_KEY en Railway.
            </p>
          )}

          {entries.length === 0 && configured && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-muted">Pedile lo que necesites. Por ejemplo:</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-text-primary hover:border-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {entries.map((e, idx) => (
            <div key={idx} className={clsx("flex", e.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={clsx(
                  "max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
                  e.role === "user" ? "bg-accent text-white" : "border border-border bg-surface-hover text-text-primary"
                )}
              >
                {e.actions.length > 0 && (
                  <ul className="mb-2 flex flex-wrap gap-1.5">
                    {e.actions.map((a, i) => (
                      <li
                        key={i}
                        className={clsx(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                          !a.ok ? "bg-danger/10 text-danger" : a.write ? "bg-success/10 text-success" : "bg-surface text-text-muted"
                        )}
                      >
                        {a.ok ? <Check size={11} /> : <TriangleAlert size={11} />}
                        {a.label}
                      </li>
                    ))}
                  </ul>
                )}
                {e.text && (
                  <div className="whitespace-pre-wrap leading-relaxed">
                    <RichText text={e.text} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {pending && <p className="text-sm text-text-muted">Pensando y revisando el panel…</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={2}
            disabled={!configured}
            placeholder="Escribí tu pedido… (Enter para enviar, Shift+Enter para salto de línea)"
            className="flex-1 resize-none rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <Button type="submit" disabled={pending || !draft.trim() || !configured} aria-label="Enviar">
            <Send size={16} />
          </Button>
        </form>
      </Card>
    </div>
  );
}
