-- Reportes de métricas generados con IA (pauta + Facebook/Instagram orgánico).
-- El equipo los genera desde la ficha del cliente y puede compartirlos en el
-- portal del cliente (sección Reportes).

create table if not exists public.metrics_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period_key text not null,
  period_from date not null,
  period_to date not null,
  title text not null,
  report jsonb not null,
  -- los números que se le pasaron a la IA, para poder auditar el reporte
  inputs jsonb not null default '{}',
  team_prompt text,
  model text not null,
  shared_with_client boolean not null default false,
  shared_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists metrics_reports_client_idx on public.metrics_reports (client_id, created_at desc);
