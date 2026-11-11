-- Diagnostico de nuestros videos: social_posts pasa a guardar los reels y
-- posts de Instagram con sus metricas por pieza (antes la tabla existia pero
-- la sync no la llenaba), y se guardan los reportes IA de diagnostico.

alter table public.social_posts
  add column if not exists media_type text,
  add column if not exists media_product_type text,
  add column if not exists thumbnail_url text,
  add column if not exists views bigint,
  add column if not exists likes bigint,
  add column if not exists comments bigint,
  add column if not exists saved bigint,
  add column if not exists shares bigint,
  add column if not exists total_interactions bigint,
  -- milisegundos, tal cual los devuelve Meta
  add column if not exists avg_watch_time_ms bigint,
  add column if not exists total_watch_time_ms bigint,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists social_posts_client_posted_idx on public.social_posts (client_id, posted_at desc);

create table if not exists public.video_diagnostics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  report jsonb not null,
  -- numeros que se le pasaron a la IA, para poder auditar el reporte
  inputs jsonb not null default '{}',
  model text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists video_diagnostics_client_idx on public.video_diagnostics (client_id, created_at desc);
