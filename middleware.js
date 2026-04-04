import { NextResponse } from "next/server";

const STATIC_FILE_REGEX = /\.[^/]+$/;

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Keep API and static internals untouched.
  if (
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
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
