"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { syncServerSession } from "@/lib/client/supabase-browser";

/**
 * Lee la sesión del navegador. state: "loading" | "none" | "active".
 * Si hay sesión, también renueva la cookie del servidor.
 */
export function useBrowserSession({ sync = true } = {}) {
  const { getSupabase, configured } = useAuthContext();
  const [state, setState] = useState({ status: "loading", session: null, synced: false });

  useEffect(() => {
    let cancelled = false;
    if (!configured) {
      setState({ status: "none", session: null, synced: false });
      return undefined;
    }
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      const session = data?.session || null;
      if (!session) {
        if (!cancelled) setState({ status: "none", session: null, synced: false });
        return;
      }
      // getUser valida el token con Supabase (getSession solo lee el almacenamiento).
      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData?.user) {
        const status = Number(error?.status || 0);
        if (error && (status === 0 || status >= 500)) {
          // Servicio no disponible: no borramos la sesión del usuario.
          if (!cancelled) setState({ status: "none", session: null, synced: false, unavailable: true });
          return;
        }
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        if (!cancelled) setState({ status: "none", session: null, synced: false, expired: true });
        return;
      }
      const synced = sync ? await syncServerSession(session) : false;
      if (!cancelled) setState({ status: "active", session, user: userData.user, synced });
    })().catch(() => {
      if (!cancelled) setState({ status: "none", session: null, synced: false });
    });
    return () => {
      cancelled = true;
    };
  }, [configured, getSupabase, sync]);

  return state;
}
