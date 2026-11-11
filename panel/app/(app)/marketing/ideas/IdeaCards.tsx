"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookmarkPlus, CalendarPlus, Copy, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { IdeaCard } from "@/lib/ideas/types";
import { saveIdea, sendIdeaToCalendar } from "./actions";

export function IdeaCardView({ card, clientId, source }: { card: IdeaCard; clientId: string; source: string }) {
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const ensureSaved = async (): Promise<string | null> => {
    if (ideaId) return ideaId;
    const res = await saveIdea(clientId, { title: card.title, body: card.body, format: card.format, pillar: card.pillar, source });
    if (res.error || !res.id) {
      setError(res.error ?? "No se pudo guardar.");
      return null;
    }
    setIdeaId(res.id);
    return res.id;
  };

  const toCalendar = (sendToClient: boolean) =>
    start(async () => {
      setError(null);
      const id = await ensureSaved();
      if (!id) return;
      const res = await sendIdeaToCalendar(id, sendToClient);
      if (res.error) setError(res.error);
      else setContentId(res.contentItemId ?? null);
    });

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {card.tags.filter(Boolean).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
      <p className="font-medium text-text-primary">{card.title}</p>
      <p className="whitespace-pre-line text-sm text-text-muted">{card.body}</p>
      {error && <p className="text-xs text-danger">{error}</p>}
      {contentId && (
        <p className="text-xs text-success">
          En el calendario. <Link href={`/calendar?item=${contentId}`} className="underline">Ver</Link>
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending || Boolean(ideaId)} onClick={() => start(async () => { setError(null); await ensureSaved(); })}>
          <BookmarkPlus className="h-4 w-4" /> {ideaId ? "Guardada" : "Guardar"}
        </Button>
        <Button variant="secondary" disabled={pending || Boolean(contentId)} onClick={() => toCalendar(false)}>
          <CalendarPlus className="h-4 w-4" /> Al calendario
        </Button>
        <Button variant="ghost" disabled={pending || Boolean(contentId)} onClick={() => toCalendar(true)} title="Crea la pieza y la manda al portal del cliente para aprobar">
          <Send className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          title="Copiar"
          onClick={() => {
            navigator.clipboard?.writeText(`${card.title}\n\n${card.body}`).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          <Copy className="h-4 w-4" /> {copied ? "¡Copiado!" : ""}
        </Button>
      </div>
    </Card>
  );
}

export function IdeaCardGrid({ cards, clientId, source }: { cards: IdeaCard[]; clientId: string; source: string }) {
  if (cards.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c, i) => (
        <IdeaCardView key={`${c.title}-${i}`} card={c} clientId={clientId} source={source} />
      ))}
    </div>
  );
}
