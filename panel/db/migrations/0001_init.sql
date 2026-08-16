-- Novarix panel — esquema inicial (Postgres propio, sin Supabase)

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'programmer', 'marketing');
create type public.task_status as enum ('pending', 'in_progress', 'done');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  role public.user_role not null default 'programmer',
  created_at timestamptz not null default now()
);

create table public.sessions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_expires_at_idx on public.sessions (expires_at);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.recurring_agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  amount numeric(12,2) not null,
  billing_day smallint not null check (billing_day between 1 and 28),
  concept text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payments_in (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  recurring_agreement_id uuid references public.recurring_agreements(id) on delete set null,
  amount numeric(12,2) not null,
  concept text not null,
  period_month date,
  date_received date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index payments_in_date_received_idx on public.payments_in (date_received);
create index payments_in_recurring_period_idx on public.payments_in (recurring_agreement_id, period_month);

create table public.payments_out (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null,
  concept text not null,
  period_month date not null,
  paid_on date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index payments_out_recipient_idx on public.payments_out (recipient_id);
create index payments_out_paid_on_idx on public.payments_out (paid_on);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  status public.task_status not null default 'pending',
  due_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assigned_to_idx on public.tasks (assigned_to);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index reminders_owner_remind_idx on public.reminders (owner_id, remind_at);

-- ===== dashboard aggregates =====
-- Sin RLS: estas funciones devuelven datos de todo el negocio sin filtrar.
-- Solo se llaman desde rutas admin-only (dashboard admin, /payments/in) —
-- la restricción de acceso vive en el código de la app (requireAdmin()),
-- no en la base.

create or replace function public.dashboard_stats()
returns table (
  current_month_income numeric,
  previous_month_income numeric,
  avg_monthly_income_12mo numeric,
  current_month_expenses numeric,
  previous_month_expenses numeric,
  net_current_month numeric,
  pending_recurring_count int,
  pending_recurring_amount numeric
)
language sql stable as $$
  with income_current as (
    select coalesce(sum(amount), 0) v from public.payments_in
    where date_received >= date_trunc('month', current_date)
      and date_received < date_trunc('month', current_date) + interval '1 month'
  ),
  income_previous as (
    select coalesce(sum(amount), 0) v from public.payments_in
    where date_received >= date_trunc('month', current_date) - interval '1 month'
      and date_received < date_trunc('month', current_date)
  ),
  income_avg as (
    select coalesce(avg(monthly_total), 0) v from (
      select date_trunc('month', date_received) m, sum(amount) monthly_total
      from public.payments_in
      where date_received >= current_date - interval '12 months'
      group by 1
    ) t
  ),
  expenses_current as (
    select coalesce(sum(amount), 0) v from public.payments_out
    where paid_on >= date_trunc('month', current_date)
      and paid_on < date_trunc('month', current_date) + interval '1 month'
  ),
  expenses_previous as (
    select coalesce(sum(amount), 0) v from public.payments_out
    where paid_on >= date_trunc('month', current_date) - interval '1 month'
      and paid_on < date_trunc('month', current_date)
  ),
  pending as (
    select count(*)::int c, coalesce(sum(ra.amount), 0) amt
    from public.recurring_agreements ra
    where ra.active and not exists (
      select 1 from public.payments_in pi
      where pi.recurring_agreement_id = ra.id
        and pi.period_month = date_trunc('month', current_date)::date
    )
  )
  select
    income_current.v, income_previous.v, income_avg.v,
    expenses_current.v, expenses_previous.v,
    income_current.v - expenses_current.v,
    pending.c, pending.amt
  from income_current, income_previous, income_avg, expenses_current, expenses_previous, pending;
$$;

create or replace function public.monthly_income_series(months_back int default 12)
returns table (month date, total numeric)
language sql stable as $$
  select gs.month::date, coalesce(sum(pi.amount), 0) as total
  from generate_series(
    date_trunc('month', current_date) - (months_back || ' months')::interval,
    date_trunc('month', current_date),
    interval '1 month'
  ) as gs(month)
  left join public.payments_in pi
    on date_trunc('month', pi.date_received) = gs.month
  group by gs.month
  order by gs.month;
$$;
