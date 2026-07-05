import { NextResponse } from "next/server";

const STATIC_FILE_REGEX = /\.[^/]+$/;

const APP_ROUTE_PREFIXES = [
  "/players",
  "/invitations",
  "/shooting",
  "/plays",
  "/trainings",
  "/annual-plans",
  "/dashboard",
  "/login",
  "/legacy-app"
];

function isAppRoute(pathname) {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    isAppRoute(pathname) ||
    STATIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:path*"]
};
