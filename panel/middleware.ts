import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "panel_session";

// Dominio dedicado para el portal de clientes -- mismo servicio de Railway,
// pero cualquier ruta que entre por este host se sirve como si estuviera
// bajo /portal, para que el cliente nunca vea "/portal" en la URL. Registro
// DNS necesario documentado en ARCHITECTURE.md.
const PORTAL_HOST = "clientes.novarix.agency";

// Rutas que no requieren sesión -- login (interno y de portal), e
// invitación/recuperación de contraseña del portal, que por definición las
// usa alguien que todavía no tiene (o no recuerda) sus credenciales.
const PUBLIC_PATHS = [
  "/login",
  "/portal/login",
  "/portal/accept-invite",
  "/portal/forgot-password",
  "/portal/reset-password",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isPortalHost = host === PORTAL_HOST || host.startsWith(`${PORTAL_HOST}:`);
  const requestedPath = request.nextUrl.pathname;

  // Path "efectivo" para las reglas de abajo: en el dominio de clientes, se
  // trata todo como si ya estuviera bajo /portal.
  const effectivePath =
    isPortalHost && !requestedPath.startsWith("/portal") && !requestedPath.startsWith("/api")
      ? requestedPath === "/"
        ? "/portal"
        : `/portal${requestedPath}`
      : requestedPath;

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = isPublicPath(effectivePath);

  if (!hasSessionCookie && !isPublic) {
    // En el dominio de clientes, redirige a la URL "pelada" (sin /portal) --
    // la vuelve a reescribir esta misma funcion en el siguiente request.
    const loginPath = isPortalHost ? "/login" : effectivePath.startsWith("/portal") ? "/portal/login" : "/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (hasSessionCookie && isPublic) {
    const landingPath = isPortalHost ? "/" : effectivePath.startsWith("/portal") ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(landingPath, request.url));
  }

  if (effectivePath !== requestedPath) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = effectivePath;
    return NextResponse.rewrite(rewritten);
  }

  return NextResponse.next();
}

export const config = {
  // /api/* queda afuera: cada ruta de API se autentica a su manera (ej.
  // /api/health no necesita sesion; un futuro webhook se valida por firma,
  // no por cookie) y debe poder responder JSON/401 en vez de un 302 a /login.
  // manifest.webmanifest tampoco necesita sesion -- el navegador lo pide
  // antes de instalar la PWA.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|manifest.webmanifest).*)"],
};
