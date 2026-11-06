-- Fase 6: finanzas y rentabilidad. No se crean tablas nuevas -- la
-- rentabilidad por cliente se calcula cruzando datos que ya existen
-- (recurring_agreements, payments_in, meta_insights_daily, audit_log para
-- detectar bajas) mas dos columnas nuevas para costos, que son estimaciones
-- que carga un admin a mano (no hay time-tracking real todavia).

alter table public.clients
  add column if not exists monthly_direct_costs numeric(12,2);

alter table public.client_team
  add column if not exists monthly_cost_allocation numeric(12,2);
