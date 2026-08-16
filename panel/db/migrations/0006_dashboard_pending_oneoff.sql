-- Agrega los pagos puntuales pendientes de cobro al panel estadístico.

drop function if exists public.dashboard_stats();

create or replace function public.dashboard_stats()
returns table (
  current_month_income numeric,
  previous_month_income numeric,
  avg_monthly_income_12mo numeric,
  current_month_expenses numeric,
  previous_month_expenses numeric,
  net_current_month numeric,
  pending_recurring_count int,
  pending_recurring_amount numeric,
  current_month_recurring_income numeric,
  current_month_oneoff_income numeric,
  pending_oneoff_count int,
  pending_oneoff_amount numeric
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
  ),
  income_current_recurring as (
    select coalesce(sum(amount), 0) v from public.payments_in
    where recurring_agreement_id is not null
      and date_received >= date_trunc('month', current_date)
      and date_received < date_trunc('month', current_date) + interval '1 month'
  ),
  income_current_oneoff as (
    select coalesce(sum(amount), 0) v from public.payments_in
    where recurring_agreement_id is null
      and date_received >= date_trunc('month', current_date)
      and date_received < date_trunc('month', current_date) + interval '1 month'
  ),
  pending_oneoff as (
    select count(*)::int c, coalesce(sum(amount), 0) amt
    from public.payments_in
    where recurring_agreement_id is null and date_received is null
  )
  select
    income_current.v, income_previous.v, income_avg.v,
    expenses_current.v, expenses_previous.v,
    income_current.v - expenses_current.v,
    pending.c, pending.amt,
    income_current_recurring.v, income_current_oneoff.v,
    pending_oneoff.c, pending_oneoff.amt
  from income_current, income_previous, income_avg, expenses_current, expenses_previous, pending,
       income_current_recurring, income_current_oneoff, pending_oneoff;
$$;
