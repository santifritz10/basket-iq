/**
 * Perfil y seguimiento — lógica pura (sin red ni React).
 * Reglas: un criterio sin registro es "no evaluado" (nunca un valor supuesto);
 * los porcentajes se calculan con conversiones totales / intentos totales;
 * partido, entrenamiento e histórico manual nunca se mezclan.
 */
import { BUILTIN_CRITERIA, DIMENSIONS, DIMENSION_IDS, LEGACY_CRITERIA, STAT_FIELDS } from "./catalog.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => UUID_RE.test(String(v || ""));

function isDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !Number.isNaN(Date.parse(s));
}

function cleanText(v, max) {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
}

// ---------------------------------------------------------------------------
// Criterios
// ---------------------------------------------------------------------------

/** Une los criterios incluidos con los propios del entrenador (activos). */
export function criteriaCatalog(customCriteria = []) {
  const custom = (customCriteria || [])
    .filter((c) => c && c.active !== false && DIMENSION_IDS.includes(c.dimension))
    .map((c) => ({
      key: `custom:${c.id}`,
      dimension: c.dimension,
      label: c.label,
      description: c.description || null,
      scale_max: c.scale_max || 5,
      level_descriptions: c.level_descriptions || {},
      custom: true,
      id: c.id
    }));
  return [...BUILTIN_CRITERIA, ...custom];
}

export function validateCriterionInput(input) {
  const errors = [];
  const dimension = String(input?.dimension || "");
  if (!DIMENSION_IDS.includes(dimension)) errors.push("Elegí un fundamento.");
  const label = cleanText(input?.label, 80);
  if (!label) errors.push("Escribí el nombre del criterio.");
  const scale = Number(input?.scale_max ?? 5);
  if (!Number.isInteger(scale) || scale < 2 || scale > 10) errors.push("La escala tiene que ir de 2 a 10.");
  const levels = {};
  if (input?.level_descriptions && typeof input.level_descriptions === "object") {
    Object.entries(input.level_descriptions).forEach(([k, v]) => {
      const n = Number(k);
      const t = cleanText(v, 200);
      if (Number.isInteger(n) && n >= 1 && n <= scale && t) levels[n] = t;
    });
  }
  return {
    ok: !errors.length,
    errors,
    value: errors.length ? null : { dimension, label, description: cleanText(input?.description, 500), scale_max: scale, level_descriptions: levels }
  };
}

// ---------------------------------------------------------------------------
// Evaluaciones
// ---------------------------------------------------------------------------

/**
 * Valida una evaluación (varios criterios en un mismo momento).
 * input: { batch_id, assessed_on, context, notes, source?, items: [{ criterion_key, value, notes }] }
 * Los criterios que no vienen quedan "no evaluados".
 */
export function validateAssessmentInput(input, catalog) {
  const errors = [];
  const byKey = Object.fromEntries((catalog || []).map((c) => [c.key, c]));
  const batchId = String(input?.batch_id || "");
  if (!isUuid(batchId)) errors.push("Falta el identificador de la evaluación.");
  const assessedOn = String(input?.assessed_on || "").slice(0, 10);
  if (!isDate(assessedOn)) errors.push("Elegí la fecha de la evaluación.");
  const context = ["training", "match", "test", "observation", "other"].includes(input?.context) ? input.context : "training";
  const source = input?.source === "legacy_confirmed" ? "legacy_confirmed" : "manual";
  const generalNotes = cleanText(input?.notes, 2000);
  const items = Array.isArray(input?.items) ? input.items : [];
  const seen = new Set();
  const rows = [];
  items.forEach((it) => {
    const c = byKey[it?.criterion_key];
    if (!c) {
      errors.push("Hay un criterio desconocido.");
      return;
    }
    if (seen.has(c.key)) return;
    seen.add(c.key);
    if (it.value === null || it.value === undefined || it.value === "") return; // no evaluado
    const v = Number(it.value);
    if (!Number.isInteger(v) || v < 1 || v > c.scale_max) {
      errors.push(`${c.label}: el valor tiene que ser un entero de 1 a ${c.scale_max}.`);
      return;
    }
    if (source === "legacy_confirmed" && !c.legacy) {
      errors.push("Solo los criterios del sistema anterior se pueden confirmar.");
      return;
    }
    rows.push({
      dimension: c.dimension,
      criterion_key: c.key,
      criterion_label: c.label,
      scale_max: c.scale_max,
      value: v,
      notes: cleanText(it.notes, 2000)
    });
  });
  if (!errors.length && !rows.length) errors.push("Evaluá al menos un criterio.");
  return {
    ok: !errors.length,
    errors,
    value: errors.length ? null : { batch_id: batchId, assessed_on: assessedOn, context, source, notes: generalNotes, rows }
  };
}

export function activeAssessments(list) {
  return (list || []).filter((a) => a && !a.voided_at);
}

function newer(a, b) {
  if (a.assessed_on !== b.assessed_on) return a.assessed_on > b.assessed_on;
  return String(a.created_at || "") > String(b.created_at || "");
}

/** Último valor de cada criterio. */
export function latestByCriterion(assessments) {
  const out = {};
  activeAssessments(assessments).forEach((a) => {
    if (!out[a.criterion_key] || newer(a, out[a.criterion_key])) out[a.criterion_key] = a;
  });
  return out;
}

/** Evaluaciones agrupadas por momento, de la más nueva a la más vieja. */
export function assessmentBatches(assessments) {
  const map = {};
  activeAssessments(assessments).forEach((a) => {
    const b = (map[a.batch_id] = map[a.batch_id] || {
      batch_id: a.batch_id,
      assessed_on: a.assessed_on,
      context: a.context,
      source: a.source,
      evaluator_user_id: a.evaluator_user_id,
      created_at: a.created_at,
      notes: null,
      items: []
    });
    b.items.push(a);
  });
  return Object.values(map).sort((x, y) => (x.assessed_on === y.assessed_on ? String(y.created_at).localeCompare(String(x.created_at)) : y.assessed_on.localeCompare(x.assessed_on)));
}

/**
 * Resumen por fundamento con el último valor de cada criterio.
 * score: promedio de (valor / escala) en %, solo con criterios evaluados.
 */
export function dimensionSummary(assessments, catalog) {
  const latest = latestByCriterion(assessments);
  return DIMENSIONS.map((d) => {
    const criteria = (catalog || []).filter((c) => c.dimension === d.id);
    const evaluated = criteria.map((c) => latest[c.key]).filter(Boolean);
    // Criterios evaluados que ya no están en el catálogo (p. ej. uno propio desactivado).
    Object.values(latest).forEach((a) => {
      if (a.dimension === d.id && !criteria.some((c) => c.key === a.criterion_key)) evaluated.push(a);
    });
    const score = evaluated.length ? Math.round((evaluated.reduce((s, a) => s + a.value / a.scale_max, 0) / evaluated.length) * 100) : null;
    const lastDate = evaluated.reduce((m, a) => (a.assessed_on > m ? a.assessed_on : m), "");
    return { dimension: d, criteria, latest: evaluated, score, lastDate: lastDate || null, evaluated: evaluated.length > 0 };
  });
}

/** Valores de un criterio en el tiempo. */
export function criterionHistory(assessments, criterionKey) {
  return activeAssessments(assessments)
    .filter((a) => a.criterion_key === criterionKey)
    .sort((a, b) => (newer(a, b) ? 1 : -1))
    .map((a) => ({ fecha: a.assessed_on, value: a.value, scale_max: a.scale_max, context: a.context, notes: a.notes }));
}

/** Comparación entre dos evaluaciones (A más vieja, B más nueva). */
export function compareBatches(batchA, batchB) {
  const keys = new Set([...(batchA?.items || []), ...(batchB?.items || [])].map((i) => i.criterion_key));
  return [...keys].map((key) => {
    const a = batchA?.items.find((i) => i.criterion_key === key) || null;
    const b = batchB?.items.find((i) => i.criterion_key === key) || null;
    const ref = b || a;
    return {
      criterion_key: key,
      label: ref.criterion_label,
      dimension: ref.dimension,
      a: a ? a.value : null,
      b: b ? b.value : null,
      scale_max: ref.scale_max,
      delta: a && b && a.scale_max === b.scale_max ? b.value - a.value : null
    };
  });
}

/**
 * Estrellas del sistema anterior, sin fecha. Si todas valen 3 (el valor que
 * ponía el formulario al crear) se informan como "sin evidencia de evaluación".
 */
export function legacyFundamentalsView(fundamentals) {
  const f = fundamentals && typeof fundamentals === "object" ? fundamentals : {};
  const items = LEGACY_CRITERIA.map((c) => {
    const n = Number(f[c.key]);
    return { ...c, value: Number.isInteger(n) && n >= 1 && n <= 5 ? n : null };
  });
  const withValue = items.filter((i) => i.value != null);
  if (!withValue.length) return { status: "empty", items };
  if (withValue.every((i) => i.value === 3)) return { status: "default_only", items };
  return { status: "values", items };
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

/** Valida una planilla de partido o entrenamiento. */
export function validateStatRecord(input) {
  const errors = [];
  const type = input?.record_type === "training" ? "training" : input?.record_type === "match" ? "match" : null;
  if (!type) errors.push("Elegí si es partido o entrenamiento.");
  const playedOn = String(input?.played_on || "").slice(0, 10);
  if (!isDate(playedOn)) errors.push("Elegí la fecha.");
  const value = {
    record_type: type,
    played_on: playedOn,
    opponent: cleanText(input?.opponent, 120),
    competition: cleanText(input?.competition, 120),
    season: cleanText(input?.season, 40),
    notes: cleanText(input?.notes, 2000),
    client_record_id: isUuid(input?.client_record_id) ? String(input.client_record_id) : null
  };
  let any = false;
  STAT_FIELDS.forEach((f) => {
    const raw = input?.[f.key];
    if (raw === null || raw === undefined || raw === "") {
      value[f.key] = null;
      return;
    }
    const n = Number(raw);
    if (f.decimal ? !(Number.isFinite(n) && n >= 0 && n <= 999) : !(Number.isInteger(n) && n >= 0 && n <= 999)) {
      errors.push(`${f.label}: tiene que ser un número ${f.decimal ? "" : "entero "}de 0 a 999.`);
      return;
    }
    value[f.key] = f.decimal ? Math.round(n * 10) / 10 : n;
    any = true;
  });
  [["fg2_made", "fg2_att", "dobles"], ["fg3_made", "fg3_att", "triples"], ["ft_made", "ft_att", "libres"]].forEach(([m, a, name]) => {
    if ((value[m] == null) !== (value[a] == null)) errors.push(`En ${name} cargá convertidos e intentados (pueden ser 0).`);
    else if (value[m] != null && value[m] > value[a]) errors.push(`En ${name}, los convertidos no pueden superar los intentados.`);
  });
  if (!any && !errors.length) errors.push("Cargá al menos un dato.");
  return { ok: !errors.length, errors, value: errors.length ? null : value };
}

function line() {
  return { made: 0, att: 0 };
}

/**
 * Totales de un tipo de registro. Porcentaje = convertidos totales / intentados totales.
 * Promedios por registro solo con los registros que tienen ese dato.
 */
export function aggregateStats(records, type) {
  const list = (records || []).filter((r) => r && !r.voided_at && r.record_type === type);
  const totals = { count: list.length, fg2: line(), fg3: line(), ft: line(), fg: line() };
  const sums = {};
  const counts = {};
  list.forEach((r) => {
    [["fg2", "fg2_made", "fg2_att"], ["fg3", "fg3_made", "fg3_att"], ["ft", "ft_made", "ft_att"]].forEach(([k, m, a]) => {
      if (r[m] != null && r[a] != null) {
        totals[k].made += r[m];
        totals[k].att += r[a];
      }
    });
    STAT_FIELDS.forEach((f) => {
      if (r[f.key] != null) {
        sums[f.key] = (sums[f.key] || 0) + Number(r[f.key]);
        counts[f.key] = (counts[f.key] || 0) + 1;
      }
    });
    if (r.oreb != null || r.dreb != null) {
      sums.reb = (sums.reb || 0) + (r.oreb || 0) + (r.dreb || 0);
      counts.reb = (counts.reb || 0) + 1;
    }
  });
  totals.fg = { made: totals.fg2.made + totals.fg3.made, att: totals.fg2.att + totals.fg3.att };
  const averages = {};
  Object.keys(sums).forEach((k) => {
    averages[k] = Math.round((sums[k] / counts[k]) * 10) / 10;
  });
  return { ...totals, sums, counts, averages };
}

export function pctText(made, att) {
  if (!att) return "—";
  const p = Math.round((made / att) * 1000) / 10;
  return `${p.toLocaleString("es-AR")}%`;
}

// ---------------------------------------------------------------------------
// Equipos y categorías
// ---------------------------------------------------------------------------

export function normalizeLabel(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Propone equipos a partir de los textos libres de los jugadores del entrenador.
 * Nunca crea nada: devuelve grupos para confirmar. Si el mismo nombre aparece
 * escrito de formas distintas, lo marca como ambiguo para que el entrenador decida.
 * players: [{ id, team, category }]; activeTeamPlayerIds: Set de jugadores que ya tienen equipo.
 */
export function suggestTeams(players, activeTeamPlayerIds = new Set()) {
  const groups = {};
  (players || []).forEach((p) => {
    const team = String(p.team || "").trim();
    if (!team || activeTeamPlayerIds.has(p.id)) return;
    const category = String(p.category || "").trim();
    const key = `${normalizeLabel(team)}|${normalizeLabel(category)}`;
    const g = (groups[key] = groups[key] || { key, team, category, variants: new Set(), players: [] });
    g.variants.add(`${team}${category ? ` · ${category}` : ""}`);
    g.players.push(p.id);
  });
  return Object.values(groups)
    .map((g) => ({ key: g.key, team: g.team, category: g.category || null, players: g.players, variants: [...g.variants], ambiguous: g.variants.size > 1 }))
    .sort((a, b) => b.players.length - a.players.length || a.team.localeCompare(b.team, "es"));
}

export function validateTeamInput(input) {
  const errors = [];
  const name = cleanText(input?.name, 120);
  if (!name) errors.push("Escribí el nombre del equipo.");
  return {
    ok: !errors.length,
    errors,
    value: errors.length
      ? null
      : { name, category: cleanText(input?.category, 80), season: cleanText(input?.season, 40), club: cleanText(input?.club, 120) }
  };
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

export const ROSTER_SORTS = [
  { id: "name", label: "Nombre" },
  { id: "last_session", label: "Última sesión de tiro" },
  { id: "last_assessment", label: "Última evaluación" },
  { id: "goals", label: "Objetivos activos" }
];

/** Filtra y ordena el listado. filters: { q, team, category, position } */
export function filterRoster(items, filters = {}, sort = "name") {
  const q = normalizeLabel(filters.q);
  let list = (items || []).filter((p) => {
    if (q && !normalizeLabel(`${p.display_name} ${p.team || ""} ${p.category || ""} ${p.position || ""}`).includes(q)) return false;
    if (filters.team && normalizeLabel(p.teamLabel || p.team) !== normalizeLabel(filters.team)) return false;
    if (filters.category && normalizeLabel(p.category) !== normalizeLabel(filters.category)) return false;
    if (filters.position && normalizeLabel(p.position) !== normalizeLabel(filters.position)) return false;
    return true;
  });
  const byName = (a, b) => String(a.display_name).localeCompare(String(b.display_name), "es");
  const desc = (k) => (a, b) => String(b[k] || "").localeCompare(String(a[k] || "")) || byName(a, b);
  if (sort === "last_session") list = list.sort(desc("last_session_on"));
  else if (sort === "last_assessment") list = list.sort(desc("last_assessment_on"));
  else if (sort === "goals") list = list.sort((a, b) => (b.active_goals || 0) - (a.active_goals || 0) || byName(a, b));
  else list = list.sort(byName);
  return list;
}

/** Agrupa por equipo (o categoría); "Sin equipo" al final. */
export function groupRoster(items, by = "team") {
  const groups = {};
  (items || []).forEach((p) => {
    const label = by === "category" ? p.category || "" : p.teamLabel || p.team || "";
    const key = normalizeLabel(label) || "~";
    (groups[key] = groups[key] || { key, label: label || (by === "category" ? "Sin categoría" : "Sin equipo"), items: [] }).items.push(p);
  });
  return Object.values(groups).sort((a, b) => (a.key === "~" ? 1 : b.key === "~" ? -1 : a.label.localeCompare(b.label, "es")));
}
