import { NextResponse } from "next/server";

const STATIC_FILE_REGEX = /\.[^/]+$/;

/** Rutas con datos del usuario: requieren sesión y nunca se cachean. */
const PRIVATE_ROUTE_PREFIXES = [
  "/players",
  "/assistant",
  "/invitations",
  "/shooting",
  "/plays",
  "/trainings",
  "/annual-plans",
  "/dashboard",
  "/bienvenida",
  "/cuenta"
];

/** Pantallas de autenticación (públicas). */
const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/registro",
  "/verificar-correo",
  "/recuperar-contrasena",
  "/nueva-contrasena",
  "/auth",
  "/cerrar-sesion"
];

const APP_ROUTE_PREFIXES = [...PRIVATE_ROUTE_PREFIXES, ...AUTH_ROUTE_PREFIXES, "/legacy-app"];

function matches(prefixes, pathname) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    STATIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/" || matches(APP_ROUTE_PREFIXES, pathname)) {
    // Las páginas protegidas leen la ruta actual para volver después del login.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-bl-pathname", `${pathname}${search}`.slice(0, 512));
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (pathname === "/" || matches(PRIVATE_ROUTE_PREFIXES, pathname) || matches(AUTH_ROUTE_PREFIXES, pathname)) {
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
    }
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:path*"]
};
