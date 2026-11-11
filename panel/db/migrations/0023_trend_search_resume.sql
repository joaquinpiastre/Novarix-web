-- Busquedas del Radar que se cortan a la mitad (ej. un deploy reinicia el
-- server mientras analizaba): se detectan por falta de progreso y se reanudan.
alter table public.trend_searches
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists claimed_at timestamptz,
  add column if not exists attempts int not null default 0;

-- Las que ya existian toman su ultima fecha conocida, asi una busqueda que
-- quedo trabada antes de esta migracion se detecta y se reanuda al arrancar.
update public.trend_searches set updated_at = coalesce(finished_at, created_at);

create index if not exists trend_searches_running_idx
  on public.trend_searches (status, updated_at)
  where status in ('queued', 'searching', 'analyzing');
