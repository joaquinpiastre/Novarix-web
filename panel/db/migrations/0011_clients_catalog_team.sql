-- Fase 1: Cliente 360 -- expande `clients`, agrega catalogo de servicios,
-- que servicios tiene contratado cada cliente, y quien del equipo esta
-- asignado a cada uno.

create type public.client_status as enum ('prospecto', 'activo', 'pausado', 'baja');

alter table public.clients
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists industry text,
  add column if not exists city text,
  add column if not exists logo_url text,
  add column if not exists website text,
  add column if not exists social_links jsonb,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_phone text,
  add column if not exists primary_contact_email text,
  add column if not exists status public.client_status not null default 'activo',
  add column if not exists account_owner_id uuid references public.profiles(id) on delete set null;

create table if not exists public.services_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catalogo de referencia (no son datos de prueba, el panel los necesita
-- para funcionar) -- se puede correr mas de una vez sin duplicar.
insert into public.services_catalog (name, category) values
  ('Sitio web', 'Desarrollo'),
  ('E-commerce', 'Desarrollo'),
  ('App móvil', 'Desarrollo'),
  ('Sistema de gestión', 'Desarrollo'),
  ('Tracking de flota', 'Desarrollo'),
  ('Meta Ads', 'Marketing'),
  ('Google Ads', 'Marketing'),
  ('SEO', 'Marketing'),
  ('Contenido y redes', 'Marketing'),
  ('Bot IA WhatsApp/Instagram/Facebook', 'IA'),
  ('CRM', 'IA'),
  ('Mensajes masivos', 'IA'),
  ('Consultoría IT', 'Consultoría'),
  ('Mantenimiento y hosting', 'Consultoría')
on conflict (name) do nothing;

create table if not exists public.client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services_catalog(id) on delete restrict,
  started_at date not null default current_date,
  ended_at date,
  fee numeric(12,2),
  status text not null default 'active',
  recurring_agreement_id uuid references public.recurring_agreements(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists client_services_client_idx on public.client_services (client_id);

create table if not exists public.client_team (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_on_account text not null default 'colaborador',
  created_at timestamptz not null default now(),
  unique (client_id, profile_id)
);
create index if not exists client_team_client_idx on public.client_team (client_id);
create index if not exists client_team_profile_idx on public.client_team (profile_id);
