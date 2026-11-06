import { notFound } from "next/navigation";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { can } from "@/lib/auth/permissions";
import { query, queryOne } from "@/lib/db";
import { CHECKLIST_ITEMS } from "@/lib/marketing/checklist";
import { getClientFiles, getClientReports, getCompanyUsers, getPendingInvites } from "@/lib/portal/queries";
import type {
  Alert,
  BrandKit,
  Campaign,
  Client,
  ClientChecklistRow,
  ClientService,
  ClientTeamMember,
  ContentItem,
  Deliverable,
  GhlBot,
  MarketingPlan,
  MetaAsset,
  MetaConnection,
  Profile,
  Project,
  ProjectMilestone,
  ServiceCatalogItem,
  TechAsset,
} from "@/lib/types/domain";
import { ClientDetailTabs } from "./ClientDetailTabs";

export const dynamic = "force-dynamic";

export interface ClientServiceRow extends ClientService {
  service_name: string;
  service_category: string;
}

export interface ClientTeamRow extends ClientTeamMember {
  full_name: string;
  role: string;
}

export interface AgreementRow {
  id: string;
  amount: number;
  billing_day: number;
  concept: string;
  active: boolean;
}

export interface PaymentHistoryRow {
  id: string;
  amount: number;
  concept: string;
  date_received: string | null;
  period_month: string | null;
}

export interface DeliverableProgress extends Deliverable {
  delivered: number;
}

export interface ContentCommentRow {
  id: string;
  entity_id: string;
  body: string;
  created_at: string;
  author_name: string;
  from_client: boolean;
}

export interface DailySpendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const access = await requireClientAccess(params.id);
  const { full } = access;
  const canSeeFinance = can(access.profile, "payments_in.manage");
  const canSeeSystems = can(access.profile, "systems.manage");

  const client = await queryOne<Client>("select * from clients where id = $1", [params.id]);
  if (!client) notFound();

  const [
    services,
    team,
    allServices,
    allProfiles,
    agreements,
    payments,
    currentPlan,
    checklistRows,
    campaigns,
    contentItems,
    brandKit,
  ] = await Promise.all([
    full
      ? query<ClientServiceRow>(
          `select cs.*, sc.name as service_name, sc.category as service_category
           from client_services cs
           join services_catalog sc on sc.id = cs.service_id
           where cs.client_id = $1
           order by cs.status = 'active' desc, cs.started_at desc`,
          [params.id]
        )
      : Promise.resolve([]),
    full
      ? query<ClientTeamRow>(
          `select ct.*, p.full_name, p.role::text as role
           from client_team ct
           join profiles p on p.id = ct.profile_id
           where ct.client_id = $1
           order by p.full_name`,
          [params.id]
        )
      : Promise.resolve([]),
    query<ServiceCatalogItem>(
      "select * from services_catalog where active = true order by category, name"
    ),
    query<Pick<Profile, "id" | "full_name" | "role">>(
      "select id, full_name, role from profiles where role != 'client' order by full_name"
    ),
    canSeeFinance
      ? query<AgreementRow>(
          "select id, amount, billing_day, concept, active from recurring_agreements where client_id = $1 order by active desc, billing_day",
          [params.id]
        )
      : Promise.resolve([]),
    canSeeFinance
      ? query<PaymentHistoryRow>(
          `select id, amount, concept, date_received, period_month from payments_in
           where client_id = $1 order by coalesce(date_received, created_at) desc limit 20`,
          [params.id]
        )
      : Promise.resolve([]),
    queryOne<MarketingPlan>(
      `select * from marketing_plans where client_id = $1
       order by status = 'active' desc, period_start desc limit 1`,
      [params.id]
    ),
    query<ClientChecklistRow>("select * from client_checklist where client_id = $1", [params.id]),
    query<Campaign>("select * from campaigns where client_id = $1 order by start_date desc nulls last", [
      params.id,
    ]),
    query<ContentItem>(
      "select * from content_items where client_id = $1 order by scheduled_at nulls last, created_at desc",
      [params.id]
    ),
    queryOne<BrandKit>("select * from brand_kits where client_id = $1", [params.id]),
  ]);

  const [metaConnections, metaAssets, dailySpend, alerts] = await Promise.all([
    query<MetaConnection>(
      "select * from meta_connections where client_id = $1 order by created_at desc",
      [params.id]
    ),
    query<MetaAsset>(
      "select * from meta_assets where client_id = $1 and active = true order by asset_type",
      [params.id]
    ),
    query<DailySpendPoint>(
      `select date::text,
              sum(spend)::float as spend,
              sum(impressions)::int as impressions,
              sum(clicks)::int as clicks,
              (sum(leads) + sum(purchases) + sum(messaging_conversations))::int as results
       from meta_insights_daily
       where client_id = $1 and date >= current_date - interval '30 days'
       group by date
       order by date`,
      [params.id]
    ),
    query<Alert>(
      "select * from alerts where client_id = $1 and resolved = false order by created_at desc",
      [params.id]
    ),
  ]);

  const [companyUsers, pendingInvites] = full
    ? await Promise.all([getCompanyUsers(params.id), getPendingInvites(params.id)])
    : [[], []];

  const [projects, techAssets, ghlBots] = await Promise.all([
    canSeeSystems
      ? query<Project>(
          "select * from projects where client_id = $1 order by status = 'done' or status = 'cancelled', due_date nulls last, created_at desc",
          [params.id]
        )
      : Promise.resolve([]),
    canSeeSystems
      ? query<TechAsset>(
          "select * from tech_assets where client_id = $1 order by expires_at nulls last, created_at desc",
          [params.id]
        )
      : Promise.resolve([]),
    canSeeSystems
      ? query<GhlBot>("select * from ghl_bots where client_id = $1 order by created_at desc", [params.id])
      : Promise.resolve([]),
  ]);

  const ticketStats = await queryOne<{ open_count: string; avg_csat: number | null }>(
    `select count(*) filter (where status not in ('resuelto','cerrado'))::text as open_count,
            avg(csat_score)::float as avg_csat
     from support_tickets where client_id = $1`,
    [params.id]
  );
  const openTicketsCount = ticketStats?.open_count ?? "0";

  const [reports, sharedFiles, contentComments] = await Promise.all([
    full ? getClientReports(params.id) : Promise.resolve([]),
    full ? getClientFiles(params.id) : Promise.resolve([]),
    query<ContentCommentRow>(
      `select c.id, c.entity_id, c.body, c.created_at, p.full_name as author_name,
              (p.role = 'client') as from_client
       from comments c join profiles p on p.id = c.author_id
       where c.client_id = $1 and c.entity_type = 'content_item'
       order by c.created_at asc`,
      [params.id]
    ),
  ]);

  const milestonesByProject = new Map<string, ProjectMilestone[]>();
  if (projects.length > 0) {
    const milestones = await query<ProjectMilestone>(
      "select * from project_milestones where project_id = any($1) order by done, due_date nulls last, created_at",
      [projects.map((p) => p.id)]
    );
    for (const m of milestones) {
      const list = milestonesByProject.get(m.project_id) ?? [];
      list.push(m);
      milestonesByProject.set(m.project_id, list);
    }
  }

  let deliverables: DeliverableProgress[] = [];
  if (currentPlan) {
    const counts = await query<{ format: string; n: string }>(
      `select format, count(*)::text as n from content_items
       where client_id = $1 and status = 'publicado'
         and published_at >= $2 and published_at <= $3
       group by format`,
      [params.id, currentPlan.period_start, currentPlan.period_end]
    );
    const countMap = new Map(counts.map((c) => [c.format, Number(c.n)]));
    deliverables = currentPlan.deliverables.map((d) => ({
      ...d,
      delivered: countMap.get(d.format) ?? 0,
    }));
  }

  const checklistCompleted = new Set(
    checklistRows.filter((r) => r.completed).map((r) => r.item_key)
  );
  const missingServices = CHECKLIST_ITEMS.filter((i) => !checklistCompleted.has(i.key)).map(
    (i) => i.suggestedService
  );
  const opportunities = Array.from(new Set(missingServices));

  return (
    <ClientDetailTabs
      access={access}
      canSeeSystems={canSeeSystems}
      projects={projects}
      milestonesByProject={milestonesByProject}
      openTicketsCount={Number(openTicketsCount)}
      avgCsat={ticketStats?.avg_csat ?? null}
      reports={reports}
      sharedFiles={sharedFiles}
      contentComments={contentComments}
      techAssets={techAssets}
      ghlBots={ghlBots}
      client={client}
      services={services}
      team={team}
      allServices={allServices}
      allProfiles={allProfiles}
      agreements={agreements}
      payments={payments}
      canSeeFinance={canSeeFinance}
      currentPlan={currentPlan}
      deliverables={deliverables}
      checklistCompleted={checklistCompleted}
      opportunities={opportunities}
      campaigns={campaigns}
      contentItems={contentItems}
      brandKit={brandKit}
      metaConnections={metaConnections}
      metaAssets={metaAssets}
      dailySpend={dailySpend}
      alerts={alerts}
      companyUsers={companyUsers}
      pendingInvites={pendingInvites}
    />
  );
}
