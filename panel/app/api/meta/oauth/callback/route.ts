import { NextResponse, type NextRequest } from "next/server";
import { verifySignedToken } from "@/lib/auth/signedToken";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { requireClient } from "@/lib/auth/requireClient";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { log } from "@/lib/log";
import { callbackUrlForHost, exchangeMetaCode, isMetaOAuthConfigured, saveOAuthConnection } from "@/lib/meta/oauth";
import { metaReturnPath, parseMetaOAuthState, requestHost } from "@/lib/meta/oauthState";

export const dynamic = "force-dynamic";

/** Vuelta del dialogo de Facebook: valida el state, canjea el code y guarda la conexion. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const host = requestHost(request.headers);
  const state = parseMetaOAuthState(verifySignedToken(params.get("state")));
  const go = (from: "panel" | "portal", clientId: string, status: string, extra = "") => {
    const back = metaReturnPath(from, clientId, host);
    return NextResponse.redirect(new URL(`${back}${back.includes("?") ? "&" : "?"}meta=${status}${extra}`, request.url));
  };

  if (!state) return NextResponse.redirect(new URL("/?meta=expired", request.url));

  // Quien vuelve tiene que ser quien arranco, y seguir teniendo acceso a ese cliente.
  const { userId } = await getSessionProfile();
  if (userId !== state.p) return go(state.f, state.c, "expired");
  if (state.f === "portal") {
    const access = await requireClient();
    if (access.clientId !== state.c || access.isAdminPreview || access.clientRole !== "owner") {
      return go(state.f, state.c, "expired");
    }
  } else {
    await requireClientAccess(state.c);
  }

  if (params.get("error") || !params.get("code")) return go(state.f, state.c, "cancelled");
  const redirectUri = callbackUrlForHost(host);
  if (!isMetaOAuthConfigured() || !redirectUri) return go(state.f, state.c, "not_configured");

  try {
    const exchanged = await exchangeMetaCode(params.get("code")!, redirectUri);
    const { connectionId, assets } = await saveOAuthConnection({
      clientId: state.c,
      actorId: userId,
      token: exchanged.token,
      expiresAt: exchanged.expiresAt,
    });
    await recordAudit({
      actorId: userId,
      action: "meta_connections.oauth_connect",
      entityType: "meta_connection",
      entityId: connectionId,
      after: {
        client_id: state.c,
        from: state.f,
        token_type: exchanged.type,
        expires_at: exchanged.expiresAt,
        assets: assets.map((a) => `${a.type}:${a.name}`),
      },
      ip: getClientIp(),
    });
    if (assets.length === 0) return go(state.f, state.c, "no_assets");
    return go(state.f, state.c, "ok", `&assets=${assets.length}`);
  } catch (err) {
    log.error("meta oauth callback failed", { clientId: state.c, err: String(err) });
    return go(state.f, state.c, "error");
  }
}
