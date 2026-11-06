export type UserRole = "admin" | "programmer" | "marketing" | "marketing_admin";
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
