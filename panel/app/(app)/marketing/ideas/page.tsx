import { query, queryOne } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { KeepAliveTabs } from "./KeepAliveTabs";
import { isAiConfigured } from "@/lib/ai/client";
import { clientAccessError, requireTrendsAccess, selectableClients } from "@/lib/trends/access";
import { isInstagramConfigured } from "@/lib/trends/providers/instagram";
import { loadChat } from "@/lib/ideas/chat";
import { daysBetween, todayInMendoza, upcomingCommercialDates } from "@/lib/ideas/commercialDates";
import { customCommercialDates } from "@/lib/ideas/commercialDatesJob";
import type { IdeaBankItem } from "@/lib/ideas/types";
import { ClientPicker } from "../diagnostico/ClientPicker";
import { BankPanel, ChatPanel, CompetitorsPanel, DatesPanel } from "./Panels";
import { AdsTool, HashtagsTool, HooksTool, IdeasTool, RecyclerTool, ScriptTool } from "./ToolForms";

export const dynamic = "force-dynamic";

const OBJECTIVE_HINTS: [RegExp, string][] = [
  [/mensaj|whats|consult/i, "mensajes"],
  [/lead|contact|formul/i, "leads"],
  [/venta|compra|convers/i, "ventas"],
  [/tr[aá]fico|web|visita/i, "trafico"],
  [/alcance|reconoc|marca|awareness/i, "alcance"],
];

export default async function IdeasPage({ searchParams }: { searchParams: { client?: string; tab?: string } }) {
  const access = await requireTrendsAccess();
  const clients = await selectableClients(access);
  const clientId =
    searchParams.client && clients.some((c) => c.id === searchParams.client)
      ? searchParams.client
      : clients.length === 1
        ? clients[0].id
        : null;

  const header = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Caja de ideas</h1>
      <p className="text-sm text-text-muted">Ideas, ganchos, guiones, campañas y estrategia, con el contexto de cada cliente.</p>
    </div>
  );

  if (!clientId || clientAccessError(access, clientId)) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">Elegí un cliente: todas las herramientas usan su rubro, kit de marca, plan y lo que ya le funcionó.</p>
          <ClientPicker clients={clients} value="" />
        </Card>
      </div>
    );
  }

  const today = todayInMendoza();
  const [bank, competitors, chat, custom, plan] = await Promise.all([
    query<IdeaBankItem>(
      `select i.id, i.title, i.body, i.format, i.pillar, i.source, i.reference_url, i.content_item_id, i.created_at, p.full_name as author
       from idea_bank i left join profiles p on p.id = i.created_by
       where i.client_id = $1 order by i.created_at desc limit 200`,
      [clientId]
    ),
    query<{ id: string; name: string; ig_username: string | null; fb_page_id: string | null; notes: string | null }>(
      "select id, name, ig_username, fb_page_id, notes from competitors where client_id = $1 order by name",
      [clientId]
    ),
    loadChat(access.userId, clientId),
    customCommercialDates(clientId),
    queryOne<{ objectives: string | null }>(
      "select objectives from marketing_plans where client_id = $1 and status in ('active','approved') order by (status='active') desc, period_start desc limit 1",
      [clientId]
    ),
  ]);
  const dates = upcomingCommercialDates(today, 150, custom).map((d) => ({
    ...d,
    days: daysBetween(today, d.date),
    customId: d.key.startsWith("custom-") ? d.key.slice(7) : undefined,
  }));
  const defaultObjective = OBJECTIVE_HINTS.find(([re]) => re.test(plan?.objectives ?? ""))?.[1] ?? "mensajes";

  const tabs = [
    { id: "ideas", label: "Ideas", content: <IdeasTool clientId={clientId} /> },
    { id: "ganchos", label: "Ganchos", content: <HooksTool clientId={clientId} /> },
    { id: "guion", label: "Guionista", content: <ScriptTool clientId={clientId} /> },
    { id: "reciclador", label: "Reciclador", content: <RecyclerTool clientId={clientId} /> },
    { id: "hashtags", label: "Hashtags", content: <HashtagsTool clientId={clientId} /> },
    { id: "competidores", label: "Competidores", content: <CompetitorsPanel clientId={clientId} competitors={competitors} clients={clients} igConfigured={isInstagramConfigured()} /> },
    { id: "fechas", label: "Fechas", content: <DatesPanel clientId={clientId} dates={dates} today={today} canAddGlobal={access.full} /> },
    { id: "ads", label: "Ads", content: <AdsTool clientId={clientId} defaultObjective={defaultObjective} /> },
    { id: "chat", label: "Chat", content: <ChatPanel clientId={clientId} initial={chat} /> },
    { id: "banco", label: `Banco (${bank.length})`, content: <BankPanel clientId={clientId} items={bank} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}
      <ClientPicker clients={clients} value={clientId} />
      {!isAiConfigured() && (
        <Card className="border-warning/40 text-sm text-warning">La IA no está configurada (falta ANTHROPIC_API_KEY).</Card>
      )}
      <KeepAliveTabs key={clientId} items={tabs} defaultTab={tabs.some((t) => t.id === searchParams.tab) ? searchParams.tab : "ideas"} />
    </div>
  );
}
