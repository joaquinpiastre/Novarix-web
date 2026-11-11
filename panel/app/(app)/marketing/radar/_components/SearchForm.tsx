"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Search, Sparkles } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/trends/types";
import { analyzeLink, createSearch } from "../actions";

interface ClientOption {
  id: string;
  name: string;
}

const EXAMPLES = [
  "Videos de pinturerías o ferreterías mostrando antes y después de pintar una casa, en español, últimos 30 días, que hayan explotado en vistas",
  "Reels de restaurantes o cafeterías que muestren la preparación de un plato con un gancho fuerte, últimos 30 días",
  "Clínicas odontológicas explicando tratamientos en menos de 30 segundos, con testimonio de paciente",
];

export function SearchForm({ clients, requireClient }: { clients: ClientOption[]; requireClient: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState(requireClient && clients.length === 1 ? clients[0].id : "");
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [period, setPeriod] = useState("30");
  const [language, setLanguage] = useState("es");
  const [region, setRegion] = useState("AR");
  const [maxDuration, setMaxDuration] = useState("90");
  const [minViews, setMinViews] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createSearch({
        prompt,
        client_id: clientId || null,
        filters: {
          platforms,
          period_days: Number(period),
          language,
          region,
          max_duration_seconds: Number(maxDuration),
          min_views: Number(minViews || 0),
        },
      });
      if (res.error !== undefined) setError(res.error);
      else router.push(`/marketing/radar/${res.id}`);
    });
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <CardTitle>¿Qué videos querés encontrar?</CardTitle>
        </div>
        <Textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={EXAMPLES[0]}
          maxLength={2000}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.slice(1).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-border px-3 py-1 text-left text-xs text-text-muted hover:border-accent hover:text-text-primary"
            >
              {ex.slice(0, 60)}…
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={requireClient ? "Cliente" : "Cliente (opcional)"} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {!requireClient && <option value="">Sin cliente (búsqueda general)</option>}
            {requireClient && <option value="">Elegí un cliente…</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Período" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Plataformas</span>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label
                key={p}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm text-text-primary has-[:checked]:border-accent has-[:checked]:bg-accent/10"
              >
                <input type="checkbox" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} />
                {PLATFORM_LABELS[p]}
              </label>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => setShowMore((v) => !v)} className="self-start text-xs font-medium text-accent">
          {showMore ? "Menos filtros" : "Más filtros (idioma, país, duración, vistas)"}
        </button>
        {showMore && (
          <div className="grid gap-3 sm:grid-cols-4">
            <Input label="Idioma" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="es" />
            <Input label="País" value={region} onChange={(e) => setRegion(e.target.value.toUpperCase())} placeholder="AR" />
            <Select label="Duración máx." value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)}>
              <option value="30">30 s</option>
              <option value="60">60 s</option>
              <option value="90">90 s</option>
              <option value="180">3 min</option>
            </Select>
            <Input label="Mínimo de vistas" inputMode="numeric" value={minViews} onChange={(e) => setMinViews(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="submit" disabled={pending || prompt.trim().length < 10}>
            <Search className="h-4 w-4" />
            {pending ? "Armando el plan…" : "Armar plan de búsqueda"}
          </Button>
          <span className="text-xs text-text-muted">
            Primero la IA te muestra el plan (palabras clave, hashtags, cuentas) y vos decidís si buscar así.
          </span>
        </div>
      </form>
    </Card>
  );
}

export function LinkForm({ clients, requireClient }: { clients: ClientOption[]; requireClient: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [clientId, setClientId] = useState(requireClient && clients.length === 1 ? clients[0].id : "");
  const [metrics, setMetrics] = useState({ views: "", likes: "", comments: "", shares: "", saves: "", followers: "" });
  const [showMetrics, setShowMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await analyzeLink({ url, client_id: clientId || null, ...metrics });
      if (res.error !== undefined) setError(res.error);
      else router.push(`/marketing/radar/${res.id}`);
    });
  }

  const field = (key: keyof typeof metrics, label: string) => (
    <Input
      label={label}
      inputMode="numeric"
      value={metrics[key]}
      onChange={(e) => setMetrics((m) => ({ ...m, [key]: e.target.value.replace(/[^\d]/g, "") }))}
    />
  );

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-accent" />
          <CardTitle>Analizar un link</CardTitle>
        </div>
        <p className="text-xs text-text-muted">
          TikTok, Reels o Shorts. El video se muestra con el reproductor oficial de la plataforma; no se descarga.
        </p>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@cuenta/video/…" />
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Cliente">
          {!requireClient && <option value="">Sin cliente</option>}
          {requireClient && <option value="">Elegí un cliente…</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <button type="button" onClick={() => setShowMetrics((v) => !v)} className="self-start text-xs font-medium text-accent">
          {showMetrics ? "Ocultar métricas" : "Cargar métricas a mano (opcional)"}
        </button>
        {showMetrics && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {field("views", "Vistas")}
            {field("likes", "Likes")}
            {field("comments", "Comentarios")}
            {field("shares", "Compartidos")}
            {field("saves", "Guardados")}
            {field("followers", "Seguidores de la cuenta")}
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="secondary" disabled={pending || !url.trim()}>
          {pending ? "Agregando…" : "Analizar"}
        </Button>
      </form>
    </Card>
  );
}
