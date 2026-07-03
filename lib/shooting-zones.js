export const SHOOTING_ZONES = [
  { id: "paint", label: "Pintura" },
  { id: "mid_l", label: "Media distancia izquierda" },
  { id: "mid_c", label: "Media distancia centro" },
  { id: "mid_r", label: "Media distancia derecha" },
  { id: "t3_corner_l", label: "Triple esquina izquierda" },
  { id: "t3_left45", label: "Triple 45° izquierda" },
  { id: "t3_front", label: "Triple frontal" },
  { id: "t3_right45", label: "Triple 45° derecha" },
  { id: "t3_corner_r", label: "Triple esquina derecha" }
];

export function zoneStats(state, zoneId) {
  const z = state?.[zoneId];
  const attempts = toShotCount(z?.attempts);
  let made = toShotCount(z?.made);
  made = Math.min(made, attempts);
  return { attempts, made };
}

function toShotCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function pctLabel(attempts, made) {
  if (!attempts) return "—";
  return `${Math.round((made / attempts) * 100)}%`;
}

export function sessionTotalShots(zones) {
  let attempts = 0;
  let made = 0;
  SHOOTING_ZONES.forEach((z) => {
    const s = zoneStats(zones, z.id);
    attempts += s.attempts;
    made += s.made;
  });
  return { attempts, made };
}

export function formatSessionFecha(fecha) {
  if (!fecha) return "Sin fecha";
  try {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return fecha;
  }
}

export function getZonesWithShots(zones) {
  return SHOOTING_ZONES.filter((z) => zoneStats(zones, z.id).attempts > 0);
}

export function getPlayerShootingSessions(playerId, payload) {
  const sessions = (payload?.sessions || []).filter((session) =>
    (session.player_ids || []).some((pid) => String(pid) === String(playerId))
  );
  return sessions.sort((a, b) => {
    const da = String(a.fecha || a.created_at || "").slice(0, 10);
    const db = String(b.fecha || b.created_at || "").slice(0, 10);
    if (da !== db) return da < db ? -1 : 1;
    return String(a.created_at || "") < String(b.created_at || "") ? -1 : 1;
  });
}
