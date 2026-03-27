import { NextResponse } from "next/server";

const STATIC_FILE_REGEX = /\.[^/]+$/;

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Keep API, Next internals and legacy static serving untouched.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/legacy") ||
    pathname === "/favicon.ico" ||
    STATIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/legacy/index.html";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:path*"]
};
