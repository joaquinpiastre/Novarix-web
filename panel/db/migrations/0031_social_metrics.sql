-- Metricas organicas de Facebook (pagina) e Instagram por dia.
-- Verificado contra la Graph API v26.0 el 2026-11-15:
-- - Pagina: page_total_media_view_unique (alcance), page_media_view
--   (visualizaciones), page_post_engagements, page_daily_follows_unique,
--   page_views_total. page_fan_count / page_impressions_unique ya no existen.
-- - Instagram: reach y follower_count (nuevos seguidores del dia, NO el total)
--   como serie diaria; views, total_interactions, accounts_engaged y
--   profile_links_taps como total por dia.
-- Los seguidores totales se toman del campo followers_count (foto del dia).

alter table public.social_insights_daily
  add column if not exists views bigint,
  add column if not exists accounts_engaged bigint,
  add column if not exists profile_visits bigint,
  add column if not exists link_taps bigint,
  add column if not exists updated_at timestamptz not null default now();

-- Lo guardado hasta ahora estaba mal (en Instagram "followers" eran los nuevos
-- seguidores del dia y "reach" repetia ese numero; la pagina nunca sincronizo).
-- Se borra y la proxima sincronizacion vuelve a traer 30 dias.
delete from public.social_insights_daily;
