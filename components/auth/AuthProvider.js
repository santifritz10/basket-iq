"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { getBrowserSupabase } from "@/lib/client/supabase-browser";
import { buildRedirectUrl, pickRedirectOrigin, sanitizeNextPath } from "@/lib/auth/site-url";

const AuthContext = createContext(null);

export function AuthProvider({ config, children }) {
  /** El cliente se crea recién cuando una pantalla lo pide (no antes). */
  const getSupabase = useCallback(
    () => getBrowserSupabase({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey }),
    [config.supabaseUrl, config.supabaseAnonKey]
  );

  const redirectUrl = useCallback(
    (path, next) => {
      const origin = pickRedirectOrigin(config, typeof window !== "undefined" ? window.location.origin : "");
      return buildRedirectUrl(origin, path, next);
    },
    [config]
  );

  const safeNext = useCallback(
    (next, fallback = "/") =>
      sanitizeNextPath(next, {
        allowedOrigins: [...config.allowedOrigins, typeof window !== "undefined" ? window.location.origin : ""],
        fallback
      }),
    [config.allowedOrigins]
  );

  const value = useMemo(
    () => ({ config, getSupabase, redirectUrl, safeNext, configured: Boolean(config.supabaseUrl && config.supabaseAnonKey) }),
    [config, getSupabase, redirectUrl, safeNext]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext fuera de AuthProvider");
  return ctx;
}

/** Navegación completa: la app principal ("/") carga scripts propios. */
export function goTo(path) {
  window.location.assign(path);
}
