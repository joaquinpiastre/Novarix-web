-- Hardening de login: contraseña temporal que hay que cambiar en el primer
-- ingreso, y registro de intentos de login para rate limiting. Idempotente
-- (a partir de esta migración todas lo son).

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create table if not exists public.login_attempts (
  id bigserial primary key,
  identifier text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_identifier_created_idx
  on public.login_attempts (identifier, created_at);
