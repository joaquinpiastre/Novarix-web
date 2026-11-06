-- Fase 4: portal del cliente, comentarios y notificaciones.

-- Un usuario de portal (role = 'client') pertenece a exactamente un
-- cliente. Para el equipo interno queda null.
alter table public.profiles
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  -- 'content_item' por ahora; mas tipos de entidad se suman despues
  -- reusando esta misma tabla.
  entity_type text not null,
  entity_id uuid not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  -- separa el canal interno (solo equipo) del canal visible para el cliente
  -- en su portal.
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists comments_entity_idx on public.comments (entity_type, entity_id);
create index if not exists comments_client_idx on public.comments (client_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_profile_idx on public.notifications (profile_id, read);
