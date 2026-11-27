import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador (único por pestaña).
 *
 * Usa el mismo almacenamiento que la app principal (index.html + main.js),
 * así la sesión iniciada en las pantallas nuevas es la misma en toda la app.
 * Flujo "implicit" + token_hash: los enlaces de los correos funcionan aunque
 * se abran en otro navegador o dispositivo (no dependen de un code verifier).
 */
let client = null;
let clientKey = "";

export function getBrowserSupabase({ url, anonKey } = {}) {
  if (!url || !anonKey) return null;
  const key = `${url}|${anonKey}`;
  if (client && clientKey === key) return client;
  client = createClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  clientKey = key;
  return client;
}

/** Copia el access token a una cookie httpOnly para las rutas del servidor. */
export async function syncServerSession(session) {
  if (!session?.access_token) return false;
  try {
    const res = await fetch("/api/auth/sync-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ access_token: session.access_token })
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && json.ok === true;
  } catch {
    return false;
  }
}

export async function clearServerSession() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    /* sin conexión: la cookie vence sola */
  }
}
