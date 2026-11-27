/**
 * Shooting Lab — lógica pura (sin servidor ni navegador).
 * La comparten la API, la pantalla y los tests.
 *
 * Reglas que esta capa garantiza:
 * - Los porcentajes se calculan como aciertos totales / intentos totales.
 * - Los tiros libres se cuentan aparte de los tiros de campo.
 * - Las rachas solo se calculan con lanzamientos individuales en orden.
 * - Las sesiones históricas (zonas agregadas) nunca se atribuyen a un jugador:
 *   se etiquetan por procedencia.
 */

/** Las 9 zonas históricas (mismos ids que el módulo anterior) + tiro libre + cerca del aro. */
export const FIELD_ZONES = [
  { id: "rim", label: "Cerca del aro", short: "Aro", points: 2, legacy: false },
  { id: "paint", label: "Pintura", short: "Pint.", points: 2, legacy: true },
  { id: "mid_l", label: "Media distancia izquierda", short: "MI", points: 2, legacy: true },
  { id: "mid_c", label: "Media distancia centro", short: "MC", points: 2, legacy: true },
  { id: "mid_r", label: "Media distancia derecha", short: "MD", points: 2, legacy: true },
  { id: "t3_corner_l", label: "Triple esquina izquierda", short: "E3I", points: 3, legacy: true },
  { id: "t3_left45", label: "Triple 45° izquierda", short: "45I", points: 3, legacy: true },
  { id: "t3_front", label: "Triple frontal", short: "3F", points: 3, legacy: true },
  { id: "t3_right45", label: "Triple 45° derecha", short: "45D", points: 3, legacy: true },
  { id: "t3_corner_r", label: "Triple esquina derecha", short: "E3D", points: 3, legacy: true }
];

export const FREE_THROW_ZONE = { id: "ft", label: "Tiro libre", short: "TL", points: 1, legacy: false };

export const ALL_ZONES = [...FIELD_ZONES, FREE_THROW_ZONE];
export const LEGACY_ZONE_IDS = FIELD_ZONES.filter((z) => z.legacy).map((z) => z.id);
const ZONE_BY_ID = Object.fromEntries(ALL_ZONES.map((z) => [z.id, z]));

export function zoneById(id) {
  return ZONE_BY_ID[id] || null;
}

export function isThreePointZone(id) {
  return zoneById(id)?.points === 3;
}

/**
 * Características del lanzamiento (separadas de la ubicación).
 * `group` marca las excluyentes: dentro de un grupo se elige una como máximo.
 */
export const SHOT_TAGS = [
  { id: "catch", label: "Desde recepción", group: "creation" },
  { id: "off_dribble", label: "Después de dribbling", group: "creation" },
  { id: "moving", label: "En movimiento", group: null },
  { id: "off_screen", label: "Después de bloqueo", group: null },
  { id: "contested", label: "Con oposición", group: "defense" },
  { id: "uncontested", label: "Sin oposición", group: "defense" },
  { id: "right_hand", label: "Mano derecha", group: "hand", zones: ["rim", "paint"] },
  { id: "left_hand", label: "Mano izquierda", group: "hand", zones: ["rim", "paint"] }
];
const TAG_BY_ID = Object.fromEntries(SHOT_TAGS.map((t) => [t.id, t]));

export function tagById(id) {
  return TAG_BY_ID[id] || null;
}

/** Tags permitidos para una zona (las manos solo para finalizaciones). */
export function tagsForZone(zoneId) {
  return SHOT_TAGS.filter((t) => !t.zones || t.zones.includes(zoneId));
}

/** Agrega un tag quitando los incompatibles del mismo grupo. */
export function toggleTag(tags, tagId) {
  const current = Array.isArray(tags) ? tags : [];
  if (current.includes(tagId)) return current.filter((t) => t !== tagId);
  const tag = tagById(tagId);
  if (!tag) return current;
  const kept = tag.group ? current.filter((t) => tagById(t)?.group !== tag.group) : current;
  return [...kept, tagId];
}

/** Umbrales visuales configurables (no son estándares de rendimiento). */
export const DEFAULT_THRESHOLDS = { low: 40, high: 60 };
/** Muestra mínima para hablar de una zona fuerte o débil (criterio propio de Basket Lab). */
export const DEFAULT_MIN_SAMPLE = 20;

export function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Porcentaje 0–100 o null si no hay intentos (sin datos ≠ 0%). */
export function pct(made, attempts) {
  if (!attempts) return null;
  return (made / attempts) * 100;
}

export function pctLabel(made, attempts) {
  const p = pct(made, attempts);
  return p == null ? "—" : `${Math.round(p)}%`;
}

/** Banda visual: none (sin datos) | low | mid | high. */
export function colorBand(made, attempts, thresholds = DEFAULT_THRESHOLDS) {
  const p = pct(made, attempts);
  if (p == null) return "none";
  if (p < thresholds.low) return "low";
  if (p <= thresholds.high) return "mid";
  return "high";
}

// ---------------------------------------------------------------------------
// Validación de registros
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ""));
}

function isNonNegativeInteger(value) {
  return typeof value === "number" ? Number.isInteger(value) && value >= 0 : /^\d+$/.test(String(value ?? "").trim());
}

/**
 * Valida y normaliza un registro (lanzamiento o serie).
 * Devuelve { ok, errors: string[], value }.
 */
export function validateEntryInput(input) {
  const errors = [];
  const raw = input || {};
  const entryType = raw.entry_type === "series" ? "series" : raw.entry_type === "shot" ? "shot" : null;
  if (!entryType) errors.push("Tipo de registro inválido.");

  const scope = raw.scope === "collective" ? "collective" : "player";
  const playerId = scope === "player" ? String(raw.player_id || "") : null;
  if (scope === "player" && !isUuid(playerId)) errors.push("Elegí un jugador de la sesión.");

  const zone = zoneById(raw.zone_id);
  if (!zone) errors.push("Elegí una zona.");

  let attempts;
  let made;
  if (entryType === "shot") {
    attempts = 1;
    made = raw.made === true || raw.made === 1 || raw.made === "1" ? 1 : 0;
  } else {
    if (!isNonNegativeInteger(raw.attempts)) errors.push("Los intentos tienen que ser un número entero, 0 o más.");
    if (!isNonNegativeInteger(raw.made)) errors.push("Las conversiones tienen que ser un número entero, 0 o más.");
    attempts = Number(raw.attempts);
    made = Number(raw.made);
    if (Number.isInteger(attempts) && attempts < 1) errors.push("Una serie necesita al menos 1 intento.");
    if (Number.isInteger(attempts) && attempts > 1000) errors.push("Una serie no puede superar 1000 intentos.");
    if (Number.isInteger(attempts) && Number.isInteger(made) && made > attempts) {
      errors.push("Las conversiones no pueden superar los intentos.");
    }
  }

  const rawTags = Array.isArray(raw.tags) ? [...new Set(raw.tags.map(String))] : [];
  const allowedForZone = zone ? tagsForZone(zone.id).map((t) => t.id) : [];
  const unknown = rawTags.filter((t) => !tagById(t));
  if (unknown.length) errors.push("Característica desconocida.");
  const misplaced = rawTags.filter((t) => tagById(t) && !allowedForZone.includes(t));
  if (misplaced.length) errors.push("La mano de finalización solo aplica cerca del aro o en la pintura.");
  const groups = {};
  rawTags.forEach((t) => {
    const g = tagById(t)?.group;
    if (!g) return;
    groups[g] = (groups[g] || 0) + 1;
  });
  if (Object.values(groups).some((n) => n > 1)) errors.push("Hay características incompatibles entre sí.");

  let x = raw.x_m == null || raw.x_m === "" ? null : Number(raw.x_m);
  let y = raw.y_m == null || raw.y_m === "" ? null : Number(raw.y_m);
  if ((x == null) !== (y == null)) errors.push("Las coordenadas van de a dos (x e y).");
  if (x != null && (!Number.isFinite(x) || x < 0 || x > 15 || !Number.isFinite(y) || y < 0 || y > 14)) {
    errors.push("Las coordenadas están fuera de la media cancha.");
  }
  if (x != null && Number.isFinite(x)) x = Math.round(x * 100) / 100;
  if (y != null && Number.isFinite(y)) y = Math.round(y * 100) / 100;

  const clientEntryId = String(raw.client_entry_id || "");
  if (!isUuid(clientEntryId)) errors.push("Falta el identificador del registro.");

  const seq = entryType === "shot" && Number.isInteger(Number(raw.seq)) && Number(raw.seq) >= 0 ? Number(raw.seq) : null;
  const recordedAt = raw.recorded_at && !Number.isNaN(Date.parse(raw.recorded_at)) ? new Date(raw.recorded_at).toISOString() : null;

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length
      ? null
      : {
          entry_type: entryType,
          scope,
          player_id: playerId,
          zone_id: zone.id,
          tags: rawTags,
          attempts,
          made,
          x_m: x,
          y_m: y,
          seq,
          recorded_at: recordedAt,
          client_entry_id: clientEntryId
        }
  };
}

// ---------------------------------------------------------------------------
// Agregados
// ---------------------------------------------------------------------------

function emptyLine() {
  return { attempts: 0, made: 0 };
}

function addTo(line, attempts, made) {
  line.attempts += attempts;
  line.made += made;
}

export function emptyZoneMap() {
  return Object.fromEntries(ALL_ZONES.map((z) => [z.id, emptyLine()]));
}

/** Solo registros vigentes (no anulados con «deshacer»). */
export function activeEntries(entries) {
  return (entries || []).filter((e) => e && !e.voided_at);
}

function matchesTags(entry, tagFilter) {
  if (!tagFilter || !tagFilter.length) return true;
  const tags = entry.tags || [];
  return tagFilter.every((t) => tags.includes(t));
}

/**
 * Resume registros: por zona, tiros de campo (sin libres), libres, dobles y triples.
 * filter: { playerId?: string|null ('collective' para solo colectivos), tags?: string[], zones?: string[] }
 */
export function summarizeEntries(entries, filter = {}) {
  const byZone = emptyZoneMap();
  const fg = emptyLine();
  const ft = emptyLine();
  const two = emptyLine();
  const three = emptyLine();
  let shots = 0;
  let series = 0;

  activeEntries(entries).forEach((e) => {
    if (filter.playerId === "collective" && e.player_id) return;
    if (filter.playerId && filter.playerId !== "collective" && e.player_id !== filter.playerId) return;
    if (!matchesTags(e, filter.tags)) return;
    if (filter.zones && filter.zones.length && !filter.zones.includes(e.zone_id)) return;
    const zone = zoneById(e.zone_id);
    if (!zone) return;
    const attempts = toCount(e.attempts);
    const made = Math.min(toCount(e.made), attempts);
    addTo(byZone[zone.id], attempts, made);
    if (zone.id === "ft") addTo(ft, attempts, made);
    else {
      addTo(fg, attempts, made);
      addTo(zone.points === 3 ? three : two, attempts, made);
    }
    if (e.entry_type === "series") series += 1;
    else shots += 1;
  });

  return { byZone, fg, ft, two, three, shots, series };
}

/** Resultado de cada participante + colectivos + total del grupo. */
export function summarizeSession(entries, participantIds = []) {
  const perPlayer = {};
  participantIds.forEach((pid) => {
    perPlayer[pid] = summarizeEntries(entries, { playerId: pid });
  });
  return {
    perPlayer,
    collective: summarizeEntries(entries, { playerId: "collective" }),
    group: summarizeEntries(entries)
  };
}

/**
 * Racha más larga de aciertos consecutivos.
 * Solo con lanzamientos individuales ordenados; null si no hay orden confiable.
 */
export function longestMadeStreak(entries, playerId) {
  const shots = activeEntries(entries)
    .filter((e) => e.entry_type === "shot" && e.zone_id !== "ft" && (!playerId || e.player_id === playerId))
    .filter((e) => Number.isInteger(e.seq));
  if (!shots.length) return null;
  shots.sort((a, b) => a.seq - b.seq);
  let best = 0;
  let run = 0;
  shots.forEach((e) => {
    run = e.made ? run + 1 : 0;
    if (run > best) best = run;
  });
  return best;
}

/** Zonas históricas sin inventar nada: lo que no está, queda en 0. */
export function legacyZonesToMap(zones) {
  const map = emptyZoneMap();
  const src = zones && typeof zones === "object" ? zones : {};
  LEGACY_ZONE_IDS.forEach((id) => {
    const z = src[id];
    const attempts = toCount(z?.attempts);
    map[id] = { attempts, made: Math.min(toCount(z?.made), attempts) };
  });
  return map;
}

export function summarizeZoneMap(byZone) {
  const fg = emptyLine();
  const ft = emptyLine();
  const two = emptyLine();
  const three = emptyLine();
  Object.entries(byZone || {}).forEach(([id, line]) => {
    const zone = zoneById(id);
    if (!zone) return;
    if (id === "ft") addTo(ft, line.attempts, line.made);
    else {
      addTo(fg, line.attempts, line.made);
      addTo(zone.points === 3 ? three : two, line.attempts, line.made);
    }
  });
  return { byZone, fg, ft, two, three };
}

/** Resumen derivado que se guarda en shooting_sessions.zones para las pantallas viejas. */
export function zonesCacheFromEntries(entries) {
  const { byZone } = summarizeEntries(entries);
  const out = {};
  LEGACY_ZONE_IDS.forEach((id) => {
    out[id] = { attempts: byZone[id].attempts, made: byZone[id].made };
  });
  // «Cerca del aro» cae dentro de la pintura en la cancha vieja de 9 zonas.
  out.paint = {
    attempts: byZone.paint.attempts + byZone.rim.attempts,
    made: byZone.paint.made + byZone.rim.made
  };
  return out;
}

// ---------------------------------------------------------------------------
// Procedencia de los datos
// ---------------------------------------------------------------------------

export const PROVENANCE = {
  entries: { label: "Registros individuales", short: "Individual" },
  legacy_single: { label: "Histórico de sesión con un solo participante", short: "Histórico (1 jugador)" },
  legacy_group: { label: "Grupal histórico sin atribución individual", short: "Grupal sin atribución" },
  legacy_empty: { label: "Histórico sin participantes", short: "Sin participantes" }
};

/** Clasifica una sesión según de dónde vienen sus números. */
export function sessionProvenance(session) {
  if (session?.recording_mode === "entries") return "entries";
  const n = Array.isArray(session?.player_ids) ? session.player_ids.length : 0;
  if (n === 0) return "legacy_empty";
  if (n === 1) return "legacy_single";
  return "legacy_group";
}

// ---------------------------------------------------------------------------
// Evolución temporal y comparación de períodos
// ---------------------------------------------------------------------------

/**
 * Serie por fecha de sesión. sessions: [{ fecha, fg:{attempts,made} }]
 * Devuelve [{ fecha, attempts, made, pct }] ordenado por fecha.
 */
export function timelineByDate(points) {
  const byDate = {};
  (points || []).forEach((p) => {
    if (!p?.fecha) return;
    const key = String(p.fecha).slice(0, 10);
    byDate[key] = byDate[key] || emptyLine();
    addTo(byDate[key], toCount(p.attempts), toCount(p.made));
  });
  return Object.keys(byDate)
    .sort()
    .map((fecha) => ({ fecha, ...byDate[fecha], pct: pct(byDate[fecha].made, byDate[fecha].attempts) }));
}

/** Diferencia por zona entre dos resúmenes (B − A), solo donde ambos tienen muestra. */
export function compareZoneMaps(mapA, mapB, minSample = DEFAULT_MIN_SAMPLE) {
  return ALL_ZONES.map((z) => {
    const a = mapA?.[z.id] || emptyLine();
    const b = mapB?.[z.id] || emptyLine();
    const pa = pct(a.made, a.attempts);
    const pb = pct(b.made, b.attempts);
    const comparable = a.attempts >= minSample && b.attempts >= minSample;
    return {
      zone: z,
      a,
      b,
      pctA: pa,
      pctB: pb,
      deltaPct: comparable ? pb - pa : null,
      deltaVolume: b.attempts - a.attempts,
      comparable
    };
  });
}

// ---------------------------------------------------------------------------
// Plan de tiro sugerido (evolución de generateWorkoutPlan del módulo anterior)
// ---------------------------------------------------------------------------

/**
 * Reparte un total de lanzamientos entre zonas según la muestra y la efectividad.
 * - Sin datos o con muestra insuficiente: se sugiere ampliar la muestra, nunca «zona débil».
 * - Con muestra suficiente: más volumen donde la efectividad está por debajo de la referencia.
 * - Zonas vinculadas a objetivos del jugador reciben prioridad.
 *
 * options: { totalShots, minSample, thresholds, goalZones: string[], includeFreeThrows, zones: string[] }
 * Devuelve { items: [{ zone, shots, reason, reasonLabel, sample }], totalShots, notes }
 */
export function suggestShootingPlan(byZone, options = {}) {
  const totalShots = Math.max(10, Math.min(500, Math.floor(Number(options.totalShots) || 60)));
  const minSample = Math.max(1, Math.floor(Number(options.minSample) || DEFAULT_MIN_SAMPLE));
  const thresholds = options.thresholds || DEFAULT_THRESHOLDS;
  const goalZones = new Set(options.goalZones || []);
  const zoneIds = options.zones && options.zones.length
    ? options.zones
    : ALL_ZONES.filter((z) => z.id !== "ft" || options.includeFreeThrows).map((z) => z.id);

  const REASONS = {
    goal: "Vinculada a un objetivo",
    no_data: "Sin registros: conviene medir",
    small_sample: "Muestra insuficiente: ampliar",
    below: "Por debajo de la referencia",
    around: "Cerca de la referencia",
    above: "Por encima de la referencia: mantenimiento"
  };

  const rows = zoneIds
    .map((id) => zoneById(id))
    .filter(Boolean)
    .map((zone) => {
      const line = byZone?.[zone.id] || emptyLine();
      let reason;
      let weight;
      if (line.attempts === 0) {
        reason = "no_data";
        weight = 12;
      } else if (line.attempts < minSample) {
        reason = "small_sample";
        weight = 12;
      } else {
        const band = colorBand(line.made, line.attempts, thresholds);
        reason = band === "low" ? "below" : band === "mid" ? "around" : "above";
        weight = band === "low" ? 16 : band === "mid" ? 10 : 6;
      }
      if (goalZones.has(zone.id)) {
        weight *= 2;
      }
      return { zone, weight, reason, goal: goalZones.has(zone.id), sample: line };
    });

  const sum = rows.reduce((acc, r) => acc + r.weight, 0) || 1;
  let assigned = 0;
  rows.forEach((r) => {
    r.shots = Math.max(1, Math.floor((totalShots * r.weight) / sum));
    assigned += r.shots;
  });
  // Reparte el resto empezando por las zonas de mayor peso.
  const order = [...rows].sort((a, b) => b.weight - a.weight);
  let i = 0;
  while (assigned < totalShots && order.length) {
    order[i % order.length].shots += 1;
    assigned += 1;
    i += 1;
  }
  while (assigned > totalShots) {
    const r = order.find((x) => x.shots > 1);
    if (!r) break;
    r.shots -= 1;
    assigned -= 1;
  }

  const items = rows.map((r) => ({
    zone: r.zone,
    shots: r.shots,
    reason: r.reason,
    reasonLabel: r.goal ? `${REASONS.goal} · ${REASONS[r.reason]}` : REASONS[r.reason],
    goal: r.goal,
    sample: r.sample
  }));

  const notes = [];
  if (rows.every((r) => r.reason === "no_data" || r.reason === "small_sample")) {
    notes.push(`Todavía no hay ${minSample} intentos en ninguna zona: el plan prioriza medir, no corregir.`);
  }
  return { items, totalShots: assigned, minSample, notes };
}
