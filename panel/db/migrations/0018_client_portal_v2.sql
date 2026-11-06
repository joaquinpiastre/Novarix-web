-- Portal de clientes v2: usuarios multiples por empresa (owner/member) con
-- invitacion por email, sistema de tickets rico (numero legible, tipo, SLA,
-- hilo de mensajes, adjuntos, CSAT), reportes y archivos compartidos.
--
-- Decision clave: se EXTIENDE support_tickets (creada en la Fase 5) en vez
-- de crear una tabla "tickets" paralela -- es el mismo concepto. El feature
-- de Fase 5 se desplego el mismo dia que esta migracion, así que no hay
-- practicamente filas reales que migrar, pero igual se backfillea por las
-- dudas en vez de asumir que la tabla esta vacia.

-- ===== Usuarios de empresa cliente (owner/member) =====

create type public.client_role as enum ('owner', 'member');

create table if not exists public.client_users (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  client_role public.client_role not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists client_users_client_idx on public.client_users (client_id);

-- Migra a los usuarios de portal que ya existian (profiles.role='client',
-- modelo viejo de un solo usuario por cliente) como 'owner' de su empresa.
-- profiles.client_id queda en la tabla por compatibilidad de lectura, pero
-- el codigo nuevo (requireClient()) ya no confia en esa columna.
insert into public.client_users (profile_id, client_id, client_role, active)
select id, client_id, 'owner', true from public.profiles
where role = 'client' and client_id is not null
on conflict (profile_id) do nothing;

-- Invitaciones de un solo uso, 72hs, para altas nuevas (reemplaza el alta
-- con contraseña temporal mostrada en pantalla).
create table if not exists public.client_invites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  email text not null,
  client_role public.client_role not null default 'member',
  invited_by uuid not null references public.profiles(id),
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists client_invites_client_idx on public.client_invites (client_id);
create index if not exists client_invites_email_idx on public.client_invites (lower(email));

alter table public.profiles add column if not exists email_notifications boolean not null default true;

-- ===== Tickets v2 (extiende support_tickets de la Fase 5) =====

create type public.ticket_type as enum (
  'reclamo', 'pedido_cambio', 'soporte_tecnico', 'consulta', 'pedido_contenido', 'facturacion'
);

create type public.ticket_status_v2 as enum (
  'nuevo', 'en_revision', 'en_curso', 'esperando_cliente', 'resuelto', 'cerrado'
);

alter table public.support_tickets add column if not exists number text;
alter table public.support_tickets add column if not exists ticket_type public.ticket_type not null default 'consulta';
alter table public.support_tickets add column if not exists related_service_id uuid references public.client_services(id) on delete set null;
alter table public.support_tickets add column if not exists related_project_id uuid references public.projects(id) on delete set null;
alter table public.support_tickets add column if not exists status_v2 public.ticket_status_v2;
alter table public.support_tickets add column if not exists first_response_at timestamptz;
alter table public.support_tickets add column if not exists sla_due_at timestamptz;
alter table public.support_tickets add column if not exists csat_score smallint;
alter table public.support_tickets add column if not exists csat_comment text;
alter table public.support_tickets add column if not exists reopened_until timestamptz;

update public.support_tickets set status_v2 = (case status::text
  when 'open' then 'nuevo'
  when 'in_progress' then 'en_curso'
  when 'resolved' then 'resuelto'
  when 'closed' then 'cerrado'
  else 'nuevo'
end)::public.ticket_status_v2
where status_v2 is null;

alter table public.support_tickets alter column status_v2 set default 'nuevo';
alter table public.support_tickets alter column status_v2 set not null;
alter table public.support_tickets drop column status;
alter table public.support_tickets rename column status_v2 to status;
drop type if exists public.ticket_status;

create index if not exists support_tickets_status_idx on public.support_tickets (status);

create sequence if not exists public.support_tickets_number_seq;
update public.support_tickets set number = 'NVX-' || lpad(nextval('public.support_tickets_number_seq')::text, 4, '0')
where number is null;
alter table public.support_tickets alter column number set not null;
alter table public.support_tickets add constraint support_tickets_number_key unique (number);

create or replace function public.set_ticket_number() returns trigger as $$
begin
  if new.number is null then
    new.number := 'NVX-' || lpad(nextval('public.support_tickets_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists support_tickets_set_number on public.support_tickets;
create trigger support_tickets_set_number
  before insert on public.support_tickets
  for each row execute function public.set_ticket_number();

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages (ticket_id);

create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  message_id uuid references public.ticket_messages(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_key text not null,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);

create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);
create index if not exists ticket_events_ticket_idx on public.ticket_events (ticket_id);

-- ===== Reportes mensuales (subidos por un admin, no generados) =====

create table if not exists public.client_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  period_month date,
  storage_key text not null,
  filename text not null,
  published_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists client_reports_client_idx on public.client_reports (client_id);

-- ===== Archivos compartidos (ademas del kit de marca, que ya tiene su
-- propia tabla desde la Fase 2) =====

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  direction text not null check (direction in ('from_client', 'from_novarix')),
  storage_key text not null,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists client_files_client_idx on public.client_files (client_id);

-- Permite "convertir un ticket en tarea" del tablero existente, quedando
-- vinculado en ambos sentidos.
alter table public.tasks add column if not exists ticket_id uuid references public.support_tickets(id) on delete set null;
