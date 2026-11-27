import { getBrowserSupabase, syncServerSession } from "@/lib/client/supabase-browser";

/**
 * Copia la sesión del cliente Supabase (localStorage) a la cookie httpOnly
 * para que las API routes de Next (/api/players, etc.) autentiquen al usuario.
 * getSession() renueva el token si hace falta antes de copiarlo.
 */
export async function syncAuthCookiesFromBrowserSession({ url, anonKey } = {}) {
  const client = getBrowserSupabase({ url, anonKey });
  if (!client) return false;
  const { data } = await client.auth.getSession();
  return syncServerSession(data?.session);
}
