// Metricas organicas, probadas contra la Graph API v26.0 el 2026-11-15 (una
// pagina y un Instagram reales). Meta viene retirando metricas de paginas
// (page_impressions_unique, page_fan_count y otras ya devuelven "#100 The
// value must be a valid insights metric"), asi que la sync pide cada metrica
// por separado: si Meta retira una, se saltea y el resto sigue andando.
// Las de pagina exigen el token DE LA PAGINA y el permiso read_insights.

/** Columna de social_insights_daily donde se guarda cada metrica. */
export type SocialColumn =
  | "followers"
  | "follower_growth"
  | "reach"
  | "views"
  | "engagement"
  | "accounts_engaged"
  | "profile_visits"
  | "link_taps";

/** Pagina de Facebook, serie diaria (period=day). */
export const PAGE_DAILY_METRICS: Record<string, SocialColumn> = {
  page_total_media_view_unique: "reach",
  page_media_view: "views",
  page_post_engagements: "engagement",
  page_daily_follows_unique: "follower_growth",
  page_views_total: "profile_visits",
};

/** Instagram, serie diaria (time_series). follower_count = nuevos seguidores del dia, no el total. */
export const IG_SERIES_METRICS: Record<string, SocialColumn> = {
  reach: "reach",
  follower_count: "follower_growth",
};

/** Instagram, solo como total (metric_type=total_value): se piden de a un dia. */
export const IG_TOTAL_METRICS: Record<string, SocialColumn> = {
  views: "views",
  total_interactions: "engagement",
  accounts_engaged: "accounts_engaged",
  profile_links_taps: "link_taps",
};

// Metricas por pieza (IG Media Insights), verificadas en la doc el 2026-11-11.
// Para REELS: views, reach, saved, shares, likes, comments, total_interactions,
// ig_reels_avg_watch_time e ig_reels_video_view_total_time (Meta marca views,
// total_interactions e ig_reels_video_view_total_time como "en desarrollo").
// Para el resto de los posts se pide un set reducido.
export const IG_MEDIA_FIELDS =
  "id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url,like_count,comments_count";
export const IG_REELS_INSIGHTS = [
  "views",
  "reach",
  "saved",
  "shares",
  "total_interactions",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
];
export const IG_FEED_INSIGHTS = ["views", "reach", "saved", "shares", "total_interactions"];

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
