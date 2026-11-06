export type UserRole = "admin" | "programmer" | "marketing" | "marketing_admin" | "client";
export type TaskStatus = "pending" | "in_progress" | "done";
export type PaymentOutType = "salary" | "bonus" | "other";
export type ClientStatus = "prospecto" | "activo" | "pausado" | "baja";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  must_change_password: boolean;
  totp_enabled: boolean;
  /**
   * Solo para role === "client", modelo viejo (un usuario por cliente).
   * El codigo nuevo usa client_users (ClientUser) en vez de esta columna --
   * queda para compatibilidad de lectura, no se escribe mas.
   */
  client_id: string | null;
  email_notifications: boolean;
}

export type ClientPortalRole = "owner" | "member";

export interface ClientUser {
  id: string;
  profile_id: string;
  client_id: string;
  client_role: ClientPortalRole;
  active: boolean;
  created_at: string;
}

export interface ClientInvite {
  id: string;
  client_id: string;
  email: string;
  client_role: ClientPortalRole;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  legal_name: string | null;
  tax_id: string | null;
  industry: string | null;
  city: string | null;
  logo_url: string | null;
  website: string | null;
  social_links: Record<string, string> | null;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  status: ClientStatus;
  account_owner_id: string | null;
  /** Estimacion mensual cargada a mano por un admin -- no hay tracking real de gastos todavia. */
  monthly_direct_costs: number | null;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  active: boolean;
  created_at: string;
}

export interface ClientService {
  id: string;
  client_id: string;
  service_id: string;
  started_at: string;
  ended_at: string | null;
  fee: number | null;
  status: string;
  recurring_agreement_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ClientTeamMember {
  id: string;
  client_id: string;
  profile_id: string;
  role_on_account: string;
  created_at: string;
  /** Estimacion mensual cargada a mano por un admin -- no hay time-tracking real todavia. */
  monthly_cost_allocation: number | null;
}

export type MarketingPlanStatus = "draft" | "approved" | "active" | "closed";
export type ContentStatus =
  | "idea"
  | "copy"
  | "diseno"
  | "revision_interna"
  | "aprobacion_cliente"
  | "programado"
  | "publicado";
export type CampaignStatus = "planned" | "active" | "paused" | "ended";

export interface Deliverable {
  format: string;
  committed: number;
}

export interface MarketingPlan {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  objectives: string | null;
  target_audience: string | null;
  value_proposition: string | null;
  budget_ads: number | null;
  channels: string[];
  deliverables: Deliverable[];
  status: MarketingPlanStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  marketing_plan_id: string | null;
  name: string;
  objective: string | null;
  channel: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  status: CampaignStatus;
  meta_campaign_id: string | null;
  created_by: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  client_id: string;
  marketing_plan_id: string | null;
  channel: string;
  format: string;
  title: string;
  copy: string | null;
  attachment_url: string | null;
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClientChecklistRow {
  client_id: string;
  item_key: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface BrandKit {
  client_id: string;
  logo_url: string | null;
  color_palette: string | null;
  fonts: string | null;
  tone_of_voice: string | null;
  references_url: string | null;
  canva_url: string | null;
  updated_at: string;
}

export const MARKETING_PLAN_STATUS_LABELS: Record<MarketingPlanStatus, string> = {
  draft: "Borrador",
  approved: "Aprobado",
  active: "En ejecución",
  closed: "Cerrado",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  copy: "Copy",
  diseno: "Diseño",
  revision_interna: "Revisión interna",
  aprobacion_cliente: "Aprobación cliente",
  programado: "Programado",
  publicado: "Publicado",
};

export const CONTENT_STATUS_ORDER: ContentStatus[] = [
  "idea",
  "copy",
  "diseno",
  "revision_interna",
  "aprobacion_cliente",
  "programado",
  "publicado",
];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  planned: "Planeada",
  active: "Activa",
  paused: "Pausada",
  ended: "Finalizada",
};

export type MetaConnectionStatus = "active" | "expired" | "error";
export type MetaAssetType = "ad_account" | "page" | "instagram";
export type AlertSeverity = "info" | "warning" | "critical";

export interface MetaConnection {
  id: string;
  client_id: string;
  access_token: string;
  token_expires_at: string | null;
  status: MetaConnectionStatus;
  last_synced_at: string | null;
  last_error: string | null;
  created_by: string;
  created_at: string;
}

export interface MetaAsset {
  id: string;
  connection_id: string;
  client_id: string;
  asset_type: MetaAssetType;
  external_id: string;
  name: string | null;
  active: boolean;
  created_at: string;
}

export interface MetaInsightDaily {
  id: string;
  asset_id: string;
  client_id: string;
  date: string;
  level: string;
  campaign_id: string | null;
  campaign_name: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpc: number | null;
  cpm: number | null;
  ctr: number | null;
  messaging_conversations: number;
  cost_per_conversation: number | null;
  leads: number;
  purchases: number;
  purchase_value: number;
}

export interface SocialInsightDaily {
  id: string;
  asset_id: string;
  client_id: string;
  date: string;
  followers: number | null;
  follower_growth: number | null;
  reach: number | null;
  engagement: number | null;
}

export interface Alert {
  id: string;
  client_id: string;
  severity: AlertSeverity;
  kind: string;
  message: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export const META_ASSET_TYPE_LABELS: Record<MetaAssetType, string> = {
  ad_account: "Cuenta publicitaria",
  page: "Página de Facebook",
  instagram: "Cuenta de Instagram",
};

export interface Comment {
  id: string;
  entity_type: string;
  entity_id: string;
  client_id: string;
  author_id: string;
  body: string;
  visible_to_client: boolean;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  profile_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type ProjectStatus = "planning" | "in_progress" | "paused" | "done" | "cancelled";
export type TicketStatus =
  | "nuevo"
  | "en_revision"
  | "en_curso"
  | "esperando_cliente"
  | "resuelto"
  | "cerrado";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketType =
  | "reclamo"
  | "pedido_cambio"
  | "soporte_tecnico"
  | "consulta"
  | "pedido_contenido"
  | "facturacion";
export type TechAssetType = "domain" | "hosting" | "ssl" | "other";

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  done_at: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  number: string;
  client_id: string;
  title: string;
  description: string | null;
  ticket_type: TicketType;
  related_service_id: string | null;
  related_project_id: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  first_response_at: string | null;
  sla_due_at: string | null;
  csat_score: number | null;
  csat_comment: string | null;
  reopened_until: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  internal: boolean;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  uploaded_by: string;
  storage_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

export interface ClientReport {
  id: string;
  client_id: string;
  title: string;
  period_month: string | null;
  storage_key: string;
  filename: string;
  published_by: string;
  created_at: string;
}

export type ClientFileDirection = "from_client" | "from_novarix";

export interface ClientFile {
  id: string;
  client_id: string;
  uploaded_by: string;
  direction: ClientFileDirection;
  storage_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface TechAsset {
  id: string;
  client_id: string;
  asset_type: TechAssetType;
  label: string;
  provider: string | null;
  expires_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface GhlBot {
  id: string;
  client_id: string;
  name: string;
  ghl_location_id: string | null;
  active: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planificación",
  in_progress: "En curso",
  paused: "Pausado",
  done: "Terminado",
  cancelled: "Cancelado",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  nuevo: "Nuevo",
  en_revision: "En revisión",
  en_curso: "En curso",
  esperando_cliente: "Esperando al cliente",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const TICKET_STATUS_ORDER: TicketStatus[] = [
  "nuevo",
  "en_revision",
  "en_curso",
  "esperando_cliente",
  "resuelto",
  "cerrado",
];

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  "nuevo",
  "en_revision",
  "en_curso",
  "esperando_cliente",
];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  reclamo: "Reclamo",
  pedido_cambio: "Pedido / cambio",
  soporte_tecnico: "Soporte técnico / error",
  consulta: "Consulta",
  pedido_contenido: "Pedido de contenido",
  facturacion: "Facturación",
};

/** Horas hábiles para la primera respuesta, por prioridad (Fase de soporte, SLA). */
export const SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  urgent: 2,
  high: 8,
  medium: 24,
  low: 48,
};

export const TECH_ASSET_TYPE_LABELS: Record<TechAssetType, string> = {
  domain: "Dominio",
  hosting: "Hosting",
  ssl: "SSL",
  other: "Otro",
};

export interface RecurringAgreement {
  id: string;
  client_id: string;
  amount: number;
  billing_day: number;
  concept: string;
  active: boolean;
  created_at: string;
}

export interface PaymentIn {
  id: string;
  client_id: string;
  recurring_agreement_id: string | null;
  amount: number;
  concept: string;
  period_month: string | null;
  date_received: string | null;
  created_by: string;
  created_at: string;
}

export interface PaymentOut {
  id: string;
  recipient_id: string;
  amount: number;
  concept: string;
  payment_type: PaymentOutType;
  period_month: string;
  paid_on: string;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  ticket_id: string | null;
}

export interface Reminder {
  id: string;
  owner_id: string;
  title: string;
  remind_at: string;
  done: boolean;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  programmer: "Programador",
  marketing: "Marketing",
  marketing_admin: "Marketing (admin)",
  client: "Cliente (portal)",
};

export const CLIENT_PORTAL_ROLE_LABELS: Record<ClientPortalRole, string> = {
  owner: "Titular",
  member: "Miembro",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospecto: "Prospecto",
  activo: "Activo",
  pausado: "Pausado",
  baja: "Baja",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecho",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "done"];

export const PAYMENT_OUT_TYPE_LABELS: Record<PaymentOutType, string> = {
  salary: "Sueldo",
  bonus: "Bono",
  other: "Otro",
};
