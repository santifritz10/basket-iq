/**
 * Integración deportiva: rutinas, trabajo planificado por jugador y asistencia.
 * Funciones puras. Regla central: lo PLANIFICADO no es lo REALIZADO.
 * Ningún cálculo de objetivos usa estos ítems: solo se muestran como contexto.
 */
import { ALL_ZONES, suggestShootingPlan, zoneById } from "../shooting/model.js";
import { isUuid } from "./model.js";

export const PLAN_KINDS = [
  { id: "exercise", label: "Ejercicio de la biblioteca" },
  { id: "routine", label: "Rutina" },
  { id: "shooting_plan", label: "Plan de tiro sugerido" },
  { id: "custom", label: "Tarea propia" }
];

export const PLAN_STATUS = [
  { id: "planned", label: "Planificado" },
  { id: "done", label: "Realizado" },
  { id: "skipped", label: "No se hizo" },
  { id: "cancelled", label: "Cancelado" }
];

export const ATTENDANCE_STATUS = [
  { id: "present", label: "Presente" },
  { id: "partial", label: "Parcial" },
  { id: "absent", label: "Ausente" },
  { id: "excused", label: "Justificado" }
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const text = (v, max) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

// ---------------------------------------------------------------------------
// Planificador existente (solo lectura)
// ---------------------------------------------------------------------------

/** Entrenamientos del planificador (user_app_data "trainings"), normalizados y sin modificar. */
export function plannerTrainings(payload) {
  const list = Array.isArray(payload) ? payload : [];
  return list
    .filter((t) => t && t.id != null && String(t.id).length <= 80)
    .map((t) => ({
      ref: String(t.id),
      name: String(t.nombre || "Entrenamiento").slice(0, 120),
      date: ISO.test(String(t.fecha || "")) ? t.fecha : null,
      category: t.categoria ? String(t.categoria).slice(0, 60) : null,
      blocks: Array.isArray(t.bloques) ? t.bloques.length : 0,
      minutes: Array.isArray(t.bloques) ? t.bloques.reduce((a, b) => a + (Number(b?.duracion_minutos) || 0), 0) : 0
    }))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

export function trainingLabel(t) {
  return `${t.name}${t.date ? ` · ${t.date}` : ""}`.slice(0, 200);
}

// ---------------------------------------------------------------------------
// Biblioteca de ejercicios (Basket Lab Academy)
// ---------------------------------------------------------------------------

/** Resumen de los ejercicios de la biblioteca, con clave estable "articulo:ejercicio". */
export function libraryList(articles) {
  const out = [];
  (articles || []).forEach((a) =>
    (a.exercises || []).forEach((ex) => {
      if (!ex.meta) return;
      out.push({
        key: `${a.id}:${ex.id}`,
        name: ex.name,
        article: a.title,
        fundamento: ex.meta.fundamento || null,
        objetivo: ex.meta.objetivo || null,
        level: ex.meta.level || null,
        minutes: ex.meta.minutes || null,
        minPlayers: ex.meta.minPlayers || 1,
        objective: typeof ex.objective === "string" ? ex.objective.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\s*\[(S\d+)\]/g, "") : null
      });
    })
  );
  return out;
}

export function libraryFind(articles, key) {
  return libraryList(articles).find((x) => x.key === key) || null;
}

// ---------------------------------------------------------------------------
// Rutinas
// ---------------------------------------------------------------------------

const MAX_ITEMS = 30;

/**
 * Rutina: lista de ítems. Cada ítem es propio ({ title, minutes, zone_id, attempts, notes })
 * o de la biblioteca ({ exercise_key }). Los de la biblioteca se completan con sus datos reales.
 */
export function validateRoutineInput(input, articles, { partial = false } = {}) {
  const errors = [];
  const v = {};
  const src = input || {};
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(src, k);
  if (has("name")) {
    v.name = text(src.name, 120);
    if (!v.name) errors.push("Poné un nombre a la rutina.");
  }
  if (has("description")) v.description = text(src.description, 2000);
  if (has("focus")) v.focus = text(src.focus, 80);
  if (has("items")) {
    const items = Array.isArray(src.items) ? src.items : [];
    if (!items.length) errors.push("Agregá al menos un ejercicio.");
    if (items.length > MAX_ITEMS) errors.push(`Hasta ${MAX_ITEMS} ejercicios por rutina.`);
    v.items = items.slice(0, MAX_ITEMS).map((it, i) => {
      if (it?.exercise_key) {
        const ex = libraryFind(articles, it.exercise_key);
        if (!ex) {
          errors.push(`El ejercicio ${i + 1} no está en la biblioteca.`);
          return null;
        }
        const minutes = it.minutes === "" || it.minutes == null ? (ex.minutes ? ex.minutes[1] : null) : Number(it.minutes);
        if (minutes != null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)) errors.push(`Minutos inválidos en el ejercicio ${i + 1}.`);
        return { type: "exercise", exercise_key: ex.key, title: ex.name, source: ex.article, minutes, notes: text(it.notes, 500) };
      }
      const title = text(it?.title, 160);
      if (!title) errors.push(`Falta el nombre del ejercicio ${i + 1}.`);
      const minutes = it?.minutes === "" || it?.minutes == null ? null : Number(it.minutes);
      if (minutes != null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)) errors.push(`Minutos inválidos en el ejercicio ${i + 1}.`);
      const zone_id = it?.zone_id || null;
      if (zone_id && !zoneById(zone_id)) errors.push(`Zona inválida en el ejercicio ${i + 1}.`);
      const attempts = it?.attempts === "" || it?.attempts == null ? null : Number(it.attempts);
      if (attempts != null && (!Number.isInteger(attempts) || attempts < 1 || attempts > 1000)) errors.push(`Lanzamientos inválidos en el ejercicio ${i + 1}.`);
      return { type: "custom", title, minutes, zone_id, attempts, notes: text(it?.notes, 500) };
    });
  }
  return { ok: errors.length === 0, errors, value: v };
}

export function routineMinutes(items) {
  return (items || []).reduce((a, it) => a + (Number(it?.minutes) || 0), 0);
}

// ---------------------------------------------------------------------------
// Trabajo planificado
// ---------------------------------------------------------------------------

/** Campos comunes de un ítem planificado (los específicos del tipo los arma el servidor). */
export function validatePlanCommon(input, { partial = false } = {}) {
  const errors = [];
  const v = {};
  const src = input || {};
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(src, k);
  if (has("title") && src.title !== undefined) {
    v.title = text(src.title, 160);
    if (!v.title && !partial) errors.push("Falta el título.");
    if (partial && !v.title) delete v.title;
  }
  if (has("details")) v.details = text(src.details, 4000);
  if (has("planned_on")) {
    v.planned_on = src.planned_on || null;
    if (v.planned_on && !ISO.test(v.planned_on)) errors.push("Fecha inválida.");
  }
  if (has("goal_id")) {
    v.goal_id = src.goal_id || null;
    if (v.goal_id && !isUuid(v.goal_id)) errors.push("Objetivo inválido.");
  }
  if (has("training_ref")) {
    v.training_ref = src.training_ref ? String(src.training_ref).slice(0, 80) : null;
  }
  if (has("client_item_id") && src.client_item_id) v.client_item_id = String(src.client_item_id).slice(0, 80);
  return { ok: errors.length === 0, errors, value: v };
}

/**
 * Plan de tiro sugerido (el mismo de Shooting Lab) a partir de lo realizado por el jugador.
 * Prioriza zonas vinculadas a objetivos activos de % por zona.
 */
export function shootingPlanContent(byZone, goals, { totalShots = 60, includeFreeThrows = false, minSample = 20 } = {}) {
  const goalZones = (goals || [])
    .filter((g) => g.status === "active" && String(g.metric_key || "").startsWith("shoot.zone_pct:"))
    .map((g) => g.metric_key.split(":")[1]);
  const plan = suggestShootingPlan(byZone, { totalShots, minSample, goalZones, includeFreeThrows });
  return {
    zones: plan.items.map((it) => ({ zone_id: it.zone.id, zone: it.zone.label, shots: it.shots, reason: it.reasonLabel, sample: it.sample })),
    totalShots: plan.totalShots,
    notes: plan.notes,
    goalZones
  };
}

export function validStatusChange(item, status) {
  if (!PLAN_STATUS.some((s) => s.id === status)) return "Estado inválido.";
  if (item.status === "cancelled" && status !== "planned") return "Un trabajo cancelado solo se puede volver a planificar.";
  return null;
}

/** Trabajo vinculado a cada objetivo: planificado vs realizado (solo informativo). */
export function planByGoal(items) {
  const out = {};
  (items || []).forEach((it) => {
    if (!it.goal_id || it.status === "cancelled") return;
    const g = (out[it.goal_id] = out[it.goal_id] || { planned: 0, done: 0, skipped: 0, items: [] });
    if (it.status === "done") g.done += 1;
    else if (it.status === "skipped") g.skipped += 1;
    else g.planned += 1;
    g.items.push(it);
  });
  return out;
}

export function splitPlan(items, today) {
  const active = (items || []).filter((it) => it.status !== "cancelled");
  return {
    upcoming: active.filter((it) => it.status === "planned").sort((a, b) => String(a.planned_on || "9").localeCompare(String(b.planned_on || "9"))),
    overdue: active.filter((it) => it.status === "planned" && it.planned_on && it.planned_on < today),
    done: active.filter((it) => it.status === "done").sort((a, b) => String(b.done_on).localeCompare(String(a.done_on))),
    skipped: active.filter((it) => it.status === "skipped")
  };
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------

export function validateAttendanceEntries(entries) {
  const errors = [];
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) errors.push("No hay jugadores para registrar.");
  if (list.length > 60) errors.push("Demasiados jugadores en un solo registro.");
  const seen = new Set();
  const value = [];
  list.forEach((e) => {
    if (!isUuid(e?.player_id)) return errors.push("Jugador inválido.");
    if (seen.has(e.player_id)) return errors.push("Jugador repetido.");
    seen.add(e.player_id);
    if (!ATTENDANCE_STATUS.some((s) => s.id === e.status)) return errors.push("Estado de asistencia inválido.");
    value.push({ player_id: e.player_id, status: e.status, notes: text(e.notes, 1000) });
  });
  return { ok: errors.length === 0, errors, value };
}

export function attendanceSummary(rows, { from = null, to = null } = {}) {
  const list = (rows || []).filter((r) => (!from || r.trained_on >= from) && (!to || r.trained_on <= to));
  const c = { present: 0, partial: 0, absent: 0, excused: 0 };
  list.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
  const counted = c.present + c.partial + c.absent; // los justificados no cuentan en contra
  return { ...c, total: list.length, rate: counted ? Math.round(((c.present + c.partial * 0.5) / counted) * 100) : null };
}

export { ALL_ZONES };
