-- Fase 3: metricas reales de Meta Ads/Instagram por cliente.

create type public.meta_connection_status as enum ('active', 'expired', 'error');
create type public.meta_asset_type as enum ('ad_account', 'page', 'instagram');
create type public.alert_severity as enum ('info', 'warning', 'critical');

create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  -- token cifrado con lib/crypto/encryption.ts, nunca en texto plano.
  access_token text not null,
  token_expires_at timestamptz,
  status public.meta_connection_status not null default 'active',
  last_synced_at timestamptz,
  last_error text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists meta_connections_client_idx on public.meta_connections (client_id);

create table if not exists public.meta_assets (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.meta_connections(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  asset_type public.meta_asset_type not null,
  -- ad_account: sin el prefijo "act_". page/instagram: el id numerico.
  external_id text not null,
  name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (connection_id, asset_type, external_id)
);
create index if not exists meta_assets_client_idx on public.meta_assets (client_id);

create table if not exists public.meta_insights_daily (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.meta_assets(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  level text not null default 'campaign',
  campaign_id text,
  campaign_name text,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  cpc numeric(12,4),
  cpm numeric(12,4),
  ctr numeric(8,4),
  messaging_conversations bigint not null default 0,
  cost_per_conversation numeric(12,4),
  leads bigint not null default 0,
  purchases bigint not null default 0,
  purchase_value numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (asset_id, date, level, campaign_id)
);
create index if not exists meta_insights_daily_client_date_idx on public.meta_insights_daily (client_id, date);

create table if not exists public.social_insights_daily (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.meta_assets(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  followers bigint,
  follower_growth int,
  reach bigint,
  engagement bigint,
  created_at timestamptz not null default now(),
  unique (asset_id, date)
);
create index if not exists social_insights_daily_client_date_idx on public.social_insights_daily (client_id, date);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.meta_assets(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  external_post_id text not null,
  permalink text,
  caption text,
  posted_at timestamptz,
  impressions bigint,
  reach bigint,
  engagement bigint,
  created_at timestamptz not null default now(),
  unique (asset_id, external_post_id)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  severity public.alert_severity not null default 'warning',
  kind text not null,
  message text not null,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists alerts_client_idx on public.alerts (client_id, resolved);
