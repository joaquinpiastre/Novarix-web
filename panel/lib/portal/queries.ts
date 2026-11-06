import "server-only";
import { query, queryOne } from "@/lib/db";
import type {
  Alert,
  BrandKit,
  Campaign,
  Client,
  ClientFile,
  ClientReport,
  ContentItem,
  MarketingPlan,
  PaymentIn,
  Project,
  ProjectMilestone,
  RecurringAgreement,
} from "@/lib/types/domain";

// Unico lugar de donde el portal lee datos. Cada funcion recibe clientId
// (siempre sale de requireClient(), nunca de un param/query/body) y
// devuelve SOLO los campos permitidos -- nunca notas internas, costos,
// margenes, comentarios marcados internal, tokens, ni nada de otro
// cliente. Si una pantalla del portal necesita un campo nuevo, se agrega
// la columna acá explícitamente, nunca con "select *" contra una tabla que
// tenga datos sensibles.

export interface PortalServiceRow {
  service_id: string;
  name: string;
  category: string;
  started_at: string;
}

export async function getContractedServices(clientId: string): Promise<PortalServiceRow[]> {
  return query<PortalServiceRow>(
    `select sc.id as service_id, sc.name, sc.category, cs.started_at
     from client_services cs
     join services_catalog sc on sc.id = cs.service_id
     where cs.client_id = $1 and cs.status = 'active'
     order by sc.category, sc.name`,
    [clientId]
  );
}

export async function getContractedCategories(clientId: string): Promise<Set<string>> {
  const services = await getContractedServices(clientId);
  return new Set(services.map((s) => s.category));
}

export async function getPortalClient(clientId: string): Promise<Pick<
  Client,
  "id" | "name" | "logo_url" | "status"
> | null> {
  return queryOne(
    "select id, name, logo_url, status from clients where id = $1",
    [clientId]
  );
}

export interface PortalKpis {
  spend: number;
  results: number;
  cost_per_result: number | null;
  conversations: number;
  reach: number;
}

export async function getPortalKpis(clientId: string, fromDate: string, toDate: string): Promise<PortalKpis> {
  const row = await queryOne<{
    spend: number;
    results: string;
    conversations: string;
    reach: string;
  }>(
    `select
       coalesce(sum(spend), 0) as spend,
       coalesce(sum(leads) + sum(purchases) + sum(messaging_conversations), 0)::text as results,
       coalesce(sum(messaging_conversations), 0)::text as conversations,
       coalesce(sum(reach), 0)::text as reach
     from meta_insights_daily
     where client_id = $1 and date >= $2 and date <= $3`,
    [clientId, fromDate, toDate]
  );
  const results = Number(row?.results ?? 0);
  const spend = row?.spend ?? 0;
  return {
    spend,
    results,
    cost_per_result: results > 0 ? spend / results : null,
    conversations: Number(row?.conversations ?? 0),
    reach: Number(row?.reach ?? 0),
  };
}

export async function getPendingApprovalsCount(clientId: string): Promise<number> {
  const rows = await query(
    "select 1 from content_items where client_id = $1 and status = 'aprobacion_cliente'",
    [clientId]
  );
  return rows.length;
}

export async function getUpcomingMilestones(
  clientId: string,
  limit = 5
): Promise<(ProjectMilestone & { project_name: string })[]> {
  return query(
    `select pm.id, pm.project_id, pm.title, pm.due_date, pm.done, pm.done_at, pm.created_at,
            p.name as project_name
     from project_milestones pm
     join projects p on p.id = pm.project_id
     where p.client_id = $1 and pm.done = false and pm.due_date is not null
     order by pm.due_date
     limit $2`,
    [clientId, limit]
  );
}

export async function getPendingPaymentsTotal(clientId: string): Promise<number> {
  const row = await queryOne<{ total: number }>(
    "select coalesce(sum(amount), 0) as total from payments_in where client_id = $1 and date_received is null",
    [clientId]
  );
  return row?.total ?? 0;
}

export async function getLatestReport(clientId: string): Promise<ClientReport | null> {
  return queryOne<ClientReport>(
    "select * from client_reports where client_id = $1 order by coalesce(period_month, created_at) desc limit 1",
    [clientId]
  );
}

export async function getCurrentMarketingPlan(clientId: string): Promise<MarketingPlan | null> {
  return queryOne<MarketingPlan>(
    `select * from marketing_plans where client_id = $1
     order by status = 'active' desc, period_start desc limit 1`,
    [clientId]
  );
}

export async function getContentItems(clientId: string): Promise<ContentItem[]> {
  return query<ContentItem>(
    "select * from content_items where client_id = $1 order by scheduled_at nulls last, created_at desc",
    [clientId]
  );
}

export async function getCampaigns(clientId: string): Promise<Campaign[]> {
  return query<Campaign>(
    "select * from campaigns where client_id = $1 order by start_date desc nulls last",
    [clientId]
  );
}

export async function getBrandKit(clientId: string): Promise<BrandKit | null> {
  return queryOne<BrandKit>("select * from brand_kits where client_id = $1", [clientId]);
}

export async function getOpenAlerts(clientId: string): Promise<Alert[]> {
  return query<Alert>(
    "select * from alerts where client_id = $1 and resolved = false order by created_at desc",
    [clientId]
  );
}

export async function getProjects(clientId: string): Promise<Project[]> {
  return query<Project>(
    "select * from projects where client_id = $1 order by status = 'done' or status = 'cancelled', due_date nulls last",
    [clientId]
  );
}

export async function getProjectMilestones(projectIds: string[]): Promise<ProjectMilestone[]> {
  if (projectIds.length === 0) return [];
  return query<ProjectMilestone>(
    "select * from project_milestones where project_id = any($1) order by done, due_date nulls last",
    [projectIds]
  );
}

export async function getRecurringAgreements(clientId: string): Promise<
  Pick<RecurringAgreement, "id" | "amount" | "billing_day" | "concept" | "active">[]
> {
  return query(
    "select id, amount, billing_day, concept, active from recurring_agreements where client_id = $1 order by active desc, billing_day",
    [clientId]
  );
}

export async function getPaymentHistory(
  clientId: string,
  limit = 30
): Promise<Pick<PaymentIn, "id" | "amount" | "concept" | "date_received" | "period_month">[]> {
  return query(
    `select id, amount, concept, date_received, period_month from payments_in
     where client_id = $1 order by coalesce(date_received, created_at) desc limit $2`,
    [clientId, limit]
  );
}

export async function getClientReports(clientId: string): Promise<ClientReport[]> {
  return query<ClientReport>(
    "select * from client_reports where client_id = $1 order by coalesce(period_month, created_at) desc",
    [clientId]
  );
}

export async function getClientFiles(clientId: string): Promise<ClientFile[]> {
  return query<ClientFile>(
    "select * from client_files where client_id = $1 order by created_at desc",
    [clientId]
  );
}

export interface PortalTeamMember {
  profile_id: string;
  full_name: string;
  role_on_account: string;
}

export async function getPortalTeam(clientId: string): Promise<PortalTeamMember[]> {
  return query<PortalTeamMember>(
    `select p.id as profile_id, p.full_name, ct.role_on_account
     from client_team ct
     join profiles p on p.id = ct.profile_id
     where ct.client_id = $1
     order by p.full_name`,
    [clientId]
  );
}

export interface PortalCompanyUser {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  client_role: string;
  active: boolean;
}

export async function getCompanyUsers(clientId: string): Promise<PortalCompanyUser[]> {
  return query<PortalCompanyUser>(
    `select cu.id, cu.profile_id, p.full_name, p.email, cu.client_role::text as client_role, cu.active
     from client_users cu
     join profiles p on p.id = cu.profile_id
     where cu.client_id = $1
     order by cu.client_role = 'owner' desc, p.full_name`,
    [clientId]
  );
}

export interface PendingInvite {
  id: string;
  email: string;
  expires_at: string;
}

export async function getPendingInvites(clientId: string): Promise<PendingInvite[]> {
  return query<PendingInvite>(
    `select id, email, expires_at::text from client_invites
     where client_id = $1 and accepted_at is null and expires_at > now()
     order by created_at desc`,
    [clientId]
  );
}
