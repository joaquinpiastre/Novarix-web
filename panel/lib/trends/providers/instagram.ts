import "server-only";
import { query, queryOne } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encryption";
import { metaGet, MetaApiError } from "@/lib/meta/client";
import { recordProviderUsage, type UsageContext } from "@/lib/usage/record";
import { extractHashtags, type NormalizedVideo, type SearchPlan } from "../types";
import { ProviderError, type ProviderRunContext, type TrendProvider } from "./types";

// Instagram via Graph API de Meta (verificado en developers.facebook.com el 2026-11-11):
//
// Business Discovery (GET /{ig-user-id}?fields=business_discovery.username(x){...})
//   - Permisos: instagram_basic, instagram_manage_insights, pages_read_engagement.
//   - Solo cuentas Business/Creator; no devuelve cuentas con restriccion de edad.
//   - Devuelve followers_count y, por media, like_count, comments_count y
//     view_count (este ultimo SOLO por Business Discovery).
//
// Hashtag Search (ig_hashtag_search + /top_media)
//   - Requiere la funcion "Instagram Public Content Access": App Review +
//     verificacion del negocio. Por eso va apagado por defecto
//     (TRENDS_IG_HASHTAG_SEARCH=on para activarlo una vez aprobado).
//   - Limite: 30 hashtags unicos cada 7 dias (consultar el edge cuenta aunque
//     ya tengas el id). Se lleva la cuenta en ig_hashtag_queries.
//   - top_media NO devuelve vistas ni el usuario autor: esos videos no tienen
//     outlier ni velocidad, solo likes/comentarios.
//   - Uso permitido para marketing: solo con datos agregados/anonimos -> se usa
//     para detectar temas y formatos, no para perfilar personas.
//
// Se busca desde UNA cuenta de Instagram Business propia. Dos formas de
// configurarla (la primera que este gana):
//   1. TRENDS_IG_ACCESS_TOKEN: un token de Meta directo (ideal: de usuario del
//      sistema, no vence). La cuenta de Instagram se detecta sola (primera
//      pagina con IG vinculado), o se fija con TRENDS_IG_USER_ID.
//   2. TRENDS_IG_CONNECTION_ID: una conexion de Meta cargada en el panel.

const HASHTAG_WEEKLY_LIMIT = 28; // margen de 2 sobre el limite real de 30
const MAX_ACCOUNTS_PER_SEARCH = 6;
const MAX_HASHTAGS_PER_SEARCH = 3;

interface IgSearchIdentity {
  token: string;
  igUserId: string;
}

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.TRENDS_IG_ACCESS_TOKEN?.trim() || process.env.TRENDS_IG_CONNECTION_ID?.trim());
}

export function isHashtagSearchEnabled(): boolean {
  return process.env.TRENDS_IG_HASHTAG_SEARCH === "on";
}

let detectedIgUserId: string | null = null;

/** Primera cuenta de Instagram Business vinculada a una pagina a la que el token tiene acceso. */
async function detectIgUserId(token: string): Promise<string> {
  if (detectedIgUserId) return detectedIgUserId;
  const pages = await metaGet<{ data: { instagram_business_account?: { id: string } }[] }>("me/accounts", token, {
    fields: "instagram_business_account{id,username}",
    limit: "100",
  });
  const id = pages.data?.find((p) => p.instagram_business_account)?.instagram_business_account?.id;
  if (!id) {
    throw new ProviderError(
      "El token de TRENDS_IG_ACCESS_TOKEN no tiene ninguna página con Instagram profesional vinculado (o le falta el permiso pages_show_list)."
    );
  }
  detectedIgUserId = id;
  return id;
}

async function identity(): Promise<IgSearchIdentity> {
  const directToken = process.env.TRENDS_IG_ACCESS_TOKEN?.trim();
  if (directToken) {
    const igUserId = process.env.TRENDS_IG_USER_ID?.trim() || (await detectIgUserId(directToken));
    return { token: directToken, igUserId };
  }

  const connectionId = process.env.TRENDS_IG_CONNECTION_ID;
  if (!connectionId) throw new ProviderError("Falta configurar Instagram (TRENDS_IG_ACCESS_TOKEN o TRENDS_IG_CONNECTION_ID).");
  const conn = await queryOne<{ access_token: string; status: string }>(
    "select access_token, status from meta_connections where id = $1",
    [connectionId]
  );
  if (!conn) throw new ProviderError("La conexión de Meta configurada en TRENDS_IG_CONNECTION_ID no existe.");
  let igUserId = process.env.TRENDS_IG_USER_ID ?? null;
  if (!igUserId) {
    const asset = await queryOne<{ external_id: string }>(
      "select external_id from meta_assets where connection_id = $1 and asset_type = 'instagram' and active = true order by created_at limit 1",
      [connectionId]
    );
    igUserId = asset?.external_id ?? null;
  }
  if (!igUserId) throw new ProviderError("La conexión de Meta no tiene una cuenta de Instagram agregada como activo.");
  return { token: decrypt(conn.access_token), igUserId };
}

export function shortcodeFromPermalink(permalink: string | null | undefined): string | null {
  if (!permalink) return null;
  const m = /instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/.exec(permalink);
  return m?.[1] ?? null;
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  shortcode?: string;
  timestamp?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
  view_count?: number;
}

export interface BusinessDiscoveryResult {
  username: string;
  name: string | null;
  followers: number | null;
  mediaCount: number | null;
  avgViews: number | null;
  media: NormalizedVideo[];
}

const isVideo = (m: IgMedia) => m.media_product_type === "REELS" || m.media_type === "VIDEO";

/** Posts/reels recientes de una cuenta Business/Creator ajena, con sus metricas publicas. */
export async function businessDiscovery(handle: string, usage: UsageContext, limit = 40): Promise<BusinessDiscoveryResult> {
  const { token, igUserId } = await identity();
  const clean = handle.replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(clean)) throw new ProviderError(`Usuario de Instagram inválido: ${handle}`);
  const fields =
    `business_discovery.username(${clean}){username,name,followers_count,media_count,` +
    `media.limit(${limit}){id,caption,media_type,media_product_type,permalink,shortcode,timestamp,thumbnail_url,like_count,comments_count,view_count}}`;
  const res = await metaGet<{
    business_discovery?: {
      username: string;
      name?: string;
      followers_count?: number;
      media_count?: number;
      media?: { data: IgMedia[] };
    };
  }>(igUserId, token, { fields });
  await recordProviderUsage({ ...usage, provider: "meta", operation: "business_discovery" });

  const bd = res.business_discovery;
  if (!bd) throw new ProviderError(`Instagram no devolvió datos de @${clean}.`);
  const items = bd.media?.data ?? [];
  const withViews = items.filter((m) => isVideo(m) && typeof m.view_count === "number");
  const avgViews = withViews.length
    ? Math.round(withViews.reduce((a, m) => a + (m.view_count ?? 0), 0) / withViews.length)
    : null;

  const media: NormalizedVideo[] = items.map((m) => {
    const shortcode = m.shortcode ?? shortcodeFromPermalink(m.permalink) ?? m.id;
    return {
      platform: "instagram",
      externalId: shortcode,
      url: m.permalink ?? `https://www.instagram.com/reel/${shortcode}/`,
      sourceProvider: "instagram",
      authorHandle: bd.username,
      authorName: bd.name ?? null,
      authorFollowers: bd.followers_count ?? null,
      authorAvgViews: avgViews,
      publishedAt: m.timestamp ?? null,
      durationSeconds: null,
      caption: m.caption?.slice(0, 2000) ?? null,
      hashtags: extractHashtags(m.caption),
      audio: null,
      thumbnailUrl: m.thumbnail_url ?? null,
      views: m.view_count ?? null,
      likes: m.like_count ?? null,
      comments: m.comments_count ?? null,
      shares: null,
      saves: null,
      language: null,
      country: null,
      madeForKids: null,
    };
  });

  return {
    username: bd.username,
    name: bd.name ?? null,
    followers: bd.followers_count ?? null,
    mediaCount: bd.media_count ?? null,
    avgViews,
    media: media.filter((_, i) => isVideo(items[i])),
  };
}

/**
 * Reserva un hashtag dentro del limite semanal de Meta. Repetir un hashtag ya
 * consultado en la ventana no suma; uno nuevo solo entra si hay lugar.
 */
async function reserveHashtag(tag: string): Promise<{ ok: boolean; hashtagId: string | null }> {
  const row = await queryOne<{ hashtag_id: string | null; in_window: boolean }>(
    "select hashtag_id, window_started_at > now() - interval '7 days' as in_window from ig_hashtag_queries where hashtag = $1",
    [tag]
  );
  if (row?.in_window) {
    await query("update ig_hashtag_queries set last_queried_at = now() where hashtag = $1", [tag]);
    return { ok: true, hashtagId: row.hashtag_id };
  }
  const count = await queryOne<{ n: number }>(
    "select count(*)::int as n from ig_hashtag_queries where window_started_at > now() - interval '7 days'"
  );
  if ((count?.n ?? 0) >= HASHTAG_WEEKLY_LIMIT) return { ok: false, hashtagId: null };
  await query(
    `insert into ig_hashtag_queries (hashtag, window_started_at, last_queried_at) values ($1, now(), now())
     on conflict (hashtag) do update set window_started_at = now(), last_queried_at = now()`,
    [tag]
  );
  return { ok: true, hashtagId: row?.hashtag_id ?? null };
}

export async function hashtagsUsedThisWeek(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "select count(*)::int as n from ig_hashtag_queries where window_started_at > now() - interval '7 days'"
  );
  return row?.n ?? 0;
}

async function hashtagTopMedia(tag: string, plan: SearchPlan, ctx: ProviderRunContext): Promise<NormalizedVideo[]> {
  const usage = { profileId: ctx.profileId, clientId: ctx.clientId, searchId: ctx.searchId };
  const reserve = await reserveHashtag(tag);
  if (!reserve.ok) {
    ctx.note(`Instagram: se salteó #${tag} porque ya se usaron los ${HASHTAG_WEEKLY_LIMIT} hashtags nuevos de esta semana (límite de Meta: 30 cada 7 días).`);
    return [];
  }
  const { token, igUserId } = await identity();
  let hashtagId = reserve.hashtagId;
  if (!hashtagId) {
    const found = await metaGet<{ data: { id: string }[] }>("ig_hashtag_search", token, { user_id: igUserId, q: tag });
    await recordProviderUsage({ ...usage, provider: "meta", operation: "hashtag_search" });
    hashtagId = found.data?.[0]?.id ?? null;
    if (!hashtagId) return [];
    await query("update ig_hashtag_queries set hashtag_id = $2 where hashtag = $1", [tag, hashtagId]);
  }
  const res = await metaGet<{ data: IgMedia[] }>(`${hashtagId}/top_media`, token, {
    user_id: igUserId,
    fields: "id,caption,media_type,comments_count,like_count,permalink,timestamp",
    limit: "50",
  });
  await recordProviderUsage({ ...usage, provider: "meta", operation: "hashtag_top_media" });

  const since = Date.now() - plan.period_days * 86_400_000;
  return (res.data ?? [])
    .filter((m) => m.media_type === "VIDEO" && (!m.timestamp || Date.parse(m.timestamp) >= since))
    .map((m) => {
      const shortcode = shortcodeFromPermalink(m.permalink) ?? m.id;
      return {
        platform: "instagram" as const,
        externalId: shortcode,
        url: m.permalink ?? `https://www.instagram.com/reel/${shortcode}/`,
        sourceProvider: "instagram" as const,
        authorHandle: null,
        authorName: null,
        authorFollowers: null,
        authorAvgViews: null,
        publishedAt: m.timestamp ?? null,
        durationSeconds: null,
        caption: m.caption?.slice(0, 2000) ?? null,
        hashtags: extractHashtags(m.caption),
        audio: null,
        thumbnailUrl: null,
        views: null,
        likes: m.like_count ?? null,
        comments: m.comments_count ?? null,
        shares: null,
        saves: null,
        language: null,
        country: null,
        madeForKids: null,
      };
    });
}

export const instagramProvider: TrendProvider = {
  id: "instagram",
  platform: "instagram",
  label: "Instagram Graph API",
  isConfigured: isInstagramConfigured,

  async search(plan: SearchPlan, ctx: ProviderRunContext): Promise<NormalizedVideo[]> {
    const usage = { profileId: ctx.profileId, clientId: ctx.clientId, searchId: ctx.searchId };
    const results: NormalizedVideo[] = [];
    const since = Date.now() - plan.period_days * 86_400_000;

    const accounts = plan.reference_accounts.filter((a) => a.platform === "instagram").slice(0, MAX_ACCOUNTS_PER_SEARCH);
    for (const account of accounts) {
      try {
        const bd = await businessDiscovery(account.handle, usage);
        results.push(
          ...bd.media.filter(
            (m) => (!m.publishedAt || Date.parse(m.publishedAt) >= since) && (m.views ?? 0) >= plan.min_views
          )
        );
      } catch (err) {
        const msg = err instanceof MetaApiError || err instanceof ProviderError ? err.message : String(err);
        ctx.note(`Instagram: no se pudo revisar @${account.handle} (${msg}). Tiene que ser una cuenta Business o Creator.`);
      }
    }

    if (isHashtagSearchEnabled()) {
      for (const tag of plan.hashtags.slice(0, MAX_HASHTAGS_PER_SEARCH)) {
        try {
          results.push(...(await hashtagTopMedia(tag, plan, ctx)));
        } catch (err) {
          const msg = err instanceof MetaApiError || err instanceof ProviderError ? err.message : String(err);
          ctx.note(`Instagram: falló la búsqueda de #${tag} (${msg}).`);
        }
      }
    } else if (accounts.length === 0) {
      ctx.note(
        "Instagram: la búsqueda por hashtag está apagada hasta que Meta apruebe \"Instagram Public Content Access\". Agregá cuentas referentes (@usuario) al plan para revisar sus reels."
      );
    }

    return results;
  },
};
