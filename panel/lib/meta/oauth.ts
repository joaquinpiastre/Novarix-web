import "server-only";
import { query, queryOne } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { log } from "@/lib/log";
import { discoverMetaAssets, type AvailableMetaAsset } from "./assets";
import { GRAPH_BASE, metaGet, MetaApiError } from "./client";
import { syncConnection } from "./sync";

// "Conectar con Facebook" (Inicio de sesion con Facebook para empresas).
// Verificado en developers.facebook.com el 2026-11-11:
// - Dialogo: https://www.facebook.com/{version}/dialog/oauth?client_id&redirect_uri&state
//   + config_id (configuracion de Inicio de sesion para empresas). Para tokens
//   de usuario del sistema: response_type=code + override_default_response_type=true.
// - Canje: GET graph.facebook.com/{version}/oauth/access_token?client_id&redirect_uri&client_secret&code
// - Los tokens de usuario del sistema no vencen. Los de usuario son cortos:
//   se canjean por uno de larga duracion (60 dias).
// - Para que clientes que no son de Novarix puedan conectar, la app tiene que
//   estar en modo produccion con Acceso avanzado aprobado en App Review.
//   Mientras tanto solo pueden probarlo personas con rol en la app.

const DIALOG_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v26.0";

const DEFAULT_HOSTS = ["panel.novarix.agency", "clientes.novarix.agency"];

/** Permisos que se piden si no hay config_id (inicio de sesion clasico). */
const FALLBACK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_manage_insights",
  "ads_read",
  "business_management",
];

export function isMetaOAuthConfigured(): boolean {
  return Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
}

function appId(): string {
  return process.env.META_APP_ID!.trim();
}

function appSecret(): string {
  return process.env.META_APP_SECRET!.trim();
}

function allowedHosts(): string[] {
  const extra = (process.env.META_OAUTH_EXTRA_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return [...DEFAULT_HOSTS, ...extra];
}

/**
 * La URL de vuelta tiene que ser del mismo dominio desde donde se arranca
 * (la cookie de sesion es por dominio). Solo se aceptan dominios conocidos:
 * nunca se arma con un Host arbitrario.
 */
export function callbackUrlForHost(host: string | null): string | null {
  if (!host) return null;
  const clean = host.split(",")[0].trim().toLowerCase();
  const bare = clean.replace(/:\d+$/, "");
  if (bare === "localhost" || bare === "127.0.0.1") return `http://${clean}/api/meta/oauth/callback`;
  if (!allowedHosts().includes(bare)) return null;
  return `https://${bare}/api/meta/oauth/callback`;
}

export function buildMetaLoginUrl(state: string, redirectUri: string): string {
  const url = new URL(`https://www.facebook.com/${DIALOG_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  const configId = process.env.META_LOGIN_CONFIG_ID?.trim();
  if (configId) {
    url.searchParams.set("config_id", configId);
    url.searchParams.set("override_default_response_type", "true");
  } else {
    url.searchParams.set("scope", FALLBACK_SCOPES.join(","));
  }
  return url.toString();
}

async function graphFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new MetaApiError(body.error?.message ?? `Error de Meta (HTTP ${res.status})`, body.error?.code);
  }
  return body as T;
}

export interface ExchangedToken {
  token: string;
  /** null = no vence (token de usuario del sistema). */
  expiresAt: string | null;
  type: string;
}

/** Canjea el code del dialogo por un token; si es de usuario (corto), lo pasa a larga duracion. */
export async function exchangeMetaCode(code: string, redirectUri: string): Promise<ExchangedToken> {
  const first = await graphFetch<{ access_token: string; expires_in?: number }>("oauth/access_token", {
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: redirectUri,
    code,
  });

  const debug = await graphFetch<{ data: { type?: string; expires_at?: number; is_valid?: boolean; app_id?: string } }>(
    "debug_token",
    { input_token: first.access_token, access_token: `${appId()}|${appSecret()}` }
  );
  if (!debug.data.is_valid || (debug.data.app_id && debug.data.app_id !== appId())) {
    throw new MetaApiError("Meta devolvió un token inválido.");
  }
  const type = debug.data.type ?? "UNKNOWN";
  const expiresAtUnix = debug.data.expires_at ?? 0;

  if (type === "USER" && expiresAtUnix > 0) {
    const long = await graphFetch<{ access_token: string; expires_in?: number }>("oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: appId(),
      client_secret: appSecret(),
      fb_exchange_token: first.access_token,
    });
    const expiresAt = long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null;
    return { token: long.access_token, expiresAt, type };
  }

  return {
    token: first.access_token,
    expiresAt: expiresAtUnix > 0 ? new Date(expiresAtUnix * 1000).toISOString() : null,
    type,
  };
}

/**
 * Guarda (o reemplaza) la conexion de Meta del cliente. NO agrega cuentas solo:
 * la persona puede administrar paginas de varios portfolios (de otros
 * clientes), asi que despues elige cuales son de este cliente
 * (saveMetaAssetSelection). Devuelve lo que encontro para mostrar la eleccion.
 */
export async function saveOAuthConnection(input: {
  clientId: string;
  actorId: string;
  token: string;
  expiresAt: string | null;
}): Promise<{ connectionId: string; assets: AvailableMetaAsset[] }> {
  await metaGet("me", input.token);

  const existing = await queryOne<{ id: string }>(
    "select id from meta_connections where client_id = $1 order by created_at desc limit 1",
    [input.clientId]
  );
  let connectionId: string;
  if (existing) {
    connectionId = existing.id;
    await query(
      `update meta_connections set access_token = $2, token_expires_at = $3, status = 'active', last_error = null
       where id = $1`,
      [connectionId, encrypt(input.token), input.expiresAt]
    );
  } else {
    const row = await queryOne<{ id: string }>(
      `insert into meta_connections (client_id, access_token, token_expires_at, status, created_by)
       values ($1, $2, $3, 'active', $4) returning id`,
      [input.clientId, encrypt(input.token), input.expiresAt, input.actorId]
    );
    connectionId = row!.id;
  }

  const assets = await discoverMetaAssets(input.token);
  return { connectionId, assets };
}

export interface MetaAssetChoice extends AvailableMetaAsset {
  selected: boolean;
  /** Si esta cuenta ya esta asignada a otro cliente del panel. */
  used_by: string | null;
}

/** Lo que el token de la conexion del cliente puede ver, marcando lo ya elegido y lo que usa otro cliente. */
export async function listMetaAssetChoices(clientId: string): Promise<{ connectionId: string; choices: MetaAssetChoice[] } | { error: string }> {
  const conn = await queryOne<{ id: string; access_token: string }>(
    "select id, access_token from meta_connections where client_id = $1 order by created_at desc limit 1",
    [clientId]
  );
  if (!conn) return { error: "Este cliente no tiene Facebook conectado." };
  let assets: AvailableMetaAsset[];
  try {
    assets = await discoverMetaAssets(decrypt(conn.access_token));
  } catch {
    return { error: "No se pudo leer la cuenta de Facebook. Probá reconectar." };
  }
  const current = await query<{ asset_type: string; external_id: string }>(
    "select asset_type::text as asset_type, external_id from meta_assets where connection_id = $1 and active = true",
    [conn.id]
  );
  const others = await query<{ asset_type: string; external_id: string; client_name: string }>(
    `select a.asset_type::text as asset_type, a.external_id, c.name as client_name
     from meta_assets a join clients c on c.id = a.client_id
     where a.client_id <> $1 and a.active = true and c.status <> 'eliminado'`,
    [clientId]
  );
  const key = (t: string, id: string) => `${t}:${id}`;
  const selected = new Set(current.map((r) => key(r.asset_type, r.external_id)));
  const usedBy = new Map(others.map((r) => [key(r.asset_type, r.external_id), r.client_name]));
  return {
    connectionId: conn.id,
    choices: assets.map((a) => ({
      ...a,
      selected: selected.has(key(a.type, a.external_id)),
      used_by: usedBy.get(key(a.type, a.external_id)) ?? null,
    })),
  };
}

/**
 * Deja en la conexion SOLO las cuentas elegidas: agrega las nuevas y borra las
 * que se destildaron (con sus metricas, para no mezclar datos de otro
 * cliente). Lanza la sincronizacion.
 */
export async function saveMetaAssetSelection(
  clientId: string,
  selected: { type: string; external_id: string }[]
): Promise<{ saved: number } | { error: string }> {
  const listed = await listMetaAssetChoices(clientId);
  if ("error" in listed) return listed;
  const allowed = new Map(listed.choices.map((c) => [`${c.type}:${c.external_id}`, c]));
  const chosen = selected.map((s) => allowed.get(`${s.type}:${s.external_id}`)).filter((c): c is MetaAssetChoice => Boolean(c));

  for (const a of chosen) {
    await query(
      `insert into meta_assets (connection_id, client_id, asset_type, external_id, name)
       values ($1, $2, $3, $4, $5)
       on conflict (connection_id, asset_type, external_id) do update set active = true, name = excluded.name`,
      [listed.connectionId, clientId, a.type, a.external_id, a.name]
    );
  }
  const keep = chosen.map((a) => `${a.type}:${a.external_id}`);
  await query(
    `delete from meta_assets where connection_id = $1 and not ((asset_type::text || ':' || external_id) = any($2::text[]))`,
    [listed.connectionId, keep]
  );

  if (chosen.length) {
    syncConnection(listed.connectionId, 30).catch((err) =>
      log.error("meta first sync after selection failed", { connectionId: listed.connectionId, err: String(err) })
    );
  }
  return { saved: chosen.length };
}
