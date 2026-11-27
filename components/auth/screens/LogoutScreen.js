"use client";

import { useEffect } from "react";
import { useAuthContext, goTo } from "@/components/auth/AuthProvider";
import { AuthLoading } from "@/components/auth/ui";
import { clearServerSession } from "@/lib/client/supabase-browser";

/** Cierra la sesión del navegador y del servidor, y vuelve al login. */
export default function LogoutScreen() {
  const { getSupabase, configured } = useAuthContext();
  useEffect(() => {
    (async () => {
      if (configured) {
        await getSupabase().auth.signOut({ scope: "local" }).catch(() => {});
      }
      await clearServerSession();
      goTo("/login?motivo=sesion-cerrada");
    })();
  }, [configured, getSupabase]);
  return <AuthLoading label="Cerrando sesión…" />;
}
