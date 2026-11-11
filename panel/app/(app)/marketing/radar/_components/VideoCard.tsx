"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, ExternalLink, Lightbulb, Play, RefreshCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea, Input } from "@/components/ui/Input";
import { embedUrl } from "@/lib/trends/links";
import { hookLabel, PLATFORM_LABELS } from "@/lib/trends/types";
import { formatCount, formatDuration, formatPercent, type VideoCardData } from "@/lib/trends/view";
import { reanalyzeVideo, removeSwipeItem, updateSwipeItem } from "../actions";
import { ConvertDialog, SaveToBoardDialog } from "./VideoDialogs";

function scoreTone(score: number | null | undefined): "success" | "warning" | "neutral" {
  if (score == null) return "neutral";
  if (score >= 70) return "success";
  if (score >= 45) return "warning";
  return "neutral";
}

function Thumb({ v }: { v: VideoCardData }) {
  const [playing, setPlaying] = useState(false);
  const src = embedUrl(v.platform, v.externalId, v.url);
  if (playing && src) {
    return (
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={src}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          title={v.caption?.slice(0, 80) ?? "Video"}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => (src ? setPlaying(true) : window.open(v.url, "_blank", "noopener"))}
      className="group relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-xl bg-surface-hover"
    >
      {v.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="px-4 text-center text-xs text-text-muted">{PLATFORM_LABELS[v.platform]}<br />(sin miniatura)</span>
      )}
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:scale-110">
        <Play className="h-5 w-5" />
      </span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <span className="num text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export interface VideoCardProps {
  v: VideoCardData;
  clientId: string | null;
  clients: { id: string; name: string }[];
  searchId?: string;
}

export function VideoCard({ v, clientId, clients, searchId }: VideoCardProps) {
  const router = useRouter();
  const [saveOpen, setSaveOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const s = v.scores;
  const a = v.analysis;

  const reanalyze = () =>
    start(async () => {
      setError(null);
      const res = await reanalyzeVideo(v.videoId, clientId, searchId);
      if (res.error !== undefined) setError(res.error);
      else router.refresh();
    });

  return (
    <Card className={clsx("flex flex-col gap-3 p-4", s?.discarded && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{PLATFORM_LABELS[v.platform]}</Badge>
            {v.sourceProvider === "mock" && <Badge tone="warning">Ejemplo</Badge>}
            {s?.discarded && <Badge>Descartado</Badge>}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-text-primary">
            {v.authorHandle ? `@${v.authorHandle}` : v.authorName ?? "Cuenta desconocida"}
          </p>
          <p className="text-xs text-text-muted">
            {v.authorFollowers != null ? `${formatCount(v.authorFollowers)} seguidores · ` : ""}
            {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString("es-AR") : "fecha n/d"}
            {v.durationSeconds != null ? ` · ${formatDuration(v.durationSeconds)}` : ""}
          </p>
        </div>
        {s?.final != null && (
          <div className="flex flex-col items-center rounded-xl border border-border px-2 py-1" title="Score Novarix: combinación ponderada de outlier, velocidad, engagement y relevancia. Es una métrica propia, no de la plataforma.">
            <span className="num text-lg font-semibold text-text-primary">{Math.round(s.final)}</span>
            <span className="text-[9px] uppercase tracking-wider text-text-muted">score</span>
          </div>
        )}
      </div>

      <Thumb v={v} />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Metric label="Vistas" value={formatCount(v.views)} />
        <Metric label="Likes" value={formatCount(v.likes)} />
        <Metric label="Coment." value={formatCount(v.comments)} />
        <Metric label="Compart." value={formatCount(v.shares)} />
        <Metric label="Guard." value={formatCount(v.saves)} />
      </div>

      {s && (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={scoreTone(s.outlierScore)} title="Vistas ÷ promedio de vistas de la cuenta (o ÷ seguidores). Alto = el contenido funcionó, no el tamaño de la cuenta.">
            Outlier {s.outlierRatio != null ? `${s.outlierRatio.toFixed(1).replace(".", ",")}x` : "n/d"}
          </Badge>
          <Badge tone={scoreTone(s.velocityScore)} title="Vistas por día desde la publicación (puntaje relativo al más rápido de la búsqueda).">
            {s.velocity != null ? `${formatCount(s.velocity)} vistas/día` : "Velocidad n/d"}
          </Badge>
          <Badge tone={scoreTone(s.engagementScore)} title="(likes + comentarios + compartidos + guardados) ÷ vistas.">
            ER {formatPercent(s.engagementRate)}
          </Badge>
          <Badge tone={scoreTone(s.relevance)} title={s.relevanceReason ?? "Relevancia según la IA."}>
            Relevancia {s.relevance ?? "n/d"}
          </Badge>
        </div>
      )}
      {s?.relevanceReason && <p className="text-xs text-text-muted">{s.relevanceReason}</p>}

      {v.caption && (
        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer text-text-primary">Texto del video</summary>
          <p className="mt-1 whitespace-pre-line">{v.caption.slice(0, 800)}</p>
          {v.audio && <p className="mt-1">Audio: {v.audio}</p>}
        </details>
      )}

      {a ? (
        <details className="rounded-xl border border-border p-3 text-sm" open={false}>
          <summary className="cursor-pointer font-medium text-text-primary">
            Análisis IA · gancho {hookLabel(a.hook.type)} <span className="text-xs font-normal text-text-muted">(inferencia, confianza {a.confidence})</span>
          </summary>
          <div className="mt-3 flex flex-col gap-3 text-text-primary">
            <p><span className="text-text-muted">Gancho:</span> {a.hook.description}</p>
            <p><span className="text-text-muted">Formato:</span> {a.format}</p>
            <p><span className="text-text-muted">Ritmo:</span> {a.pacing}</p>
            <p><span className="text-text-muted">Texto en pantalla:</span> {a.on_screen_text}</p>
            <p><span className="text-text-muted">CTA:</span> {a.cta}</p>
            {a.structure.length > 0 && (
              <div>
                <p className="text-text-muted">Estructura:</p>
                <ol className="list-decimal pl-5">{a.structure.map((x, i) => <li key={i}>{x}</li>)}</ol>
              </div>
            )}
            <div>
              <p className="text-text-muted">Por qué probablemente funcionó:</p>
              <ul className="list-disc pl-5">{a.why_it_worked.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            {a.adaptations.map((ad, i) => (
              <div key={i} className="rounded-xl bg-surface-hover p-3">
                <p className="font-medium">Idea {i + 1}: {ad.title}</p>
                <p className="mt-1"><span className="text-text-muted">Gancho:</span> {ad.hook}</p>
                <p className="mt-1 whitespace-pre-line">{ad.script}</p>
                {ad.shots.length > 0 && (
                  <ol className="mt-2 flex flex-col gap-1 text-xs">
                    {ad.shots.map((sh, j) => (
                      <li key={j}>
                        <span className="font-medium">{sh.time}</span> · {sh.shot}
                        {sh.on_screen_text && <> · <em>“{sh.on_screen_text}”</em></>}
                        {sh.voiceover && <> · 🎙 {sh.voiceover}</>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {v.swipe && <SwipeNotes itemId={v.swipe.itemId} notes={v.swipe.notes} tags={v.swipe.tags} />}

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="mt-auto flex flex-wrap gap-2">
        {!v.swipe && (
          <Button variant="secondary" className="flex-1" onClick={() => setSaveOpen(true)}>
            <Bookmark className="h-4 w-4" /> Guardar
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={() => setConvertOpen(true)}>
          <Lightbulb className="h-4 w-4" /> Convertir en idea
        </Button>
        <Button variant="ghost" onClick={reanalyze} disabled={pending} title={a ? "Volver a analizar" : "Analizar con IA"}>
          <RefreshCw className={clsx("h-4 w-4", pending && "animate-spin")} />
          {a ? "" : "Analizar"}
        </Button>
        <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-xl px-3 text-text-muted hover:bg-surface-hover" title="Ver en la plataforma">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <SaveToBoardDialog open={saveOpen} onOpenChange={setSaveOpen} videoId={v.videoId} clientId={clientId} />
      <ConvertDialog open={convertOpen} onOpenChange={setConvertOpen} video={v} clientId={clientId} clients={clients} />
    </Card>
  );
}

function SwipeNotes({ itemId, notes, tags }: { itemId: string; notes: string | null; tags: string[] }) {
  const router = useRouter();
  const [text, setText] = useState(notes ?? "");
  const [tagText, setTagText] = useState(tags.join(", "));
  const [pending, start] = useTransition();
  const dirty = text !== (notes ?? "") || tagText !== tags.join(", ");
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
      <Textarea label="Notas" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      <Input label="Etiquetas (separadas por coma)" value={tagText} onChange={(e) => setTagText(e.target.value)} />
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={!dirty || pending}
          onClick={() => start(async () => { await updateSwipeItem(itemId, text, tagText.split(",")); router.refresh(); })}
        >
          Guardar notas
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => start(async () => { await removeSwipeItem(itemId); router.refresh(); })}
          title="Sacar del tablero"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
