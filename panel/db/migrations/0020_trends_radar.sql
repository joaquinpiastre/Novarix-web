-- Radar Viral: busqueda de videos virales en YouTube / Instagram / TikTok,
-- scoring propio, analisis con IA, tableros de referencias, busquedas
-- guardadas con alerta y registro de consumo de proveedores (incluida la IA).
--
-- Regla de oro: NO se guardan videos de terceros. Solo metadatos, la URL de
-- la miniatura y nuestro analisis. Los videos se muestran con embed o link.

-- ===== Configuracion (una sola fila) =====
create table if not exists public.trend_settings (
  id boolean primary key default true check (id),
  -- pesos del score final; se renormalizan si a un video le falta un componente
  weights jsonb not null default '{"outlier": 0.35, "velocity": 0.25, "engagement": 0.15, "relevance": 0.25}',
  cache_ttl_hours int not null default 24,
  analyze_top_n int not null default 10,
  -- busquedas del Radar por dia y por persona, segun rol
  daily_search_limits jsonb not null default '{"admin": 30, "marketing_admin": 20, "marketing": 10}',
  -- generaciones de IA (caja de ideas, diagnostico, chat) por dia y por persona
  daily_ai_limits jsonb not null default '{"admin": 200, "marketing_admin": 120, "marketing": 60}',
  monthly_budget_usd numeric(10,2) not null default 100,
  budget_warned_month text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.trend_settings (id) values (true) on conflict do nothing;

-- ===== Videos (deduplicados por plataforma + id externo) =====
create table if not exists public.trend_videos (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok')),
  external_id text not null,
  url text not null,
  source_provider text not null,
  author_handle text,
  author_name text,
  author_followers bigint,
  -- promedio de vistas de la cuenta, cuando el proveedor permite calcularlo
  author_avg_views bigint,
  published_at timestamptz,
  duration_seconds int,
  caption text,
  hashtags text[] not null default '{}',
  audio text,
  thumbnail_url text,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  language text,
  country text,
  made_for_kids boolean,
  -- [{ "at": iso, "views": n, "likes": n, ... }] cada vez que se vuelve a ver
  metrics_history jsonb not null default '[]',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (platform, external_id)
);
create index if not exists trend_videos_last_seen_idx on public.trend_videos (platform, last_seen_at);

-- ===== Busquedas =====
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  name text not null,
  prompt text not null,
  filters jsonb not null default '{}',
  plan jsonb not null,
  every_days int not null default 7 check (every_days between 1 and 90),
  min_score numeric(5,2) not null default 60,
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_due_idx on public.saved_searches (active, last_run_at);

create table if not exists public.trend_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  saved_search_id uuid references public.saved_searches(id) on delete set null,
  kind text not null default 'search' check (kind in ('search', 'manual')),
  prompt text not null,
  filters jsonb not null default '{}',
  plan jsonb,
  status text not null default 'planning'
    check (status in ('planning', 'ready', 'queued', 'searching', 'analyzing', 'done', 'error')),
  progress int not null default 0,
  progress_message text,
  error text,
  cache_key text,
  cached_from uuid references public.trend_searches(id) on delete set null,
  -- resumen IA de lo que tienen en comun los mejores resultados
  patterns jsonb,
  provider_notes jsonb not null default '[]',
  cost_usd numeric(10,4) not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists trend_searches_profile_idx on public.trend_searches (profile_id, created_at desc);
create index if not exists trend_searches_client_idx on public.trend_searches (client_id, created_at desc);
create index if not exists trend_searches_cache_idx on public.trend_searches (cache_key, finished_at desc);

create table if not exists public.trend_search_results (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.trend_searches(id) on delete cascade,
  video_id uuid not null references public.trend_videos(id) on delete cascade,
  position int not null,
  relevance numeric(5,2),
  relevance_reason text,
  outlier_ratio numeric(14,4),
  outlier_score numeric(5,2),
  velocity numeric(16,2),
  velocity_score numeric(5,2),
  engagement_rate numeric(8,5),
  engagement_score numeric(5,2),
  final_score numeric(5,2),
  discarded boolean not null default false,
  unique (search_id, video_id)
);
create index if not exists trend_search_results_video_idx on public.trend_search_results (video_id);

-- ===== Analisis IA por video (y por cliente: la adaptacion depende del cliente) =====
create table if not exists public.trend_analyses (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.trend_videos(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  hook_type text,
  analysis jsonb not null,
  model text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists trend_analyses_video_client_uidx
  on public.trend_analyses (video_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ===== Tableros de referencias (swipe files) =====
create table if not exists public.swipe_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  client_id uuid references public.clients(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists swipe_boards_client_idx on public.swipe_boards (client_id);

create table if not exists public.swipe_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.swipe_boards(id) on delete cascade,
  video_id uuid not null references public.trend_videos(id) on delete cascade,
  notes text,
  tags text[] not null default '{}',
  added_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (board_id, video_id)
);

-- ===== Consumo de proveedores (YouTube, Meta, Apify, Claude) =====
create table if not exists public.provider_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  operation text not null,
  units numeric(12,2) not null default 1,
  cost_usd numeric(12,6) not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  model text,
  profile_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  search_id uuid references public.trend_searches(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists provider_usage_created_idx on public.provider_usage (created_at);
create index if not exists provider_usage_provider_idx on public.provider_usage (provider, operation, created_at);
create index if not exists provider_usage_profile_idx on public.provider_usage (profile_id, created_at);

-- ===== Hashtags de Instagram ya consultados (limite de Meta: 30 unicos cada 7 dias) =====
create table if not exists public.ig_hashtag_queries (
  hashtag text primary key,
  hashtag_id text,
  -- inicio de la ventana de 7 dias en la que este hashtag cuenta como "unico"
  window_started_at timestamptz not null default now(),
  last_queried_at timestamptz not null default now()
);
