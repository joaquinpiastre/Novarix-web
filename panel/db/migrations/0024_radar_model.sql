-- Modelo de IA del Radar (relevancia, analisis y patrones) configurable desde
-- /admin/consumo. Por defecto el economico (Claude Haiku 5.5): una busqueda
-- completa pasa de ~USD 1 a centavos. El plan de busqueda sigue con el modelo
-- principal (ANTHROPIC_MODEL).
alter table public.trend_settings
  add column if not exists radar_model text not null default 'claude-haiku-5-5';

-- Analizar 5 videos por busqueda (el resto, a pedido con el boton "Analizar").
alter table public.trend_settings alter column analyze_top_n set default 5;
update public.trend_settings set analyze_top_n = 5 where analyze_top_n = 10;
