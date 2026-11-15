-- Piezas del plan de marketing IA que ya se pasaron al calendario:
-- { "<indice de la pieza>": "<content_item_id>" }. Permite elegir pieza por
-- pieza (con la fecha que se quiera) sin duplicar.
alter table public.marketing_plans
  add column if not exists calendar_items jsonb not null default '{}'::jsonb;
