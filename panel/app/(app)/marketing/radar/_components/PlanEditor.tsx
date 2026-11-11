"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Wand2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PLATFORMS, PLATFORM_LABELS, type Platform, type SearchPlan } from "@/lib/trends/types";
import { adjustPlan, runSearch } from "../actions";

const lines = (list: string[]) => list.join("\n");
const parseLines = (text: string) =>
  text
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

export function PlanEditor({ searchId, plan, providerNotes }: { searchId: string; plan: SearchPlan; providerNotes: string[] }) {
  const router = useRouter();
  const [kwEs, setKwEs] = useState(lines(plan.keywords_es));
  const [kwEn, setKwEn] = useState(lines(plan.keywords_en));
  const [synonyms, setSynonyms] = useState(lines(plan.synonyms));
  const [hashtags, setHashtags] = useState(lines(plan.hashtags.map((h) => `#${h}`)));
  const [accounts, setAccounts] = useState(lines(plan.reference_accounts.map((a) => `${a.platform}: @${a.handle}`)));
  const [providers, setProviders] = useState<Platform[]>(plan.providers);
  const [period, setPeriod] = useState(String(plan.period_days));
  const [maxDuration, setMaxDuration] = useState(String(plan.max_duration_seconds));
  const [minViews, setMinViews] = useState(String(plan.min_views));
  const [criteria, setCriteria] = useState(plan.relevance_criteria);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function buildPlan(): SearchPlan {
    return {
      ...plan,
      keywords_es: parseLines(kwEs),
      keywords_en: parseLines(kwEn),
      synonyms: parseLines(synonyms),
      hashtags: parseLines(hashtags),
      reference_accounts: parseLines(accounts).map((line) => {
        const m = /^(youtube|instagram|tiktok)\s*:\s*(.+)$/i.exec(line);
        return m
          ? { platform: m[1].toLowerCase() as Platform, handle: m[2].trim() }
          : { platform: "instagram" as Platform, handle: line };
      }),
      providers,
      period_days: Number(period) || plan.period_days,
      max_duration_seconds: Number(maxDuration) || plan.max_duration_seconds,
      min_views: Number(minViews) || 0,
      relevance_criteria: criteria,
    };
  }

  function search() {
    setError(null);
    start(async () => {
      const res = await runSearch(searchId, buildPlan());
      if (res.error !== undefined) setError(res.error);
      else router.refresh();
    });
  }

  function adjust() {
    setError(null);
    start(async () => {
      const res = await adjustPlan(searchId, feedback);
      if (res.error !== undefined) setError(res.error);
      else {
        setFeedback("");
        router.refresh();
      }
    });
  }

  return (
    <Card key={JSON.stringify(plan)} className="flex flex-col gap-4">
      <div>
        <CardTitle>Plan de búsqueda</CardTitle>
        <p className="mt-1 text-sm text-text-muted">{plan.summary}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Textarea label="Palabras clave (español), una por línea" rows={4} value={kwEs} onChange={(e) => setKwEs(e.target.value)} />
        <Textarea label="Palabras clave (inglés)" rows={4} value={kwEn} onChange={(e) => setKwEn(e.target.value)} />
        <Textarea label="Sinónimos del rubro" rows={3} value={synonyms} onChange={(e) => setSynonyms(e.target.value)} />
        <Textarea label="Hashtags" rows={3} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
        <Textarea
          label="Cuentas referentes (plataforma: @usuario)"
          rows={3}
          value={accounts}
          onChange={(e) => setAccounts(e.target.value)}
          placeholder="instagram: @cuenta_del_rubro"
        />
        <Textarea label="Qué hace relevante a un video" rows={3} value={criteria} onChange={(e) => setCriteria(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <label
            key={p}
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm text-text-primary has-[:checked]:border-accent has-[:checked]:bg-accent/10"
          >
            <input
              type="checkbox"
              checked={providers.includes(p)}
              onChange={() => setProviders((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))}
            />
            {PLATFORM_LABELS[p]}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Select label="Período" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7">7 días</option>
          <option value="30">30 días</option>
          <option value="90">90 días</option>
        </Select>
        <Input label="Duración máx. (s)" inputMode="numeric" value={maxDuration} onChange={(e) => setMaxDuration(e.target.value.replace(/\D/g, ""))} />
        <Input label="Mínimo de vistas" inputMode="numeric" value={minViews} onChange={(e) => setMinViews(e.target.value.replace(/\D/g, ""))} />
      </div>

      {providerNotes.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-text-muted">
          {providerNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-end">
        <Button onClick={search} disabled={pending} className="md:order-2">
          <Play className="h-4 w-4" />
          {pending ? "Un momento…" : "Buscar así"}
        </Button>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end md:order-1">
          <div className="flex-1">
            <Input label="¿Ajustar con IA?" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Ej: sumá cuentas de Brasil, sacá lo de inglés" />
          </div>
          <Button variant="secondary" onClick={adjust} disabled={pending || !feedback.trim()}>
            <Wand2 className="h-4 w-4" />
            Ajustar
          </Button>
        </div>
      </div>
    </Card>
  );
}
