"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TrendSettings } from "@/lib/trends/settings";
import { updateUsageSettings } from "./actions";

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "marketing_admin", label: "Marketing (admin)" },
  { key: "marketing", label: "Marketing" },
] as const;

export function SettingsForm({ settings }: { settings: TrendSettings }) {
  const router = useRouter();
  const pct = (n: number) => String(Math.round(n * 100));
  const [weights, setWeights] = useState({
    outlier: pct(settings.weights.outlier),
    velocity: pct(settings.weights.velocity),
    engagement: pct(settings.weights.engagement),
    relevance: pct(settings.weights.relevance),
  });
  const [ttl, setTtl] = useState(String(settings.cache_ttl_hours));
  const [topN, setTopN] = useState(String(settings.analyze_top_n));
  const [searchLimits, setSearchLimits] = useState<Record<string, string>>(
    Object.fromEntries(ROLES.map((r) => [r.key, String(settings.daily_search_limits[r.key] ?? 0)]))
  );
  const [aiLimits, setAiLimits] = useState<Record<string, string>>(
    Object.fromEntries(ROLES.map((r) => [r.key, String(settings.daily_ai_limits[r.key] ?? 0)]))
  );
  const [budget, setBudget] = useState(String(settings.monthly_budget_usd));
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const num = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(e.target.value.replace(/[^\d.]/g, ""));

  return (
    <Card>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setMsg(null);
            const res = await updateUsageSettings({
              weights,
              cache_ttl_hours: ttl,
              analyze_top_n: topN,
              daily_search_limits: searchLimits as never,
              daily_ai_limits: aiLimits as never,
              monthly_budget_usd: budget,
            });
            setMsg(res.error ? { error: res.error } : { ok: true });
            if (!res.error) router.refresh();
          });
        }}
      >
        <CardTitle>Configuración del Radar y límites</CardTitle>

        <div>
          <p className="text-xs font-medium text-text-muted">Pesos del score (se normalizan a 100%)</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input label="Outlier" inputMode="numeric" value={weights.outlier} onChange={num((v) => setWeights({ ...weights, outlier: v }))} />
            <Input label="Velocidad" inputMode="numeric" value={weights.velocity} onChange={num((v) => setWeights({ ...weights, velocity: v }))} />
            <Input label="Engagement" inputMode="numeric" value={weights.engagement} onChange={num((v) => setWeights({ ...weights, engagement: v }))} />
            <Input label="Relevancia" inputMode="numeric" value={weights.relevance} onChange={num((v) => setWeights({ ...weights, relevance: v }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input label="Caché de búsquedas (horas)" inputMode="numeric" value={ttl} onChange={num(setTtl)} />
          <Input label="Videos a analizar por búsqueda" inputMode="numeric" value={topN} onChange={num(setTopN)} />
          <Input label="Presupuesto mensual (USD)" inputMode="decimal" value={budget} onChange={num(setBudget)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="pb-2 pr-3">Rol</th><th className="pb-2 pr-3">Búsquedas/día</th><th className="pb-2">Usos de IA/día</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r.key}>
                  <td className="py-1 pr-3 text-text-primary">{r.label}</td>
                  <td className="py-1 pr-3"><Input aria-label={`Búsquedas ${r.label}`} inputMode="numeric" value={searchLimits[r.key]} onChange={num((v) => setSearchLimits({ ...searchLimits, [r.key]: v }))} /></td>
                  <td className="py-1"><Input aria-label={`IA ${r.label}`} inputMode="numeric" value={aiLimits[r.key]} onChange={num((v) => setAiLimits({ ...aiLimits, [r.key]: v }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {msg?.error && <p className="text-sm text-danger">{msg.error}</p>}
        {msg?.ok && <p className="text-sm text-success">Guardado.</p>}
        <Button type="submit" disabled={pending} className="self-start">{pending ? "Guardando…" : "Guardar configuración"}</Button>
      </form>
    </Card>
  );
}
