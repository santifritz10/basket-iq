import { createClient } from "@supabase/supabase-js";

/**
 * Copia la sesión del cliente Supabase (localStorage) a cookies httpOnly
 * para que las API routes de Next (/api/players, etc.) autentiquen al usuario.
 */
export async function syncAuthCookiesFromBrowserSession({ url, anonKey } = {}) {
  if (!url || !anonKey) return false;

  const client = createClient(url, anonKey);
  const { data } = await client.auth.getSession();
  const session = data?.session;
  if (!session?.access_token || !session?.refresh_token) return false;

  const res = await fetch("/api/auth/sync-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })
  });

  const json = await res.json().catch(() => ({}));
  return res.ok && json.ok === true;
}
