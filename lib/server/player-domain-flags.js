import "server-only";

function envFlag(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

const enabled =
  envFlag("PLAYER_CENTRIC_ENABLED") ||
  envFlag("NEXT_PUBLIC_PLAYER_CENTRIC_ENABLED");

/** Fase 6: PLAYER_CENTRIC_ENABLED activa read/write/realtime salvo override explícito. */
export const playerDomainFlags = {
  enabled,
  read:
    enabled ||
    envFlag("PLAYER_CENTRIC_READ") ||
    envFlag("NEXT_PUBLIC_PLAYER_CENTRIC_READ"),
  write:
    enabled ||
    envFlag("PLAYER_CENTRIC_WRITE") ||
    envFlag("NEXT_PUBLIC_PLAYER_CENTRIC_WRITE"),
  realtime:
    enabled ||
    envFlag("PLAYER_CENTRIC_REALTIME") ||
    envFlag("NEXT_PUBLIC_PLAYER_CENTRIC_REALTIME"),
  active:
    enabled ||
    envFlag("PLAYER_CENTRIC_READ") ||
    envFlag("PLAYER_CENTRIC_WRITE") ||
    envFlag("NEXT_PUBLIC_PLAYER_CENTRIC_READ") ||
    envFlag("NEXT_PUBLIC_PLAYER_CENTRIC_WRITE")
};
