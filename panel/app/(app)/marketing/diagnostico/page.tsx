import Link from "next/link";
import { queryOne } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { clientAccessError, requireTrendsAccess, selectableClients } from "@/lib/trends/access";
import { ownVideos, referenceStats, type DiagnosticReport } from "@/lib/trends/diagnostics";
import { formatCount, formatDuration, formatPercent } from "@/lib/trends/view";
import { RadarHeader } from "../radar/_components/RadarNav";
import { ClientPicker } from "./ClientPicker";
import { GenerateDiagnosticButton } from "./GenerateDiagnosticButton";

export const dynamic = "force-dynamic";

export default async function DiagnosticPage({ searchParams }: { searchParams: { client?: string } }) {
  const access = await requireTrendsAccess();
  const clients = await selectableClients(access);
  const clientId = searchParams.client && clients.some((c) => c.id === searchParams.client) ? searchParams.client : null;

  const header = (
    <RadarHeader
      active="/marketing/diagnostico"
      title="Diagnóstico de nuestros videos"
      subtitle="Por qué nuestros reels rinden como rinden: ranking contra el promedio de la cuenta y contra los referentes del Radar."
    />
  );

  if (!clientId || clientAccessError(access, clientId)) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">Elegí un cliente para ver el diagnóstico.</p>
          <ClientPicker clients={clients} value="" />
        </Card>
      </div>
    );
  }

  const [{ videos, stats }, refs, latest] = await Promise.all([
    ownVideos(clientId),
    referenceStats(clientId),
    queryOne<{ report: DiagnosticReport; created_at: string; author: string | null }>(
      `select d.report, d.created_at, p.full_name as author from video_diagnostics d
       left join profiles p on p.id = d.created_by
       where d.client_id = $1 order by d.created_at desc limit 1`,
      [clientId]
    ),
  ]);
  const ranked = [...videos].sort((a, b) => (b.views ?? -1) - (a.views ?? -1));

  return (
    <div className="flex flex-col gap-6">
      {header}
      <ClientPicker clients={clients} value={clientId} />

      {videos.length === 0 ? (
        <Card className="text-sm text-text-muted">
          No hay reels sincronizados de este cliente en los últimos 90 días. Conectá su Instagram en la ficha del cliente (pestaña Métricas) y esperá la
          sincronización diaria de Meta (6 am).
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Reels (90 días)" value={String(stats.videos)} hint={`${stats.posts_per_week} publicaciones/semana`} />
            <StatTile label="Vistas promedio" value={formatCount(stats.avg_views)} hint={`Alcance prom. ${formatCount(stats.avg_reach)}`} />
            <StatTile label="Engagement prom." value={formatPercent(stats.avg_engagement_rate)} hint={`Compartidos ${stats.avg_shares ?? "n/d"} · Guardados ${stats.avg_saved ?? "n/d"}`} />
            <StatTile label="Tiempo de vista prom." value={stats.avg_watch_time_s != null ? `${stats.avg_watch_time_s}s` : "n/d"} hint="Dato de Meta por reel" />
          </div>

          <Card className="flex flex-col gap-3">
            <CardTitle>Nosotros vs. referentes del Radar</CardTitle>
            {refs.videos === 0 ? (
              <p className="text-sm text-text-muted">
                Todavía no hay búsquedas del Radar para este cliente.{" "}
                <Link href="/marketing/radar" className="text-accent underline">Hacé una</Link> para tener contra qué comparar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                      <th className="pb-2 pr-4"></th>
                      <th className="pb-2 pr-4">Nosotros</th>
                      <th className="pb-2">Referentes ({refs.videos})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-primary">
                    <tr><td className="py-2 pr-4 text-text-muted">Vistas promedio</td><td className="py-2 pr-4">{formatCount(stats.avg_views)}</td><td className="py-2">{formatCount(refs.avg_views)}</td></tr>
                    <tr><td className="py-2 pr-4 text-text-muted">Engagement</td><td className="py-2 pr-4">{formatPercent(stats.avg_engagement_rate)}</td><td className="py-2">{formatPercent(refs.avg_engagement_rate)}</td></tr>
                    <tr><td className="py-2 pr-4 text-text-muted">Duración</td><td className="py-2 pr-4">n/d (Meta no la da)</td><td className="py-2">{formatDuration(refs.avg_duration_s)}</td></tr>
                    <tr><td className="py-2 pr-4 text-text-muted">Ganchos</td><td className="py-2 pr-4">ver reporte IA</td><td className="py-2">{refs.hooks.slice(0, 4).map((h) => `${h.label} ×${h.count}`).join(", ") || "sin análisis"}</td></tr>
                    <tr><td className="py-2 pr-4 text-text-muted">Frecuencia</td><td className="py-2 pr-4">{stats.posts_per_week}/semana</td><td className="py-2">—</td></tr>
                    <tr><td className="py-2 pr-4 text-text-muted">Horarios más usados</td><td className="py-2 pr-4">{stats.top_hours.map((h) => `${h.hour}h`).join(", ") || "—"} · {stats.top_weekdays.map((d) => d.day).join(", ")}</td><td className="py-2">—</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Reporte IA</CardTitle>
                {latest && (
                  <p className="text-xs text-text-muted">
                    {new Date(latest.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                    {latest.author ? ` · ${latest.author}` : ""} · inferencia de la IA a partir de las métricas
                  </p>
                )}
              </div>
              <GenerateDiagnosticButton clientId={clientId} hasReport={Boolean(latest)} />
            </div>
            {latest ? (
              <div className="flex flex-col gap-4 text-sm text-text-primary">
                <p>{latest.report.summary}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-muted">Los que peor rinden</p>
                    <ul className="list-disc pl-5">{latest.report.worst_patterns.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-muted">Los que mejor rinden</p>
                    <ul className="list-disc pl-5">{latest.report.best_patterns.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-muted">Contra referentes</p>
                    <ul className="list-disc pl-5">{latest.report.vs_references.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">5 cambios para el próximo mes</p>
                  <ol className="mt-2 flex flex-col gap-2">
                    {latest.report.actions.map((a, i) => (
                      <li key={i} className="rounded-xl bg-surface-hover p-3">
                        <p className="font-medium">{i + 1}. {a.title}</p>
                        <p className="text-text-muted">{a.detail}</p>
                        <p className="mt-1 text-xs">Medir: {a.metric_to_watch}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Todavía no hay reporte. Generalo para ver patrones y 5 cambios accionables.</p>
            )}
          </Card>

          <Card>
            <CardTitle>Ranking de reels</CardTitle>
            <ul className="mt-3 divide-y divide-border">
              {ranked.map((v, i) => (
                <li key={v.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <span className="num w-8 text-sm text-text-muted">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">{v.caption?.slice(0, 120) || "(sin texto)"}</p>
                    <p className="text-xs text-text-muted">
                      {v.posted_at ? new Date(v.posted_at).toLocaleDateString("es-AR") : "—"} · {formatCount(v.views)} vistas · alcance {formatCount(v.reach)} ·{" "}
                      {formatCount(v.shares)} compartidos · {formatCount(v.saved)} guardados
                      {v.avg_watch_time_ms != null ? ` · ${(v.avg_watch_time_ms / 1000).toFixed(1)}s de vista` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.vs_avg != null && (
                      <Badge tone={v.vs_avg >= 1.5 ? "success" : v.vs_avg < 0.6 ? "danger" : "neutral"}>{v.vs_avg.toFixed(1).replace(".", ",")}x prom.</Badge>
                    )}
                    {v.permalink && (
                      <a href={v.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline">Ver</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
