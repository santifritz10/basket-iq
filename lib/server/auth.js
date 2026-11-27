import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAnonServerClient } from "@/lib/server/supabase";
import { cookieMaxAgeForToken } from "@/lib/auth/jwt";

const ACCESS_COOKIE = "bl_access_token";
// Cookie histórica: ya no se escribe (el navegador es el único que renueva la
// sesión, para no competir por el refresh token), pero se borra al salir.
const LEGACY_REFRESH_COOKIE = "bl_refresh_token";

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge
  };
}

/**
 * Guarda el access token en una cookie httpOnly para que las rutas del
 * servidor identifiquen al usuario. La cookie dura lo mismo que el token.
 * @returns {Promise<boolean>} false si el token ya venció.
 */
export async function setAuthCookies(session) {
  const cookieStore = await cookies();
  const maxAge = cookieMaxAgeForToken(session?.access_token);
  cookieStore.delete(LEGACY_REFRESH_COOKIE);
  if (!maxAge) {
    cookieStore.delete(ACCESS_COOKIE);
    return false;
  }
  cookieStore.set(ACCESS_COOKIE, session.access_token, cookieOptions(maxAge));
  return true;
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(LEGACY_REFRESH_COOKIE);
}

export async function getAccessTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value || null;
}

/** Valida el token contra Supabase (no solo lo decodifica). */
export async function getAuthenticatedUserFromCookies() {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  if (!cookieMaxAgeForToken(token)) return null;
  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Para páginas protegidas: si no hay usuario válido, manda al login con la
 * ruta actual como destino. El login sincroniza la sesión del navegador y
 * vuelve, o pide iniciar sesión si realmente expiró.
 */
export async function requireUserOrRedirect() {
  const user = await getAuthenticatedUserFromCookies();
  if (user) return user;
  const h = await headers();
  const path = h.get("x-bl-pathname") || "/";
  const params = new URLSearchParams({ next: path });
  redirect(`/login?${params.toString()}`);
}

/**
 * Protección CSRF para endpoints que escriben cookies de sesión: solo se
 * aceptan pedidos hechos desde el mismo origen.
 */
export function isSameOriginRequest(req) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
