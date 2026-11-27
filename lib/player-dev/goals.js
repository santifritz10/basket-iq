/**
 * Objetivos medibles, notas clasificadas y comparación entre jugadores.
 * Funciones puras: calculan todo desde los registros originales
 * (registros de tiro, estadísticas, evaluaciones y mediciones manuales),
 * nunca desde textos del registro de actividad.
 */
import {
  FIELD_ZONES,
  emptyZoneMap,
  legacyZonesToMap,
  summarizeEntries,
  summarizeZoneMap,
  zoneById
} from "../shooting/model.js";
import { STAT_FIELDS } from "./catalog.js";
import { isUuid } from "./model.js";

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

export const GOAL_TYPES = [
  { id: "technical", label: "Técnico" },
  { id: "tactical", label: "Táctico" },
  { id: "statistical", label: "Estadístico" },
  { id: "volume", label: "Volumen de entrenamiento" },
  { id: "consistency", label: "Constancia" },
  { id: "competitive", label: "Rendimiento competitivo" },
  { id: "qualitative", label: "Cualitativo" }
];

export const PRIORITIES = [
  { id: "high", label: "Alta" },
  { id: "medium", label: "Media" },
  { id: "low", label: "Baja" }
];

export const NOTE_TYPES = [
  { id: "technical", label: "Técnica" },
  { id: "tactical", label: "Táctica" },
  { id: "training", label: "Entrenamiento" },
  { id: "match", label: "Partido" },
  { id: "attitude", label: "Actitud deportiva" },
  { id: "goals", label: "Objetivos" },
  { id: "general", label: "Observación general" }
];

export const NOTE_LINKS = [
  { id: "assessment", label: "Evaluación" },
  { id: "shooting_session", label: "Sesión de tiro" },
  { id: "goal", label: "Objetivo" },
  { id: "stat_record", label: "Partido / registro" }
];

/**
 * Métricas que se calculan solas con datos reales.
 * kind: pct (convertidos/intentos, muestra = intentos), count (suma en el período),
 *       avg (promedio por partido, muestra = partidos), rating (última evaluación), manual.
 */
const BASE_METRICS = [
  { key: "shoot.fg_pct", label: "% de campo en entrenamiento", group: "Lanzamiento (entrenamiento)", kind: "pct", unit: "%", comparison: "gte", minSample: 50 },
  { key: "shoot.two_pct", label: "% de dobles en entrenamiento", group: "Lanzamiento (entrenamiento)", kind: "pct", unit: "%", comparison: "gte", minSample: 50 },
  { key: "shoot.three_pct", label: "% de triples en entrenamiento", group: "Lanzamiento (entrenamiento)", kind: "pct", unit: "%", comparison: "gte", minSample: 50 },
  { key: "shoot.ft_pct", label: "% de libres en entrenamiento", group: "Lanzamiento (entrenamiento)", kind: "pct", unit: "%", comparison: "gte", minSample: 30 },
  { key: "shoot.sessions", label: "Sesiones de tiro realizadas", group: "Volumen y constancia", kind: "count", unit: "sesiones", comparison: "gte", minSample: 0 },
  { key: "shoot.attempts", label: "Lanzamientos realizados", group: "Volumen y constancia", kind: "count", unit: "tiros", comparison: "gte", minSample: 0 },
  { key: "shoot.weeks_active", label: "Semanas con al menos una sesión", group: "Volumen y constancia", kind: "count", unit: "semanas", comparison: "gte", minSample: 0 },
  { key: "match.points_avg", label: "Puntos por partido", group: "Partidos", kind: "avg", field: "points", unit: "pts", comparison: "gte", minSample: 3 },
  { key: "match.assists_avg", label: "Asistencias por partido", group: "Partidos", kind: "avg", field: "assists", unit: "ast", comparison: "gte", minSample: 3 },
  { key: "match.reb_avg", label: "Rebotes por partido", group: "Partidos", kind: "avg", field: "reb", unit: "reb", comparison: "gte", minSample: 3 },
  { key: "match.steals_avg", label: "Recuperos por partido", group: "Partidos", kind: "avg", field: "steals", unit: "rec", comparison: "gte", minSample: 3 },
  { key: "match.turnovers_avg", label: "Pérdidas por partido", group: "Partidos", kind: "avg", field: "turnovers", unit: "pérd", comparison: "lte", minSample: 3 },
  { key: "match.fg_pct", label: "% de campo en partidos", group: "Partidos", kind: "pct", unit: "%", comparison: "gte", minSample: 30 },
  { key: "match.three_pct", label: "% de triples en partidos", group: "Partidos", kind: "pct", unit: "%", comparison: "gte", minSample: 20 },
  { key: "match.ft_pct", label: "% de libres en partidos", group: "Partidos", kind: "pct", unit: "%", comparison: "gte", minSample: 20 },
  { key: "manual", label: "Medición manual", group: "Manual", kind: "manual", unit: "", comparison: "gte", minSample: 0 }
];

/** Catálogo completo: base + % por zona + cada criterio de evaluación disponible. */
export function metricCatalog(criteria = []) {
  const zones = FIELD_ZONES.map((z) => ({
    key: `shoot.zone_pct:${z.id}`,
    label: `% en ${z.label.toLowerCase()} (entrenamiento)`,
    group: "Lanzamiento por zona",
    kind: "pct",
    unit: "%",
    comparison: "gte",
    minSample: 30
  }));
  const assess = (criteria || []).map((c) => ({
    key: `assess:${c.key}`,
    label: `Evaluación: ${c.label}`,
    group: "Evaluación técnica",
    kind: "rating",
    unit: `/${c.scale_max}`,
    scaleMax: c.scale_max,
    comparison: "gte",
    minSample: 0
  }));
  return [...BASE_METRICS, ...zones, ...assess];
}

export function metricByKey(key, criteria = []) {
  return metricCatalog(criteria).find((m) => m.key === key) || null;
}

export const labelOf = (list, id) => list.find((x) => x.id === id)?.label || id;

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => (v === "" || v == null ? null : Number(v));

function text(v, max) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/** Objetivo estructurado. `body` queda como descripción para las pantallas viejas. */
export function validateGoalInput(input, criteria = [], { partial = false } = {}) {
  const errors = [];
  const v = {};
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(input || {}, k);
  const src = input || {};

  if (has("title")) {
    v.title = text(src.title, 160);
    if (!v.title) errors.push("Escribí un título para el objetivo.");
  }
  if (has("description") || (!partial && has("title"))) {
    v.body = text(src.description, 2000) || v.title || null;
  }
  if (has("goal_type")) {
    v.goal_type = src.goal_type || "qualitative";
    if (!GOAL_TYPES.some((t) => t.id === v.goal_type)) errors.push("Tipo de objetivo inválido.");
  }
  if (has("priority")) {
    v.priority = src.priority || "medium";
    if (!PRIORITIES.some((p) => p.id === v.priority)) errors.push("Prioridad inválida.");
  }
  if (has("metric_key")) {
    v.metric_key = src.metric_key || null;
    if (v.metric_key) {
      const m = metricByKey(v.metric_key, criteria);
      if (!m) errors.push("La métrica elegida no existe.");
      else {
        v.data_source = m.kind === "manual" ? "manual" : "auto";
        v.comparison = src.comparison === "lte" || src.comparison === "gte" ? src.comparison : m.comparison;
        v.unit = text(src.unit, 20) ?? m.unit ?? null;
        v.min_sample = src.min_sample === "" || src.min_sample == null ? m.minSample : Number(src.min_sample);
        if (!Number.isInteger(v.min_sample) || v.min_sample < 0 || v.min_sample > 100000) errors.push("La muestra mínima tiene que ser un número entero.");
      }
    } else {
      Object.assign(v, { data_source: "manual", comparison: null, unit: null, min_sample: null });
    }
  }
  ["baseline_value", "target_value"].forEach((k) => {
    if (!has(k)) return;
    v[k] = num(src[k]);
    if (v[k] != null && (!Number.isFinite(v[k]) || Math.abs(v[k]) >= 1e8)) errors.push("Los valores tienen que ser números.");
  });
  if (!partial && v.metric_key && v.target_value == null) errors.push("Indicá la meta (valor objetivo).");
  ["start_on", "due_on"].forEach((k) => {
    if (!has(k)) return;
    v[k] = src[k] || null;
    if (v[k] && !ISO.test(v[k])) errors.push("Fecha inválida.");
  });
  if (v.start_on && v.due_on && v.due_on < v.start_on) errors.push("La fecha límite no puede ser anterior al inicio.");
  if (has("observations")) v.observations = text(src.observations, 2000);
  if (has("responsible_user_id")) {
    v.responsible_user_id = src.responsible_user_id || null;
    if (v.responsible_user_id && !isUuid(v.responsible_user_id)) errors.push("Responsable inválido.");
  }
  return { ok: errors.length === 0, errors, value: v };
}

export function validateCheckin(input, today) {
  const errors = [];
  const measured_on = input?.measured_on || today;
  if (!ISO.test(measured_on)) errors.push("Fecha inválida.");
  else if (today && measured_on > today) errors.push("La medición no puede tener fecha futura.");
  const value = num(input?.value);
  if (value != null && !Number.isFinite(value)) errors.push("El valor tiene que ser un número.");
  const note = text(input?.note, 2000);
  if (value == null && !note) errors.push("Cargá un valor o una observación.");
  return { ok: errors.length === 0, errors, value: { measured_on, value, note } };
}

export function validateNoteInput(input, { partial = false } = {}) {
  const errors = [];
  const v = {};
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(input || {}, k);
  const src = input || {};
  if (has("body")) {
    v.body = text(src.body, 4000);
    if (!v.body) errors.push("La nota está vacía.");
  }
  if (has("note_type")) {
    v.note_type = src.note_type || "general";
    if (!NOTE_TYPES.some((t) => t.id === v.note_type)) errors.push("Tipo de nota inválido.");
  }
  if (has("visibility")) {
    v.visibility = src.visibility || "collaborators";
    if (!["collaborators", "private"].includes(v.visibility)) errors.push("Visibilidad inválida.");
  }
  if (has("linked_type") || has("linked_id")) {
    v.linked_type = src.linked_type || null;
    v.linked_id = src.linked_id ? String(src.linked_id).slice(0, 80) : null;
    if (!v.linked_type) v.linked_id = null;
    else if (!NOTE_LINKS.some((l) => l.id === v.linked_type) || !v.linked_id) errors.push("Vínculo inválido.");
  }
  if (has("related_on")) {
    v.related_on = src.related_on || null;
    if (v.related_on && !ISO.test(v.related_on)) errors.push("Fecha inválida.");
  }
  return { ok: errors.length === 0, errors, value: v };
}

/** Lo que ve un usuario: las notas privadas solo para quien las escribió. */
export function visibleNotes(notes, userId) {
  return (notes || []).filter((n) => n.visibility !== "private" || n.created_by_user_id === userId);
}

export function filterNotes(notes, { type = "", q = "", linked = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  return (notes || []).filter((n) => {
    if (type && (n.note_type || "general") !== type) return false;
    if (linked && n.linked_type !== linked) return false;
    if (needle && !String(n.body || "").toLowerCase().includes(needle)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Datos del jugador por fecha
// ---------------------------------------------------------------------------

/**
 * Sesiones de tiro con datos propios del jugador: registros a su nombre o
 * sesiones históricas en las que estuvo solo. Las grupales históricas se excluyen.
 */
export function shootingDays(profile) {
  const bySession = {};
  (profile.entries || []).forEach((e) => (bySession[e.session_id] = bySession[e.session_id] || []).push(e));
  const out = [];
  (profile.sessions || []).forEach((s) => {
    if (s.status === "archived" || s.status === "draft") return;
    let map = null;
    if (s.recording_mode === "entries") map = summarizeEntries(bySession[s.id] || []).byZone;
    else if (s.provenance === "legacy_single") map = legacyZonesToMap(s.legacy_zones);
    if (!map) return;
    const t = summarizeZoneMap(map);
    if (!t.fg.attempts && !t.ft.attempts) return;
    out.push({ date: String(s.fecha).slice(0, 10), sessionId: s.id, map });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function inPeriod(date, from, to) {
  const d = String(date || "").slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

function mergeMaps(days) {
  const byZone = emptyZoneMap();
  days.forEach((d) =>
    Object.keys(byZone).forEach((z) => {
      byZone[z].attempts += d.map[z]?.attempts || 0;
      byZone[z].made += d.map[z]?.made || 0;
    })
  );
  return summarizeZoneMap(byZone);
}

function isoWeek(date) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function shootLine(totals, key) {
  if (key === "shoot.fg_pct") return totals.fg;
  if (key === "shoot.two_pct") return totals.two;
  if (key === "shoot.three_pct") return totals.three;
  if (key === "shoot.ft_pct") return totals.ft;
  if (key.startsWith("shoot.zone_pct:")) return totals.byZone[key.split(":")[1]] || { attempts: 0, made: 0 };
  return { attempts: 0, made: 0 };
}

const round1 = (n) => Math.round(n * 10) / 10;
const matchLine = (r, key) => {
  const pairs = { "match.three_pct": [["fg3_made", "fg3_att"]], "match.ft_pct": [["ft_made", "ft_att"]], "match.fg_pct": [["fg2_made", "fg2_att"], ["fg3_made", "fg3_att"]] }[key];
  let made = 0;
  let attempts = 0;
  let has = false;
  pairs.forEach(([m, a]) => {
    if (r[m] != null && r[a] != null) {
      made += Number(r[m]);
      attempts += Number(r[a]);
      has = true;
    }
  });
  return has ? { made, attempts } : null;
};
const matchValue = (r, field) => (field === "reb" ? (r.oreb == null && r.dreb == null ? null : (r.oreb || 0) + (r.dreb || 0)) : r[field] == null ? null : Number(r[field]));

/**
 * Valor de una métrica en un período, con su serie acumulada por fecha.
 * Devuelve { value, sample, sampleUnit, series:[{date,value}], evidence:[texto] }.
 */
export function measureMetric(metric, profile, { from = null, to = null, days = null } = {}) {
  const res = { value: null, sample: 0, sampleUnit: "", series: [], evidence: [] };
  if (!metric) return res;
  const key = metric.key;

  if (key.startsWith("shoot.")) {
    const list = (days || shootingDays(profile)).filter((d) => inPeriod(d.date, from, to));
    if (metric.kind === "pct") {
      res.sampleUnit = "intentos";
      const acc = { attempts: 0, made: 0 };
      const byDate = {};
      list.forEach((d) => {
        const l = shootLine(summarizeZoneMap(d.map), key);
        acc.attempts += l.attempts;
        acc.made += l.made;
        if (l.attempts) byDate[d.date] = { ...acc };
      });
      res.sample = acc.attempts;
      if (acc.attempts) res.value = round1((acc.made / acc.attempts) * 100);
      res.series = Object.entries(byDate).map(([date, a]) => ({ date, value: round1((a.made / a.attempts) * 100), sample: a.attempts }));
      res.evidence.push(`${acc.made}/${acc.attempts} en ${Object.keys(byDate).length} sesión(es) con tiros propios`);
    } else if (key === "shoot.sessions") {
      const ids = new Set();
      list.forEach((d) => {
        ids.add(d.sessionId);
        res.series.push({ date: d.date, value: ids.size });
      });
      res.value = ids.size;
      res.sample = ids.size;
      res.sampleUnit = "sesiones";
      res.evidence.push(`${ids.size} sesión(es) con tiros propios`);
    } else if (key === "shoot.attempts") {
      let total = 0;
      list.forEach((d) => {
        const t = summarizeZoneMap(d.map);
        total += t.fg.attempts + t.ft.attempts;
        res.series.push({ date: d.date, value: total });
      });
      res.value = total;
      res.sample = list.length;
      res.sampleUnit = "sesiones";
      res.evidence.push(`${total} lanzamientos en ${list.length} sesión(es)`);
    } else if (key === "shoot.weeks_active") {
      const weeks = new Set();
      list.forEach((d) => {
        weeks.add(isoWeek(d.date));
        res.series.push({ date: d.date, value: weeks.size });
      });
      res.value = weeks.size;
      res.sample = list.length;
      res.sampleUnit = "sesiones";
      res.evidence.push(`${weeks.size} semana(s) con sesiones`);
    }
    return res;
  }

  if (key.startsWith("match.")) {
    const games = (profile.stats || [])
      .filter((r) => !r.voided_at && r.record_type === "match" && inPeriod(r.played_on, from, to))
      .sort((a, b) => String(a.played_on).localeCompare(String(b.played_on)));
    if (metric.kind === "avg") {
      let sum = 0;
      let n = 0;
      games.forEach((g) => {
        const v = matchValue(g, metric.field);
        if (v == null) return;
        sum += v;
        n += 1;
        res.series.push({ date: g.played_on, value: round1(sum / n), sample: n });
      });
      res.sample = n;
      res.sampleUnit = "partidos";
      if (n) res.value = round1(sum / n);
      res.evidence.push(`${n} partido(s) con el dato cargado`);
    } else {
      const acc = { attempts: 0, made: 0 };
      games.forEach((g) => {
        const l = matchLine(g, key);
        if (!l) return;
        acc.attempts += l.attempts;
        acc.made += l.made;
        if (acc.attempts) res.series.push({ date: g.played_on, value: round1((acc.made / acc.attempts) * 100), sample: acc.attempts });
      });
      res.sample = acc.attempts;
      res.sampleUnit = "intentos";
      if (acc.attempts) res.value = round1((acc.made / acc.attempts) * 100);
      res.evidence.push(`${acc.made}/${acc.attempts} en partidos`);
    }
    return res;
  }

  if (key.startsWith("assess:")) {
    const ck = key.slice(7);
    const rows = (profile.assessments || [])
      .filter((a) => !a.voided_at && a.criterion_key === ck && inPeriod(a.assessed_on, from, to))
      .sort((a, b) => String(a.assessed_on).localeCompare(String(b.assessed_on)));
    rows.forEach((a) => res.series.push({ date: a.assessed_on, value: Number(a.value) }));
    res.sample = rows.length;
    res.sampleUnit = "evaluaciones";
    if (rows.length) res.value = Number(rows[rows.length - 1].value);
    res.evidence.push(`${rows.length} evaluación(es) de este criterio`);
    return res;
  }

  return res;
}

/** Período de un objetivo: desde el inicio (o su creación) hasta hoy o la fecha límite. */
export function goalPeriod(goal, today) {
  const from = goal.start_on || String(goal.created_at || "").slice(0, 10) || null;
  const to = goal.due_on && goal.due_on < today ? goal.due_on : today;
  return { from, to };
}

export function isStructured(goal) {
  return Boolean(goal && (goal.goal_type || goal.metric_key || goal.title));
}

/**
 * Estado medido de un objetivo.
 * reached: la meta se cumple CON muestra suficiente (si no, se informa como "muestra insuficiente").
 * El objetivo no se marca cumplido solo: el entrenador lo confirma.
 */
export function measureGoal(goal, profile, { today, criteria = [], days = null } = {}) {
  const metric = goal.metric_key ? metricByKey(goal.metric_key, criteria) : null;
  const period = goalPeriod(goal, today);
  const checkins = (profile.checkins || [])
    .filter((c) => c.goal_id === goal.id && !c.voided_at)
    .sort((a, b) => String(a.measured_on).localeCompare(String(b.measured_on)));
  let m;
  if (metric && metric.kind !== "manual") {
    m = measureMetric(metric, profile, { ...period, days });
  } else {
    const withValue = checkins.filter((c) => c.value != null);
    m = {
      value: withValue.length ? Number(withValue[withValue.length - 1].value) : null,
      sample: withValue.length,
      sampleUnit: "mediciones",
      series: withValue.map((c) => ({ date: c.measured_on, value: Number(c.value) })),
      evidence: withValue.length ? [`${withValue.length} medición(es) manual(es)`] : []
    };
  }
  const minSample = goal.min_sample ?? metric?.minSample ?? 0;
  const enough = m.sample >= minSample && m.value != null;
  const cmp = goal.comparison || metric?.comparison || "gte";
  const target = goal.target_value == null ? null : Number(goal.target_value);
  const base = goal.baseline_value == null ? null : Number(goal.baseline_value);
  let progress = null;
  if (target != null && m.value != null) {
    if (base != null && base !== target) {
      progress = (m.value - base) / (target - base);
    } else {
      progress = cmp === "lte" ? (m.value <= target ? 1 : target / m.value) : target ? m.value / target : null;
    }
    if (progress != null) progress = Math.max(0, Math.min(1, progress));
  }
  const meets = target != null && m.value != null && (cmp === "lte" ? m.value <= target : m.value >= target);
  const overdue = Boolean(goal.due_on && goal.due_on < today && goal.status === "active");
  return {
    metric,
    period,
    value: m.value,
    sample: m.sample,
    sampleUnit: m.sampleUnit,
    minSample,
    enough,
    progress,
    meets,
    reached: meets && enough,
    overdue,
    comparison: cmp,
    series: m.series,
    evidence: m.evidence,
    checkins
  };
}

export function formatValue(value, unit) {
  if (value == null) return "—";
  const n = Number(value).toLocaleString("es-AR", { maximumFractionDigits: 1 });
  if (!unit) return n;
  if (unit === "%") return `${n}%`;
  if (unit.startsWith("/")) return `${n}${unit}`;
  return `${n} ${unit}`;
}

// ---------------------------------------------------------------------------
// Comparación entre jugadores (mismo período y mismas métricas para todos)
// ---------------------------------------------------------------------------

export const COMPARE_ROWS = [
  { key: "shoot.sessions", section: "Volumen de entrenamiento" },
  { key: "shoot.attempts", section: "Volumen de entrenamiento" },
  { key: "shoot.fg_pct", section: "Lanzamiento en entrenamiento" },
  { key: "shoot.three_pct", section: "Lanzamiento en entrenamiento" },
  { key: "shoot.ft_pct", section: "Lanzamiento en entrenamiento" },
  { key: "match.points_avg", section: "Partidos" },
  { key: "match.assists_avg", section: "Partidos" },
  { key: "match.reb_avg", section: "Partidos" },
  { key: "match.turnovers_avg", section: "Partidos" },
  { key: "match.fg_pct", section: "Partidos" }
];

export function comparePlayers(profiles, { from = null, to = null, minSampleOverride = null, dimensionSummaryFn = null } = {}) {
  return profiles.map((p) => {
    const days = shootingDays(p);
    const metrics = {};
    COMPARE_ROWS.forEach((row) => {
      const metric = metricByKey(row.key);
      const m = measureMetric(metric, p, { from, to, days });
      const min = minSampleOverride ?? metric.minSample;
      metrics[row.key] = { value: m.value, sample: m.sample, sampleUnit: m.sampleUnit, enough: metric.kind === "count" || m.sample >= min, minSample: min };
    });
    const goals = p.goals || [];
    return {
      player: p.player,
      metrics,
      technical: dimensionSummaryFn ? dimensionSummaryFn(p) : null,
      goals: {
        active: goals.filter((g) => g.status === "active").length,
        completed: goals.filter((g) => g.status === "completed").length
      },
      records: {
        sessions: days.filter((d) => inPeriod(d.date, from, to)).length,
        matches: (p.stats || []).filter((r) => r.record_type === "match" && !r.voided_at && inPeriod(r.played_on, from, to)).length,
        assessments: new Set((p.assessments || []).filter((a) => inPeriod(a.assessed_on, from, to)).map((a) => a.batch_id)).size
      }
    };
  });
}

// ---------------------------------------------------------------------------
// Evolución por períodos
// ---------------------------------------------------------------------------

/** Resumen de un período: volumen, lanzamiento por tipo y por zona, partidos. */
export function periodSummary(profile, { from = null, to = null, days = null } = {}) {
  const list = (days || shootingDays(profile)).filter((d) => inPeriod(d.date, from, to));
  const shooting = mergeMaps(list);
  const games = (profile.stats || []).filter((r) => !r.voided_at && r.record_type === "match" && inPeriod(r.played_on, from, to));
  const avg = (field) => {
    const vals = games.map((g) => matchValue(g, field)).filter((v) => v != null);
    return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  return {
    sessions: list.length,
    attempts: shooting.fg.attempts + shooting.ft.attempts,
    shooting,
    matches: games.length,
    matchAvg: Object.fromEntries(["points", "assists", "reb", "turnovers", "steals"].map((f) => [f, avg(f)]))
  };
}

/** Lanzamientos por semana (volumen): [{week, from, attempts, sessions}] */
export function weeklyVolume(days, { from = null, to = null } = {}) {
  const byWeek = {};
  days.filter((d) => inPeriod(d.date, from, to)).forEach((d) => {
    const w = isoWeek(d.date);
    const t = summarizeZoneMap(d.map);
    byWeek[w] = byWeek[w] || { week: w, from: d.date, attempts: 0, sessions: 0 };
    byWeek[w].attempts += t.fg.attempts + t.ft.attempts;
    byWeek[w].sessions += 1;
    if (d.date < byWeek[w].from) byWeek[w].from = d.date;
  });
  return Object.values(byWeek).sort((a, b) => a.week.localeCompare(b.week));
}

/** Evaluación técnica a lo largo del tiempo: puntaje por fundamento en cada evaluación. */
export function technicalTimeline(assessments, dimensions) {
  const byBatch = {};
  (assessments || []).filter((a) => !a.voided_at).forEach((a) => {
    const b = (byBatch[a.batch_id] = byBatch[a.batch_id] || { batch_id: a.batch_id, date: a.assessed_on, dims: {} });
    const d = (b.dims[a.dimension] = b.dims[a.dimension] || { sum: 0, n: 0 });
    d.sum += Number(a.value) / Number(a.scale_max);
    d.n += 1;
  });
  return Object.values(byBatch)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((b) => ({
      batch_id: b.batch_id,
      date: b.date,
      scores: Object.fromEntries(dimensions.map((dim) => [dim.id, b.dims[dim.id] ? Math.round((b.dims[dim.id].sum / b.dims[dim.id].n) * 100) : null]))
    }));
}

export { zoneById, STAT_FIELDS };
