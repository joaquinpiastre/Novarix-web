"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SOCIAL_NETWORKS } from "@/lib/marketing/content";
import { AD_OBJECTIVES, PILLARS, type IdeaCard, type IdeaTool } from "@/lib/ideas/types";
import { runToolAction } from "./actions";
import { IdeaCardGrid } from "./IdeaCards";

function useTool(tool: IdeaTool, clientId: string) {
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (input: unknown) =>
    start(async () => {
      setError(null);
      const res = await runToolAction(tool, clientId, input);
      if (res.error) setError(res.error);
      else setCards(res.cards ?? []);
    });
  return { cards, error, pending, run };
}

function ToolShell({
  title,
  description,
  children,
  onSubmit,
  pending,
  error,
  disabled,
  cards,
  clientId,
  source,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
  disabled?: boolean;
  cards: IdeaCard[];
  clientId: string;
  source: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div>
            <p className="font-medium text-text-primary">{title}</p>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
          {children}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={pending || disabled} className="self-start">
            <Sparkles className="h-4 w-4" /> {pending ? "Generando…" : "Generar"}
          </Button>
        </form>
      </Card>
      <IdeaCardGrid cards={cards} clientId={clientId} source={source} />
    </div>
  );
}

export function IdeasTool({ clientId }: { clientId: string }) {
  const t = useTool("ideas", clientId);
  const [pillars, setPillars] = useState<string[]>(["educativo", "producto", "detras_de_escena"]);
  const [perPillar, setPerPillar] = useState("3");
  const [topic, setTopic] = useState("");
  return (
    <ToolShell
      title="Generador de ideas"
      description="Ideas por pilar de contenido, con gancho y formato sugerido."
      onSubmit={() => t.run({ pillars, per_pillar: Number(perPillar), topic })}
      pending={t.pending}
      error={t.error}
      disabled={pillars.length === 0}
      cards={t.cards}
      clientId={clientId}
      source="ideas"
    >
      <div className="flex flex-wrap gap-2">
        {PILLARS.map((p) => (
          <label key={p.value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm text-text-primary has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input
              type="checkbox"
              checked={pillars.includes(p.value)}
              onChange={() => setPillars((prev) => (prev.includes(p.value) ? prev.filter((x) => x !== p.value) : [...prev, p.value]))}
            />
            {p.label}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Ideas por pilar" value={perPillar} onChange={(e) => setPerPillar(e.target.value)}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <div className="sm:col-span-2">
          <Input label="Tema o foco (opcional)" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: lanzamiento de la línea de impermeabilizantes" />
        </div>
      </div>
    </ToolShell>
  );
}

export function HooksTool({ clientId }: { clientId: string }) {
  const t = useTool("ganchos", clientId);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("12");
  return (
    <ToolShell title="Generador de ganchos" description="Variantes de los primeros 3 segundos, clasificadas por tipo, para testear." onSubmit={() => t.run({ topic, count: Number(count) })} pending={t.pending} error={t.error} disabled={topic.trim().length < 3} cards={t.cards} clientId={clientId} source="ganchos">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-3">
          <Input label="¿De qué es el video?" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: cómo elegir la pintura correcta para exterior" />
        </div>
        <Select label="Cantidad" value={count} onChange={(e) => setCount(e.target.value)}>
          {[10, 12, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
      </div>
    </ToolShell>
  );
}

export function ScriptTool({ clientId }: { clientId: string }) {
  const t = useTool("guion", clientId);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30");
  const [network, setNetwork] = useState("instagram");
  return (
    <ToolShell title="Guionista de reels / TikTok" description="Guion completo: gancho, desarrollo, CTA, texto en pantalla, plano por plano, audio y caption." onSubmit={() => t.run({ topic, duration_seconds: Number(duration), network })} pending={t.pending} error={t.error} disabled={topic.trim().length < 3} cards={t.cards} clientId={clientId} source="guion">
      <Textarea label="Idea del video" rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Duración objetivo" value={duration} onChange={(e) => setDuration(e.target.value)}>
          {[15, 30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} s</option>)}
        </Select>
        <Select label="Red" value={network} onChange={(e) => setNetwork(e.target.value)}>
          {SOCIAL_NETWORKS.filter((n) => ["instagram", "tiktok", "youtube", "facebook"].includes(n.value)).map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
        </Select>
      </div>
    </ToolShell>
  );
}

export function RecyclerTool({ clientId }: { clientId: string }) {
  const t = useTool("reciclador", clientId);
  const [source, setSource] = useState("");
  const [metrics, setMetrics] = useState("");
  return (
    <ToolShell title="Reciclador" description="De un video o post que funcionó, 5 variaciones para seguir publicando sin repetirse." onSubmit={() => t.run({ source, metrics })} pending={t.pending} error={t.error} disabled={source.trim().length < 5} cards={t.cards} clientId={clientId} source="reciclador">
      <Textarea label="Link o descripción del contenido (caption, de qué trataba, cómo era)" rows={4} value={source} onChange={(e) => setSource(e.target.value)} />
      <Input label="Métricas (opcional)" value={metrics} onChange={(e) => setMetrics(e.target.value)} placeholder="Ej: 45 mil vistas, 300 compartidos (el promedio es 3 mil)" />
    </ToolShell>
  );
}

export function HashtagsTool({ clientId }: { clientId: string }) {
  const t = useTool("hashtags", clientId);
  const [topic, setTopic] = useState("");
  return (
    <ToolShell
      title="Hashtags y palabras clave"
      description="Cruza los hashtags reales de los videos del Radar y de las publicaciones del cliente (con sus vistas) con el criterio de la IA."
      onSubmit={() => t.run({ topic })}
      pending={t.pending}
      error={t.error}
      disabled={topic.trim().length < 3}
      cards={t.cards}
      clientId={clientId}
      source="hashtags"
    >
      <Input label="Tema" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: pintura de frentes, antes y después" />
    </ToolShell>
  );
}

export function AdsTool({ clientId, defaultObjective }: { clientId: string; defaultObjective: string }) {
  const t = useTool("ads", clientId);
  const [objective, setObjective] = useState(defaultObjective);
  const [offer, setOffer] = useState("");
  const [budget, setBudget] = useState("");
  return (
    <ToolShell title="Ideas de campañas de Ads" description="Ángulos, públicos y copies para Meta Ads según el objetivo." onSubmit={() => t.run({ objective, offer, budget })} pending={t.pending} error={t.error} disabled={offer.trim().length < 3} cards={t.cards} clientId={clientId} source="ads">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Objetivo" value={objective} onChange={(e) => setObjective(e.target.value)}>
          {AD_OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <div className="sm:col-span-2">
          <Input label="Presupuesto (opcional)" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ej: ARS 150.000 por mes" />
        </div>
      </div>
      <Textarea label="¿Qué se promociona?" rows={3} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Producto, servicio, oferta, diferencial…" />
    </ToolShell>
  );
}

export function DateIdeasButton({ clientId, name, date, hint }: { clientId: string; name: string; date: string; hint: string }) {
  const t = useTool("fecha", clientId);
  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" disabled={t.pending} onClick={() => t.run({ date_name: name, date, hint })} className="self-start">
        <Sparkles className="h-4 w-4" /> {t.pending ? "Generando…" : "Ideas para esta fecha"}
      </Button>
      {t.error && <p className="text-sm text-danger">{t.error}</p>}
      <IdeaCardGrid cards={t.cards} clientId={clientId} source="fecha" />
    </div>
  );
}
