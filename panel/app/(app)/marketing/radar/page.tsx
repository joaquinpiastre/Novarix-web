import Link from "next/link";
import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { isAiConfigured } from "@/lib/ai/client";
import { requireTrendsAccess, selectableClients } from "@/lib/trends/access";
import { providerStatuses } from "@/lib/trends/providers";
import { SEARCH_STATUS_LABELS, type SearchStatus } from "@/lib/trends/types";
import { formatUsd } from "@/lib/trends/view";
import { RadarHeader } from "./_components/RadarNav";
import { LinkForm, SearchForm } from "./_components/SearchForm";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const access = await requireTrendsAccess();
  const clients = await selectableClients(access);
  const searches = await query<{
    id: string;
    prompt: string;
    status: SearchStatus;
    kind: string;
    created_at: string;
    client_name: string | null;
    author: string;
    cost_usd: number;
    results: number;
  }>(
    `select s.id, s.prompt, s.status, s.kind, s.created_at, c.name as client_name, p.full_name as author, s.cost_usd,
            (select count(*)::int from trend_search_results r where r.search_id = s.id and not r.discarded) as results
     from trend_searches s
     left join clients c on c.id = s.client_id
     join profiles p on p.id = s.profile_id
     where ($1::boolean or s.profile_id = $2 or s.client_id = any($3::uuid[]))
       and s.saved_search_id is null
     order by s.created_at desc limit 30`,
    [access.full, access.userId, access.clientIds]
  );

  const statuses = providerStatuses();
  const requireClient = !access.full;

  return (
    <div className="flex flex-col gap-6">
      <RadarHeader
        active="/marketing/radar"
        title="Radar viral"
        subtitle="Encontrá videos que explotaron en tu rubro, entendé por qué funcionaron y convertilos en ideas para tus clientes."
      />

      {!isAiConfigured() && (
        <Card className="border-warning/40 text-sm text-warning">La IA no está configurada (falta ANTHROPIC_API_KEY): el Radar no puede armar planes ni analizar.</Card>
      )}
      {requireClient && clients.length === 0 && (
        <Card className="text-sm text-text-muted">Todavía no tenés clientes asignados. Pedile a un admin que te sume al equipo de un cliente.</Card>
      )}

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Badge key={s.platform} tone={s.active ? "success" : "neutral"} title={s.detail}>
            {s.label}: {s.detail}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SearchForm clients={clients} requireClient={requireClient} />
        </div>
        <LinkForm clients={clients} requireClient={requireClient} />
      </div>

      <Card>
        <CardTitle>Búsquedas recientes</CardTitle>
        <ul className="mt-3 divide-y divide-border">
          {searches.map((s) => (
            <li key={s.id}>
              <Link href={`/marketing/radar/${s.id}`} className="flex flex-col gap-1 py-3 hover:text-accent sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{s.prompt}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(s.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · {s.author}
                    {s.client_name ? ` · ${s.client_name}` : ""}
                    {s.status === "done" && s.kind === "search" ? ` · ${s.results} videos` : ""}
                    {s.cost_usd > 0 ? ` · ${formatUsd(s.cost_usd)}` : ""}
                  </p>
                </div>
                <Badge tone={s.status === "done" ? "success" : s.status === "error" ? "danger" : "warning"}>
                  {s.kind === "manual" ? "Link · " : ""}
                  {SEARCH_STATUS_LABELS[s.status]}
                </Badge>
              </Link>
            </li>
          ))}
          {searches.length === 0 && <li className="py-6 text-center text-sm text-text-muted">Todavía no hay búsquedas.</li>}
        </ul>
      </Card>
    </div>
  );
}
