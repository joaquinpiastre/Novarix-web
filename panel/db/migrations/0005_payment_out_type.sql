-- Permite distinguir sueldos de bonos extra (u otros conceptos) en los
-- pagos a colaboradores.

create type public.payment_out_type as enum ('salary', 'bonus', 'other');

alter table public.payments_out
  add column payment_type public.payment_out_type not null default 'salary';
