"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExternalLink, Facebook, Instagram } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils/dates";
import type { SocialAccountSummary, SocialOverviewData, SocialTopPost } from "@/lib/meta/social";

// Metricas organicas de Facebook e Instagram (no pauta). Componente de
// presentacion: los datos vienen de getSocialOverview (servidor).

const nf = new Intl.NumberFormat("es-AR");
const fmt = (n: number | null | undefined) => (n == null ? "—" : nf.format(Math.round(n)));

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="num text-lg font-semibold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}

function AccountCard({ account }: { account: SocialAccountSummary }) {
  const isIg = account.type === "instagram";
  const Icon = isIg ? Instagram : Facebook;
  const growth = account.followerGrowth;
  const hasDaily = account.daily.some((d) => d.views != null);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0">
          <CardTitle className="truncate">{account.name}</CardTitle>
          <p className="text-xs text-text-muted">{isIg ? "Instagram" : "Página de Facebook"} · orgánico</p>
        </div>
      </div>

      {account.daysWithData === 0 && account.followers == null ? (
        <p className="text-sm text-text-muted">
          Todavía no hay datos. Se cargan en la próxima sincronización (podés tocar “Sincronizar ahora”).
          {!isIg && " Si sigue vacío, reconectá Facebook aceptando todos los permisos (incluido ver estadísticas)."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="Seguidores"
              value={fmt(account.followers)}
              hint={growth != null ? `+${fmt(growth)} nuevos en el período` : undefined}
            />
            <Stat label="Visualizaciones" value={fmt(account.views)} />
            <Stat label="Alcance diario promedio" value={fmt(account.avgDailyReach)} hint="cuentas por día" />
            <Stat label="Interacciones" value={fmt(account.engagement)} hint={isIg ? "me gusta, comentarios, guardados, compartidos" : "reacciones, comentarios, compartidos y clics"} />
            {isIg ? <Stat label="Toques en enlaces" value={fmt(account.linkTaps)} /> : <Stat label="Visitas a la página" value={fmt(account.profileVisits)} />}
          </div>

          {hasDaily && (
            <div>
              <p className="mb-2 text-xs font-medium text-text-muted">Visualizaciones por día</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={account.daily} barCategoryGap="20%">
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => formatDate(v).slice(0, 5)}
                      stroke="var(--chart-axis)"
                      tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      tickFormatter={(v) => nf.format(v)}
                      stroke="var(--chart-axis)"
                      tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--chart-grid)" }}
                      formatter={(v: number) => [nf.format(v), "Visualizaciones"]}
                      labelFormatter={(v) => formatDate(v)}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="views" fill="var(--chart-series)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function TopPosts({ posts }: { posts: SocialTopPost[] }) {
  if (posts.length === 0) return null;
  return (
    <Card>
      <CardTitle>Publicaciones de Instagram que mejor funcionaron</CardTitle>
      <ul className="mt-3 divide-y divide-border">
        {posts.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm text-text-primary">{p.caption?.trim() || "(sin texto)"}</p>
              <p className="mt-1 text-xs text-text-muted">
                {p.isReel ? "Reel" : "Post"}
                {p.postedAt ? ` · ${formatDate(p.postedAt.slice(0, 10))}` : ""} · {fmt(p.views)} visualizaciones · {fmt(p.reach)} alcance ·{" "}
                {fmt(p.interactions)} interacciones
              </p>
            </div>
            {p.permalink && (
              <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-text-muted hover:text-accent" aria-label="Ver en Instagram">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SocialOverview({ data, periodLabel }: { data: SocialOverviewData; periodLabel: string }) {
  if (data.accounts.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Redes sociales</h2>
        <p className="text-sm text-text-muted">Resultados orgánicos (sin pauta) · {periodLabel}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.accounts.map((a) => (
          <AccountCard key={a.assetId} account={a} />
        ))}
      </div>
      <TopPosts posts={data.topPosts} />
    </section>
  );
}
