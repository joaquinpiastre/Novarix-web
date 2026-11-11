import { NextResponse, type NextRequest } from "next/server";
import { createSignedToken } from "@/lib/auth/signedToken";
import { requireClient } from "@/lib/auth/requireClient";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { buildMetaLoginUrl, callbackUrlForHost, isMetaOAuthConfigured } from "@/lib/meta/oauth";
import { metaReturnPath, requestHost, type MetaOAuthState } from "@/lib/meta/oauthState";

export const dynamic = "force-dynamic";

const STATE_TTL_MS = 15 * 60 * 1000;

/**
 * Arranca "Conectar con Facebook".
 * - Desde el panel: /api/meta/oauth/start?from=panel&client=<id> (equipo con acceso a ese cliente).
 * - Desde el portal: /api/meta/oauth/start?from=portal (el cliente sale de la sesion, nunca de la URL;
 *   solo el titular de la cuenta, y nunca en modo "ver como cliente").
 */
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") === "portal" ? "portal" : "panel";
  const host = requestHost(request.headers);

  let clientId: string;
  let userId: string;
  if (from === "portal") {
    const access = await requireClient();
    const back = metaReturnPath("portal", access.clientId, host);
    if (access.isAdminPreview) return NextResponse.redirect(new URL(`${back}?meta=preview`, request.url));
    if (access.clientRole !== "owner") return NextResponse.redirect(new URL(`${back}?meta=owner_only`, request.url));
    clientId = access.clientId;
    userId = access.userId;
  } else {
    const requested = request.nextUrl.searchParams.get("client") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(requested)) return NextResponse.redirect(new URL("/clients", request.url));
    const access = await requireClientAccess(requested);
    clientId = requested;
    userId = access.userId;
  }

  const back = metaReturnPath(from, clientId, host);
  if (!isMetaOAuthConfigured()) {
    return NextResponse.redirect(new URL(`${back}${back.includes("?") ? "&" : "?"}meta=not_configured`, request.url));
  }
  const redirectUri = callbackUrlForHost(host);
  if (!redirectUri) return new NextResponse("Dominio no permitido para conectar Meta.", { status: 400 });

  const payload: MetaOAuthState = { c: clientId, p: userId, f: from };
  const state = createSignedToken(JSON.stringify(payload), STATE_TTL_MS);
  return NextResponse.redirect(buildMetaLoginUrl(state, redirectUri));
}
