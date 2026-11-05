import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "panel_session";

export function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (!hasSessionCookie && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionCookie && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // /api/* queda afuera: cada ruta de API se autentica a su manera (ej.
  // /api/health no necesita sesion; un futuro webhook se valida por firma,
  // no por cookie) y debe poder responder JSON/401 en vez de un 302 a /login.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
