import "server-only";
import { cookies } from "next/headers";
import { createSupabaseAnonServerClient } from "@/lib/server/supabase";

const ACCESS_COOKIE = "bl_access_token";
const REFRESH_COOKIE = "bl_refresh_token";

export async function setAuthCookies(session) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.expires_in || 3600
  });
  cookieStore.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function getAccessTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value || null;
}

export async function getAuthenticatedUserFromCookies() {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
