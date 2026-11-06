-- Fase 2: planes de marketing, campañas, calendario de contenido, checklist
-- de diagnostico y kit de marca, todo por cliente.

create type public.marketing_plan_status as enum ('draft', 'approved', 'active', 'closed');
create type public.content_status as enum (
  'idea', 'copy', 'diseno', 'revision_interna', 'aprobacion_cliente', 'programado', 'publicado'
);
create type public.campaign_status as enum ('planned', 'active', 'paused', 'ended');

create table if not exists public.marketing_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  objectives text,
  target_audience text,
  value_proposition text,
  budget_ads numeric(12,2),
  channels text[] not null default '{}',
  -- [{ "format": "post", "committed": 12 }, ...] -- el "entregado" se calcula
  -- en runtime contando content_items publicados de ese formato en el periodo.
  deliverables jsonb not null default '[]',
  status public.marketing_plan_status not null default 'draft',
  created_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_plans_client_idx on public.marketing_plans (client_id);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  marketing_plan_id uuid references public.marketing_plans(id) on delete set null,
  name text not null,
  objective text,
  channel text not null,
  start_date date,
  end_date date,
  budget numeric(12,2),
  status public.campaign_status not null default 'planned',
  -- se completa en la Fase 3, para cruzar con metricas reales de Meta.
  meta_campaign_id text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists campaigns_client_idx on public.campaigns (client_id);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  marketing_plan_id uuid references public.marketing_plans(id) on delete set null,
  channel text not null,
  format text not null,
  title text not null,
  copy text,
  -- link a un archivo externo (Drive, Canva, etc.) -- todavia no hay subida
  -- de archivos propia (eso es almacenamiento real, se suma mas adelante).
  attachment_url text,
  status public.content_status not null default 'idea',
  scheduled_at timestamptz,
  published_at timestamptz,
  published_url text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_items_client_idx on public.content_items (client_id);
create index if not exists content_items_status_idx on public.content_items (status);
create index if not exists content_items_scheduled_idx on public.content_items (scheduled_at);

create table if not exists public.client_checklist (
  client_id uuid not null references public.clients(id) on delete cascade,
  item_key text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (client_id, item_key)
);

create table if not exists public.brand_kits (
  client_id uuid primary key references public.clients(id) on delete cascade,
  logo_url text,
  color_palette text,
  fonts text,
  tone_of_voice text,
  references_url text,
  canva_url text,
  updated_at timestamptz not null default now()
);
