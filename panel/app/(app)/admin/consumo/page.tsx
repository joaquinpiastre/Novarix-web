import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/client";
import { getTrendSettings } from "@/lib/trends/settings";
import { hashtagsUsedThisWeek } from "@/lib/trends/providers/instagram";
import { providerStatuses } from "@/lib/trends/providers";
import { formatCount, formatUsd } from "@/lib/trends/view";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Claude (IA)",
  youtube: "YouTube Data API",
  meta: "Meta Graph API",
  apify: "Apify (TikTok)",
};

function monthRange(param: string | undefined): { month: string; from: string; to: string } {
  const now = new Date();
  const month = param && /^\d{4}-\d{2}$/.test(param) ? param : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { month, from: `${month}-01`, to: `${next}-01` };
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function UsagePage({ searchParams }: { searchParams: { mes?: string } }) {
  await requirePermission("usage.view");
  const { month, from, to } = monthRange(searchParams.mes);
  const range = [from, to];

  const [byProvider, byUser, byClient, totals, searches, ytToday, settings, igWeek] = await Promise.all([
    query<{ provider: string; operation: string; calls: number; units: number; cost: number; input_tokens: number; output_tokens: number }>(
      `select provider, operation, count(*)::int as calls, sum(units)::float as units, sum(cost_usd)::float as cost,
              sum(input_tokens)::float8 as input_tokens, sum(output_tokens)::float8 as output_tokens
       from provider_usage where created_at >= $1 and created_at < $2
       group by provider, operation order by sum(cost_usd) desc, count(*) desc`,
      range
    ),
    query<{ name: string | null; role: string | null; cost: number; calls: number; tokens: number }>(
      `select p.full_name as name, p.role::text as role, sum(u.cost_usd)::float as cost, count(*)::int as calls,
              sum(u.input_tokens + u.output_tokens)::float8 as tokens
       from provider_usage u left join profiles p on p.id = u.profile_id
       where u.created_at >= $1 and u.created_at < $2
       group by p.full_name, p.role order by sum(u.cost_usd) desc`,
      range
    ),
    query<{ name: string | null; cost: number; calls: number }>(
      `select c.name, sum(u.cost_usd)::float as cost, count(*)::int as calls
       from provider_usage u left join clients c on c.id = u.client_id
       where u.created_at >= $1 and u.created_at < $2
       group by c.name order by sum(u.cost_usd) desc limit 30`,
      range
    ),
    queryOne<{ cost: number | null; tokens: number | null }>(
      `select sum(cost_usd)::float as cost, sum(input_tokens + output_tokens)::float8 as tokens
       from provider_usage where created_at >= $1 and created_at < $2`,
      range
    ),
    queryOne<{ n: number }>(
      "select count(*)::int as n from trend_searches where kind = 'search' and created_at >= $1 and created_at < $2",
      range
    ),
    queryOne<{ search_calls: number | null; units: number | null }>(
      `select sum(units) filter (where operation = 'search.list')::int as search_calls, sum(units)::int as units
       from provider_usage where provider = 'youtube'
         and created_at >= date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles'`
    ),
    getTrendSettings(),
    hashtagsUsedThisWeek(),
  ]);

  const spent = totals?.cost ?? 0;
  const budget = settings.monthly_budget_usd;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const ytCap = Number(process.env.YOUTUBE_SEARCH_DAILY_CAP ?? 90);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Consumo de IA y APIs</h1>
          <p className="text-sm text-text-muted">Costos estimados (la factura real es la de cada proveedor). Modelo de IA: {AI_MODEL}{isAiConfigured() ? "" : " — sin ANTHROPIC_API_KEY"}.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/admin/consumo?mes=${shiftMonth(month, -1)}`} className="rounded-xl border border-border px-3 py-2 hover:bg-surface-hover">←</Link>
          <span className="num font-medium text-text-primary">{month}</span>
          <Link href={`/admin/consumo?mes=${shiftMonth(month, 1)}`} className="rounded-xl border border-border px-3 py-2 hover:bg-surface-hover">→</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Costo del mes" value={formatUsd(spent)} hint={`Presupuesto ${formatUsd(budget)} (${pct}%)`} tone={pct >= 100 ? "danger" : "default"} />
        <StatTile label="Búsquedas del Radar" value={String(searches?.n ?? 0)} />
        <StatTile label="Tokens de IA" value={formatCount(totals?.tokens ?? 0)} />
        <StatTile label="YouTube hoy" value={`${ytToday?.search_calls ?? 0}/${ytCap}`} hint={`búsquedas (tope Google 100) · ${ytToday?.units ?? 0} unidades de 10.000`} />
      </div>

      <Card className="flex flex-col gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-accent"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-text-muted">
          Al 80% del presupuesto se avisa a los admins; al 100% se frenan las búsquedas y generaciones nuevas hasta que se suba el presupuesto o empiece el mes.
          Instagram: {igWeek} de 30 hashtags únicos usados en los últimos 7 días.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
          {providerStatuses().map((s) => <span key={s.platform}>{s.label}: {s.detail}.</span>)}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Por proveedor y operación</CardTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="pb-2 pr-3">Proveedor</th><th className="pb-2 pr-3">Operación</th><th className="pb-2 pr-3">Llamadas</th><th className="pb-2 pr-3">Tokens</th><th className="pb-2">Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-primary">
                {byProvider.map((r) => (
                  <tr key={`${r.provider}-${r.operation}`}>
                    <td className="py-2 pr-3">{PROVIDER_LABELS[r.provider] ?? r.provider}</td>
                    <td className="py-2 pr-3 text-text-muted">{r.operation}</td>
                    <td className="py-2 pr-3">{r.calls}</td>
                    <td className="py-2 pr-3">{r.provider === "anthropic" ? formatCount(Number(r.input_tokens) + Number(r.output_tokens)) : "—"}</td>
                    <td className="py-2">{formatUsd(r.cost)}</td>
                  </tr>
                ))}
                {byProvider.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-text-muted">Sin consumo este mes.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Por persona</CardTitle>
            <ul className="mt-3 divide-y divide-border text-sm">
              {byUser.map((r, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span className="text-text-primary">{r.name ?? "Sistema / jobs"}</span>
                  <span className="text-text-muted">{r.calls} llamadas · {formatUsd(r.cost)}</span>
                </li>
              ))}
              {byUser.length === 0 && <li className="py-3 text-text-muted">—</li>}
            </ul>
          </Card>
          <Card>
            <CardTitle>Por cliente</CardTitle>
            <ul className="mt-3 divide-y divide-border text-sm">
              {byClient.map((r, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span className="text-text-primary">{r.name ?? "Sin cliente"}</span>
                  <span className="text-text-muted">{r.calls} llamadas · {formatUsd(r.cost)}</span>
                </li>
              ))}
              {byClient.length === 0 && <li className="py-3 text-text-muted">—</li>}
            </ul>
          </Card>
        </div>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
