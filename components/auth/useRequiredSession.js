"use client";

import { useEffect } from "react";
import { goTo } from "@/components/auth/AuthProvider";
import { useBrowserSession } from "@/components/auth/useSession";

/** Para pantallas que requieren sesión: si no hay, va al login y vuelve. */
export function useRequiredSession(path) {
  const session = useBrowserSession();
  useEffect(() => {
    if (session.status === "none") {
      const params = new URLSearchParams({ next: path });
      if (session.expired) params.set("motivo", "expirada");
      goTo(`/login?${params.toString()}`);
    }
  }, [session.status, session.expired, path]);
  return session;
}
