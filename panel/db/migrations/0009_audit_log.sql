-- Registro de auditoría para mutaciones sensibles (pagos, usuarios, y lo que
-- se sume en fases futuras: conexiones de Meta, planes de marketing, etc.).

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id);

create index if not exists audit_log_actor_created_idx
  on public.audit_log (actor_id, created_at);
