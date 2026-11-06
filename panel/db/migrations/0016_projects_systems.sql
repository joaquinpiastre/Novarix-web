-- Fase 5: sistemas y proyectos. Proyectos con hitos, tickets de soporte
-- (pueden venir del cliente via /portal/support o de adentro), activos
-- tecnicos (vencimientos de dominio/hosting/SSL -- nunca credenciales
-- reales, solo metadata de fechas) y metadata de bots de GoHighLevel
-- (sin integracion viva con la API de GHL, solo registro manual).

create type public.project_status as enum ('planning', 'in_progress', 'paused', 'done', 'cancelled');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.tech_asset_type as enum ('domain', 'hosting', 'ssl', 'other');

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  status public.project_status not null default 'planning',
  start_date date,
  due_date date,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_client_idx on public.projects (client_id);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists project_milestones_project_idx on public.project_milestones (project_id);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'medium',
  -- quien lo creo: puede ser un perfil interno o un usuario de portal
  -- (role = 'client') reportando un problema desde /portal/support.
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_tickets_client_idx on public.support_tickets (client_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

create table if not exists public.tech_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  asset_type public.tech_asset_type not null,
  -- nombre del dominio, proveedor de hosting, etc. -- nunca una credencial.
  label text not null,
  provider text,
  expires_at date,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists tech_assets_client_idx on public.tech_assets (client_id);
create index if not exists tech_assets_expires_idx on public.tech_assets (expires_at);

create table if not exists public.ghl_bots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  ghl_location_id text,
  active boolean not null default true,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists ghl_bots_client_idx on public.ghl_bots (client_id);
