import Link from "next/link";
import clsx from "clsx";
import { requireClient } from "@/lib/auth/requireClient";
import { query, queryOne } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import { MetaConnectCard } from "./MetaConnectCard";

export const dynamic = "force-dynamic";

interface Totals {
  spend: number;
  results: number;
  impressions: number;
  conversations: number;
  reach: number;
}

type Period = "last_30" | "this_month" | "last_month";

function rangeFor(period: Period): { from: string; to: string; prevFrom: string; prevTo: string } {
  const now = new Date();
  if (period === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevTo = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(prevTo) };
  }
  if (period === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevTo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    return { from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(prevTo) };
  }
  const to = now;
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(prevTo) };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function totalsFor(clientId: string, from: string, to: string): Promise<Totals> {
  const row = await queryOne<{
    spend: number;
    results: string;
    impressions: string;
    conversations: string;
    reach: string;
  }>(
    `select
       coalesce(sum(spend), 0) as spend,
       coalesce(sum(leads) + sum(purchases) + sum(messaging_conversations), 0)::text as results,
       coalesce(sum(impressions), 0)::text as impressions,
       coalesce(sum(messaging_conversations), 0)::text as conversations,
       coalesce(sum(reach), 0)::text as reach
     from meta_insights_daily
     where client_id = $1 and date >= $2 and date <= $3`,
    [clientId, from, to]
  );
  return {
    spend: row?.spend ?? 0,
    results: Number(row?.results ?? 0),
    impressions: Number(row?.impressions ?? 0),
    conversations: Number(row?.conversations ?? 0),
    reach: Number(row?.reach ?? 0),
  };
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={clsx("text-xs font-medium", up ? "text-success" : "text-danger")}>
      {up ? "+" : ""}
      {pct.toFixed(0)}% vs. periodo anterior
    </span>
  );
}

export default async function PortalMetricsPage({
  searchParams,
}: {
  searchParams: { period?: string; meta?: string };
}) {
  const { clientId, clientRole, isAdminPreview } = await requireClient();
  const period = (["last_30", "this_month", "last_month"].includes(searchParams.period ?? "")
    ? searchParams.period
    : "last_30") as Period;
  const { from, to, prevFrom, prevTo } = rangeFor(period);

  const [totals, prevTotals, followers, topPosts] = await Promise.all([
    totalsFor(clientId, from, to),
    totalsFor(clientId, prevFrom, prevTo),
    queryOne<{ followers: number }>(
      `select followers from social_insights_daily where client_id = $1 and followers is not null
       order by date desc limit 1`,
      [clientId]
    ),
    query<{ id: string; caption: string | null; permalink: string | null; engagement: number | null }>(
      `select id, caption, permalink, engagement from social_posts where client_id = $1
       order by engagement desc nulls last limit 5`,
      [clientId]
    ),
  ]);

  const costPerResult = totals.results > 0 ? totals.spend / totals.results : null;
  const hasData = totals.spend > 0 || totals.results > 0 || totals.impressions > 0;

  const PERIODS: { value: Period; label: string }[] = [
    { value: "last_30", label: "Últimos 30 días" },
    { value: "this_month", label: "Este mes" },
    { value: "last_month", label: "Mes pasado" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Métricas</h1>
          <p className="text-sm text-text-muted">Resultados de tu inversión en Meta Ads/Instagram.</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/portal/metrics?period=${p.value}`}
              className={clsx(
                "rounded-xl px-3 py-1.5 text-xs font-medium",
                p.value === period
                  ? "bg-accent text-accent-fg"
                  : "bg-surface-hover text-text-muted hover:text-text-primary"
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <MetaConnectCard clientId={clientId} isOwner={clientRole === "owner"} isPreview={isAdminPreview} status={searchParams.meta} />

      {!hasData ? (
        <Card>
          <p className="text-sm text-text-muted">
            Todavía no hay datos de pauta sincronizados para este período.
          </p>
        </Card>
      ) : (
        <Card>
          <CardTitle>Pauta</CardTitle>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-lg font-semibold text-text-primary">{formatCurrency(totals.spend)}</p>
              <p className="text-xs text-text-muted">Invertido</p>
              <Delta current={totals.spend} previous={prevTotals.spend} />
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{totals.results}</p>
              <p className="text-xs text-text-muted">Resultados</p>
              <Delta current={totals.results} previous={prevTotals.results} />
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">
                {costPerResult != null ? formatCurrency(costPerResult) : "—"}
              </p>
              <p className="text-xs text-text-muted">Costo por resultado</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{totals.conversations}</p>
              <p className="text-xs text-text-muted">Conversaciones WhatsApp</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{totals.reach.toLocaleString("es-AR")}</p>
              <p className="text-xs text-text-muted">Alcance</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">
                {totals.impressions.toLocaleString("es-AR")}
              </p>
              <p className="text-xs text-text-muted">Impresiones</p>
            </div>
            {followers && (
              <div>
                <p className="text-lg font-semibold text-text-primary">{followers.followers.toLocaleString("es-AR")}</p>
                <p className="text-xs text-text-muted">Seguidores</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {topPosts.length > 0 && (
        <Card>
          <CardTitle>Top posts</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {topPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <p className="truncate text-sm text-text-primary">{p.caption || "(sin descripción)"}</p>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-accent hover:underline">
                    Ver →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
