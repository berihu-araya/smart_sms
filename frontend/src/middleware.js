import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("smart_sms_token")?.value;

  // 1. Guard Dashboard routes from unauthenticated access at Edge
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Redirect authenticated users away from public auth pages
  if (token && (pathname === "/login" || pathname === "/signup" || pathname === "/register")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/register",
  ],
};
