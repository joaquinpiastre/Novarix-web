import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { queryOne } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { loadAccessibleSearch, requireTrendsAccess, selectableClients } from "@/lib/trends/access";
import { searchResultCards } from "@/lib/trends/queries";
import { hookLabel, SEARCH_STATUS_LABELS, type SearchPatterns, type SearchPlan, type SearchStatus } from "@/lib/trends/types";
import { formatDuration, formatUsd } from "@/lib/trends/view";
import { PlanEditor } from "../_components/PlanEditor";
import { ProgressPoller } from "../_components/ProgressPoller";
import { ResultsView } from "../_components/ResultsView";
import { SearchActions } from "./SearchActions";

export const dynamic = "force-dynamic";

interface SearchRow {
  id: string;
  profile_id: string;
  client_id: string | null;
  saved_search_id: string | null;
  kind: "search" | "manual";
  prompt: string;
  plan: SearchPlan | null;
  status: SearchStatus;
  progress: number;
  progress_message: string | null;
  error: string | null;
  patterns: SearchPatterns | null;
  provider_notes: string[];
  cost_usd: number;
  cached_from: string | null;
  created_at: string;
}

export default async function SearchPage({ params }: { params: { id: string } }) {
  const access = await requireTrendsAccess();
  const search = await loadAccessibleSearch<SearchRow>(access, params.id);
  if (!search) notFound();

  const [clients, client] = await Promise.all([
    selectableClients(access),
    search.client_id ? queryOne<{ name: string }>("select name from clients where id = $1", [search.client_id]) : null,
  ]);
  const running = ["planning", "queued", "searching", "analyzing"].includes(search.status);
  const cards = search.status === "done" ? await searchResultCards(search.id, search.client_id) : [];
  const p = search.patterns;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/marketing/radar" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Radar
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={search.status === "done" ? "success" : search.status === "error" ? "danger" : "warning"}>
            {SEARCH_STATUS_LABELS[search.status]}
          </Badge>
          {client && <Badge tone="accent">{client.name}</Badge>}
          {search.cached_from && <Badge>Del caché</Badge>}
          {search.saved_search_id && <Badge>Alerta</Badge>}
          {search.cost_usd > 0 && <span className="text-xs text-text-muted">Costo estimado: {formatUsd(search.cost_usd)}</span>}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">{search.prompt}</h1>
      </div>

      {search.status === "ready" && search.plan && (
        <PlanEditor searchId={search.id} plan={search.plan} providerNotes={[]} />
      )}
      {search.status === "planning" && (
        <Card className="text-sm text-text-muted">La IA está armando el plan… recargá en unos segundos.</Card>
      )}
      {running && search.status !== "planning" && (
        <ProgressPoller searchId={search.id} initialProgress={search.progress} initialMessage={search.progress_message} />
      )}
      {search.status === "error" && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-danger">{search.error ?? "La búsqueda falló."}</p>
          {search.plan && search.kind === "search" && <PlanEditor searchId={search.id} plan={search.plan} providerNotes={search.provider_notes ?? []} />}
        </Card>
      )}

      {search.status === "done" && (
        <>
          {(search.provider_notes?.length ?? 0) > 0 && (
            <Card className="text-xs text-text-muted">
              <ul className="list-disc pl-4">
                {search.provider_notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </Card>
          )}

          {p && (
            <Card className="flex flex-col gap-3">
              <div>
                <CardTitle>Qué tienen en común los mejores</CardTitle>
                <p className="text-xs text-text-muted">Resumen de la IA a partir del top de resultados — es una inferencia, no un dato.</p>
              </div>
              <p className="text-sm text-text-primary">{p.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">Ganchos que más se repiten</p>
                  <ul className="mt-1 text-sm text-text-primary">
                    {p.common_hooks.map((h) => (
                      <li key={h.type}>{hookLabel(h.type)} ×{h.count} <span className="text-xs text-text-muted">— {h.example}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">Duración promedio</p>
                  <p className="num text-lg font-semibold text-text-primary">{formatDuration(p.avg_duration_seconds)}</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-text-muted">Formatos</p>
                  <p className="text-sm text-text-primary">{p.formats.join(" · ")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">Hashtags frecuentes</p>
                  <p className="text-sm text-text-primary">{p.top_hashtags.map((h) => `#${h.tag} (${h.count})`).join("  ")}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">Patrones</p>
                  <ul className="list-disc pl-5 text-sm text-text-primary">{p.insights.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">Qué haríamos</p>
                  <ul className="list-disc pl-5 text-sm text-text-primary">{p.recommendations.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              </div>
            </Card>
          )}

          {search.kind === "search" && !search.saved_search_id && <SearchActions searchId={search.id} prompt={search.prompt} />}

          <ResultsView cards={cards} clientId={search.client_id} clients={clients} searchId={search.id} showSort={search.kind === "search"} />
          <p className="text-xs text-text-muted">
            Score, outlier, velocidad y engagement son métricas propias de Novarix calculadas con los números de cada plataforma (que se muestran tal cual).
            Los videos se ven con el reproductor oficial de cada plataforma; no se descargan. Los datos de YouTube se refrescan o borran a los 30 días, como piden sus políticas.
          </p>
        </>
      )}
    </div>
  );
}
