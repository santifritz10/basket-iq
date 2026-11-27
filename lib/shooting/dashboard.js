/**
 * Shooting Lab — agregados del panel (puro, sin React ni red).
 * Reglas de honestidad de los datos:
 * - Una sesión grupal histórica NUNCA se atribuye a un jugador: en la vista por
 *   jugador se excluye y se informa cuántas quedaron afuera.
 * - Las sesiones históricas no tienen características ni tiros libres: si hay
 *   filtros de características, se excluyen (y se informa).
 * - Las sesiones archivadas no entran en el panel (sí en el historial).
 */
import { DEFAULT_MIN_SAMPLE, activeEntries, emptyZoneMap, legacyZonesToMap, summarizeEntries, summarizeZoneMap, timelineByDate } from "./model.js";

export const PERIODS = [
  { id: "30", label: "30 días", days: 30 },
  { id: "90", label: "90 días", days: 90 },
  { id: "365", label: "12 meses", days: 365 },
  { id: "all", label: "Todo", days: null }
];

export const SOURCES = [
  { id: "all", label: "Todo" },
  { id: "entries", label: "Registros nuevos" },
  { id: "legacy", label: "Histórico" }
];

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Rango [from, to] inclusive para un período; null = sin límite. */
export function periodRange(periodId, today) {
  const p = PERIODS.find((x) => x.id === periodId) || PERIODS[1];
  if (!p.days) return { from: null, to: today, previous: null };
  const from = addDays(today, -(p.days - 1));
  return { from, to: today, previous: { from: addDays(from, -p.days), to: addDays(from, -1) } };
}

function inRange(fecha, range) {
  const f = String(fecha || "").slice(0, 10);
  if (!f) return false;
  if (range.from && f < range.from) return false;
  if (range.to && f > range.to) return false;
  return true;
}

function addMaps(target, source) {
  Object.keys(target).forEach((id) => {
    target[id].attempts += source[id]?.attempts || 0;
    target[id].made += source[id]?.made || 0;
  });
}

/**
 * Qué cuenta y qué no para un jugador (o para todos) en un rango.
 * Devuelve { byZone, totals, shots, series, used: [{session, byZone, fg}], excluded: {groupLegacy, tagLegacy} }
 */
export function aggregate({ sessions, entries, playerId = null, range, source = "all", tags = [] }) {
  const byZone = emptyZoneMap();
  const used = [];
  const excluded = { groupLegacy: 0, tagLegacy: 0 };
  const entriesBySession = {};
  activeEntries(entries).forEach((e) => {
    (entriesBySession[e.session_id] = entriesBySession[e.session_id] || []).push(e);
  });
  let shots = 0;
  let series = 0;

  (sessions || []).forEach((s) => {
    if (s.status === "archived") return;
    if (!inRange(s.fecha, range)) return;
    if (playerId && !(s.player_ids || []).includes(playerId)) return;

    if (s.recording_mode === "entries") {
      if (source === "legacy") return;
      const sum = summarizeEntries(entriesBySession[s.id] || [], { playerId: playerId || undefined, tags });
      if (!sum.fg.attempts && !sum.ft.attempts) return;
      addMaps(byZone, sum.byZone);
      shots += sum.shots;
      series += sum.series;
      used.push({ session: s, byZone: sum.byZone, fg: sum.fg, ft: sum.ft });
      return;
    }

    if (source === "entries") return;
    if (playerId && s.provenance === "legacy_group") {
      excluded.groupLegacy += 1;
      return;
    }
    if (s.provenance === "legacy_empty") return;
    if (tags.length) {
      excluded.tagLegacy += 1;
      return;
    }
    const map = legacyZonesToMap(s.legacy_zones);
    const sum = summarizeZoneMap(map);
    if (!sum.fg.attempts) return;
    addMaps(byZone, map);
    used.push({ session: s, byZone: map, fg: sum.fg, ft: sum.ft });
  });

  const totals = summarizeZoneMap(byZone);
  return { byZone, totals, shots, series, used, excluded };
}

/** Panel completo: período actual, anterior y evolución por fecha. */
export function buildDashboard({ sessions, entries, playerId = null, periodId = "90", source = "all", tags = [], today }) {
  const range = periodRange(periodId, today);
  const current = aggregate({ sessions, entries, playerId, range, source, tags });
  const previous = range.previous ? aggregate({ sessions, entries, playerId, range: range.previous, source, tags }) : null;
  const timeline = timelineByDate(current.used.map((u) => ({ fecha: u.session.fecha, attempts: u.fg.attempts, made: u.fg.made })));
  const legacyUsed = current.used.filter((u) => u.session.recording_mode !== "entries").length;
  return { range, current, previous, timeline, legacyUsed };
}

/** Texto honesto para una diferencia de porcentaje entre períodos. */
export function deltaLabel(curr, prev, minSample = DEFAULT_MIN_SAMPLE) {
  if (!prev || !curr) return null;
  if (curr.attempts < minSample || prev.attempts < minSample) return "Muestra insuficiente para comparar";
  const d = (curr.made / curr.attempts - prev.made / prev.attempts) * 100;
  const r = Math.round(d * 10) / 10;
  if (r === 0) return "Igual que el período anterior";
  return `${r > 0 ? "+" : ""}${r.toLocaleString("es-AR")} pts vs. período anterior`;
}

/** Zonas vinculadas a objetivos de texto libre (heurística simple y visible). */
const GOAL_KEYWORDS = [
  { re: /libre/i, zones: ["ft"] },
  { re: /esquina/i, zones: ["t3_corner_l", "t3_corner_r"] },
  { re: /triple|tres puntos|3 ?pts?/i, zones: ["t3_corner_l", "t3_left45", "t3_front", "t3_right45", "t3_corner_r"] },
  { re: /media distancia|media/i, zones: ["mid_l", "mid_c", "mid_r"] },
  { re: /bandeja|finaliz|aro|lay ?up/i, zones: ["rim"] },
  { re: /pintura|poste/i, zones: ["paint"] }
];

export function goalZones(goals) {
  const out = new Set();
  const matched = [];
  (goals || []).forEach((g) => {
    const zones = new Set();
    GOAL_KEYWORDS.forEach((k) => {
      if (k.re.test(String(g.body || ""))) k.zones.forEach((z) => zones.add(z));
    });
    if (zones.size) {
      zones.forEach((z) => out.add(z));
      matched.push({ goal: g, zones: [...zones] });
    }
  });
  return { zones: [...out], matched };
}
