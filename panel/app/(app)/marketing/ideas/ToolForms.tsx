"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SOCIAL_NETWORKS } from "@/lib/marketing/content";
import { AD_OBJECTIVES, PILLARS, type IdeaCard, type IdeaTool } from "@/lib/ideas/types";
import { runToolAction } from "./actions";
import { IdeaCardGrid } from "./IdeaCards";

// Todas las herramientas: campos opcionales + un prompt libre. Si se deja
// todo vacio, la IA elige sola con el contexto del cliente.

function useTool(tool: IdeaTool, clientId: string) {
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (input: Record<string, unknown>) =>
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
  promptPlaceholder,
  children,
  onSubmit,
  pending,
  error,
  cards,
  clientId,
  source,
}: {
  title: string;
  description: string;
  promptPlaceholder: string;
  children?: React.ReactNode;
  onSubmit: (prompt: string) => void;
  pending: boolean;
  error: string | null;
  cards: IdeaCard[];
  clientId: string;
  source: string;
}) {
  const [prompt, setPrompt] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(prompt);
          }}
        >
          <div>
            <p className="font-medium text-text-primary">{title}</p>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
          <Textarea
            label="Indicaciones para la IA (opcional)"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={promptPlaceholder}
            maxLength={2000}
          />
          {children}
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <Wand2 className="h-3.5 w-3.5" />
            Todo es opcional: lo que dejes vacío lo decide la IA con el plan, la marca, lo que funcionó, el Radar y las fechas próximas del cliente.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={pending} className="self-start">
            <Sparkles className="h-4 w-4" /> {pending ? "Generando…" : prompt.trim() ? "Generar" : "Generar automático"}
          </Button>
        </form>
      </Card>
      <IdeaCardGrid cards={cards} clientId={clientId} source={source} />
    </div>
  );
}

export function IdeasTool({ clientId }: { clientId: string }) {
  const t = useTool("ideas", clientId);
  const [pillars, setPillars] = useState<string[]>([]);
  const [perPillar, setPerPillar] = useState("3");
  const [topic, setTopic] = useState("");
  return (
    <ToolShell
      title="Generador de ideas"
      description="Ideas de contenido con gancho y formato. Sin pilares elegidos, la IA arma la mezcla que más le conviene al cliente."
      promptPlaceholder="Ej: ideas para mostrar el equipo de trabajo, tono descontracturado, nada de promos este mes"
      onSubmit={(prompt) => t.run({ pillars, per_pillar: Number(perPillar), topic, prompt })}
      pending={t.pending}
      error={t.error}
      cards={t.cards}
      clientId={clientId}
      source="ideas"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-muted">Pilares (opcional)</span>
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
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {pillars.length > 0 && (
          <Select label="Ideas por pilar" value={perPillar} onChange={(e) => setPerPillar(e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        )}
        <div className={pillars.length > 0 ? "sm:col-span-2" : "sm:col-span-3"}>
          <Input label="Tema o foco (opcional)" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Vacío = la IA elige" />
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
    <ToolShell
      title="Generador de ganchos"
      description="Variantes de los primeros 3 segundos, clasificadas por tipo, para testear."
      promptPlaceholder="Ej: ganchos con preguntas polémicas, para público de 25 a 40"
      onSubmit={(prompt) => t.run({ topic, count: Number(count), prompt })}
      pending={t.pending}
      error={t.error}
      cards={t.cards}
      clientId={clientId}
      source="ganchos"
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-3">
          <Input label="¿De qué es el video? (opcional)" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Vacío = la IA elige el tema" />
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
    <ToolShell
      title="Guionista de reels / TikTok"
      description="Guion completo: gancho, desarrollo, CTA, texto en pantalla, plano por plano, audio y caption."
      promptPlaceholder="Ej: que lo grabe el dueño hablando a cámara, sin música, cerrando con la promo de la semana"
      onSubmit={(prompt) => t.run({ topic, duration_seconds: Number(duration), network, prompt })}
      pending={t.pending}
      error={t.error}
      cards={t.cards}
      clientId={clientId}
      source="guion"
    >
      <Input label="Idea del video (opcional)" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Vacío = la IA elige la idea con más potencial" />
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
    <ToolShell
      title="Reciclador"
      description="5 variaciones de un contenido que funcionó. Si no pegás ninguno, la IA toma el post del cliente que mejor rindió (o la última referencia del Radar)."
      promptPlaceholder="Ej: pasalo a carrusel y a historia, y una versión para TikTok con humor"
      onSubmit={(prompt) => t.run({ source, metrics, prompt })}
      pending={t.pending}
      error={t.error}
      cards={t.cards}
      clientId={clientId}
      source="reciclador"
    >
      <Textarea label="Link o descripción del contenido (opcional)" rows={3} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Vacío = usa el que mejor funcionó" />
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
      promptPlaceholder="Ej: priorizá hashtags locales de Mendoza y evitá los genéricos"
      onSubmit={(prompt) => t.run({ topic, prompt })}
      pending={t.pending}
      error={t.error}
      cards={t.cards}
      clientId={clientId}
      source="hashtags"
    >
      <Input label="Tema (opcional)" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Vacío = temas principales del cliente" />
    </ToolShell>
  );
}

export function AdsTool({ clientId, defaultObjective }: { clientId: string; defaultObjective: string }) {
  const t = useTool("ads", clientId);
  const [objective, setObjective] = useState("");
  const [offer, setOffer] = useState("");
  const [budget, setBudget] = useState("");
  return (
    <ToolShell
      title="Ideas de campañas de Ads"
      description="Ángulos, públicos y copies para Meta Ads. Sin objetivo ni producto, la IA los elige según el plan del cliente."
      promptPlaceholder="Ej: campaña para captar clientes nuevos en Godoy Cruz, con foco en el envío gratis"
      onSubmit={(prompt) => t.run({ objective, offer, budget, prompt })}
      pending={t.pending}
      error={t.error}
      cards={t.cards}
      clientId={clientId}
      source="ads"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Objetivo (opcional)" value={objective} onChange={(e) => setObjective(e.target.value)}>
          <option value="">Que elija la IA{defaultObjective ? ` (el plan sugiere: ${AD_OBJECTIVES.find((o) => o.value === defaultObjective)?.label ?? defaultObjective})` : ""}</option>
          {AD_OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <div className="sm:col-span-2">
          <Input label="Presupuesto (opcional)" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ej: ARS 150.000 por mes" />
        </div>
      </div>
      <Textarea label="¿Qué se promociona? (opcional)" rows={2} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Vacío = la IA elige qué conviene promocionar" />
    </ToolShell>
  );
}

export function DateIdeasButton({ clientId, name, date, hint }: { clientId: string; name: string; date: string; hint: string }) {
  const t = useTool("fecha", clientId);
  const [prompt, setPrompt] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Indicaciones para la IA (opcional)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ej: con un sorteo, o sin descuentos"
      />
      <Button variant="secondary" disabled={t.pending} onClick={() => t.run({ date_name: name, date, hint, prompt })} className="self-start">
        <Sparkles className="h-4 w-4" /> {t.pending ? "Generando…" : "Ideas para esta fecha"}
      </Button>
      {t.error && <p className="text-sm text-danger">{t.error}</p>}
      <IdeaCardGrid cards={t.cards} clientId={clientId} source="fecha" />
    </div>
  );
}
