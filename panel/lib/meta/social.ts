import "server-only";
import { query } from "@/lib/db";
import type { MetaAssetType } from "@/lib/types/domain";

// Resumen de redes (organico) por cuenta conectada: lo usan la ficha del
// cliente y el portal. Todo se castea a float8 porque node-postgres devuelve
// bigint como string.

export interface SocialDailyPoint {
  date: string;
  reach: number | null;
  views: number | null;
  engagement: number | null;
}

export interface SocialAccountSummary {
  assetId: string;
  type: Extract<MetaAssetType, "page" | "instagram">;
  name: string;
  followers: number | null;
  followerGrowth: number | null;
  views: number | null;
  avgDailyReach: number | null;
  engagement: number | null;
  profileVisits: number | null;
  linkTaps: number | null;
  daysWithData: number;
  daily: SocialDailyPoint[];
}

export interface SocialTopPost {
  id: string;
  permalink: string | null;
  caption: string | null;
  postedAt: string | null;
  isReel: boolean;
  thumbnailUrl: string | null;
  views: number | null;
  reach: number | null;
  interactions: number | null;
}

export interface SocialOverviewData {
  accounts: SocialAccountSummary[];
  topPosts: SocialTopPost[];
}

export async function getSocialOverview(clientId: string, from: string, to: string): Promise<SocialOverviewData> {
  const [assets, totals, daily, followers, topPosts] = await Promise.all([
    query<{ id: string; asset_type: "page" | "instagram"; name: string | null; external_id: string }>(
      `select id, asset_type::text as asset_type, name, external_id from meta_assets
       where client_id = $1 and active = true and asset_type in ('page', 'instagram')
       order by asset_type = 'instagram' desc, name`,
      [clientId]
    ),
    query<{
      asset_id: string;
      growth: number | null;
      views: number | null;
      reach: number | null;
      engagement: number | null;
      visits: number | null;
      taps: number | null;
      days: number;
    }>(
      `select asset_id,
              sum(follower_growth)::float8 as growth,
              sum(views)::float8 as views,
              avg(reach)::float8 as reach,
              sum(engagement)::float8 as engagement,
              sum(profile_visits)::float8 as visits,
              sum(link_taps)::float8 as taps,
              count(*) filter (where reach is not null or views is not null or engagement is not null)::int as days
       from social_insights_daily
       where client_id = $1 and date >= $2 and date <= $3
       group by asset_id`,
      [clientId, from, to]
    ),
    query<{ asset_id: string; date: string; reach: number | null; views: number | null; engagement: number | null }>(
      `select asset_id, date::text as date, reach::float8 as reach, views::float8 as views, engagement::float8 as engagement
       from social_insights_daily
       where client_id = $1 and date >= $2 and date <= $3
         and (reach is not null or views is not null or engagement is not null)
       order by date`,
      [clientId, from, to]
    ),
    query<{ asset_id: string; followers: number }>(
      `select distinct on (asset_id) asset_id, followers::float8 as followers
       from social_insights_daily
       where client_id = $1 and followers is not null
       order by asset_id, date desc`,
      [clientId]
    ),
    query<{
      id: string;
      permalink: string | null;
      caption: string | null;
      posted_at: string | null;
      is_reel: boolean;
      thumbnail_url: string | null;
      views: number | null;
      reach: number | null;
      interactions: number | null;
    }>(
      `select id, permalink, caption, posted_at::text as posted_at,
              (media_product_type = 'REELS' or media_type = 'VIDEO') as is_reel, thumbnail_url,
              views::float8 as views, reach::float8 as reach,
              coalesce(total_interactions, engagement)::float8 as interactions
       from social_posts
       where client_id = $1 and posted_at::date >= $2 and posted_at::date <= $3
       order by coalesce(views, 0) desc, coalesce(total_interactions, engagement, 0) desc
       limit 6`,
      [clientId, from, to]
    ),
  ]);

  const totalsBy = new Map(totals.map((t) => [t.asset_id, t]));
  const followersBy = new Map(followers.map((f) => [f.asset_id, f.followers]));

  return {
    accounts: assets.map((a) => {
      const t = totalsBy.get(a.id);
      return {
        assetId: a.id,
        type: a.asset_type,
        name: a.name ?? a.external_id,
        followers: followersBy.get(a.id) ?? null,
        followerGrowth: t?.growth ?? null,
        views: t?.views ?? null,
        avgDailyReach: t?.reach != null ? Math.round(t.reach) : null,
        engagement: t?.engagement ?? null,
        profileVisits: t?.visits ?? null,
        linkTaps: t?.taps ?? null,
        daysWithData: t?.days ?? 0,
        daily: daily.filter((d) => d.asset_id === a.id).map(({ date, reach, views, engagement }) => ({ date, reach, views, engagement })),
      };
    }),
    topPosts: topPosts.map((p) => ({
      id: p.id,
      permalink: p.permalink,
      caption: p.caption,
      postedAt: p.posted_at,
      isReel: p.is_reel,
      thumbnailUrl: p.thumbnail_url,
      views: p.views,
      reach: p.reach,
      interactions: p.interactions,
    })),
  };
}
