import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, public images, and auth API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isAuth = request.cookies.get("abira_auth")?.value === "authenticated";

  // If logged in and visiting login, go to dashboard
  if (isAuth && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If not logged in and not on login, go to login
  if (!isAuth && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
