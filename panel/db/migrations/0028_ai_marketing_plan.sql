-- Plan de marketing generado por Claude: el documento completo (diagnostico,
-- objetivos SMART, publico, estrategia por canal, pauta, pilares, calendario,
-- KPIs, riesgos) queda en ai_plan. Los campos de siempre (objetivos,
-- publico, propuesta, canales, entregables) se completan desde ahi.
alter table public.marketing_plans
  add column if not exists ai_plan jsonb,
  add column if not exists generated_by_ai boolean not null default false,
  add column if not exists calendar_created_at timestamptz;
