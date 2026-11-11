-- Caja de herramientas de ideas: banco de ideas por cliente, competidores
-- seguidos, fechas comerciales propias y chat de estrategia.

create table if not exists public.idea_bank (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  body text,
  format text,
  pillar text,
  -- de donde salio: ideas, ganchos, guion, reciclador, hashtags, fechas, ads, chat, radar
  source text not null,
  -- referencia opcional (ej. video del Radar que la inspiro)
  reference_url text,
  content_item_id uuid references public.content_items(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idea_bank_client_idx on public.idea_bank (client_id, created_at desc);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  -- @usuario de una cuenta Business/Creator de Instagram (para Business Discovery)
  ig_username text,
  -- id numerico de la pagina de Facebook, para filtrar la Biblioteca de Anuncios
  fb_page_id text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists competitors_client_idx on public.competitors (client_id);

-- Fechas comerciales extra (las nacionales se calculan en codigo, ver
-- lib/ideas/commercialDates.ts). client_id null = aplica a todos.
create table if not exists public.commercial_dates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  name text not null,
  date date not null,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists commercial_dates_date_idx on public.commercial_dates (date);

-- Avisos de fechas comerciales ya enviados (para no repetir).
create table if not exists public.commercial_date_notices (
  key text primary key,
  sent_at timestamptz not null default now()
);

create table if not exists public.strategy_chats (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  -- [{ "role": "user"|"assistant", "content": "..." }]
  messages jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (profile_id, client_id)
);
