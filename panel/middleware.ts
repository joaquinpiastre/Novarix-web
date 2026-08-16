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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
