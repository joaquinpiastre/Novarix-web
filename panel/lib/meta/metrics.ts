// ===== OJO, LEER ANTES DE ACTIVAR LA SYNC POR PRIMERA VEZ =====
//
// Meta viene deprecando metricas de Page/Instagram Insights (organicas) a
// un ritmo bastante alto (page_impressions y page_fans se deprecaron en
// 2025-2026, reemplazadas por metricas de "Views"/"Followers"), y las
// fuentes no coinciden en los nombres exactos del campo nuevo. Esta lista
// es la mejor aproximacion al momento de escribir esto, pero NO esta
// verificada contra una cuenta real -- la sync de Ads (meta_insights_daily,
// abajo) es mucho mas estable y confiable que esta.
//
// Antes de conectar el primer cliente de verdad: pegar la URL de abajo en
// el navegador (reemplazando PAGE_ID y TOKEN) y confirmar que devuelve
// datos, no un error de "metric is deprecated":
// https://graph.facebook.com/v21.0/PAGE_ID/insights?metric=page_fan_count&access_token=TOKEN
// Si da error, revisar la lista vigente en:
// https://developers.facebook.com/docs/graph-api/reference/page/insights/

export const PAGE_INSIGHTS_METRICS = ["page_fan_count", "page_post_engagements"];
export const IG_INSIGHTS_METRICS = ["reach", "follower_count"];

// Estos campos de la Marketing API (anuncios/campañas) son mucho mas
// estables -- son el corazon del reporting de Ads y Meta los mantiene
// con mucho mas cuidado que las metricas organicas de arriba.
export const AD_INSIGHTS_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "cpc",
  "cpm",
  "ctr",
  "actions",
  "action_values",
  "campaign_id",
  "campaign_name",
].join(",");
