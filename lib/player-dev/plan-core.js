/**
 * Integración deportiva — reglas del servidor (permisos y persistencia).
 * El planificador existente se LEE (user_app_data "trainings"), nunca se escribe desde acá.
 */
import { accessMap } from "../shooting/lab-core.js";
import { DevError, activity, check, loadProfile, requireAccess, satisfies, today } from "./core.js";
import { periodSummary } from "./goals.js";
import { isUuid } from "./model.js";
import {
  libraryFind,
  libraryList,
  plannerTrainings,
  shootingPlanContent,
  trainingLabel,
  validStatusChange,
  validateAttendanceEntries,
  validatePlanCommon,
  validateRoutineInput
} from "./plan.js";

const PLAN_TABLES = /player_plan_items|player_attendance|training_routines/;

export function isPlanNotInstalledError(error) {
  const code = String(error?.code || "");
  return (code === "42P01" || code === "PGRST205" || code === "PGRST204" || code === "42703") && PLAN_TABLES.test(String(error?.message || ""));
}

export function check14(result) {
  if (result.error && isPlanNotInstalledError(result.error)) {
    throw new DevError("Falta correr la migración docs/sql/014-player-plan.sql en Supabase.", 503, "plan_not_installed");
  }
  return check(result);
}

export function softPlan(result, fallback, flags) {
  if (result.error && isPlanNotInstalledError(result.error)) {
    flags.installed = false;
    return fallback;
  }
  return check(result);
}

function invalid(v, code) {
  const err = new DevError(v.errors[0], 400, code);
  err.details = v.errors;
  return err;
}

export async function userTrainings(db, userId) {
  const row = check(await db.from("user_app_data").select("payload").eq("user_id", userId).eq("data_type", "trainings").maybeSingle());
  return plannerTrainings(row?.payload);
}

async function findTraining(db, userId, ref) {
  const t = (await userTrainings(db, userId)).find((x) => x.ref === String(ref));
  if (!t) throw new DevError("Ese entrenamiento no está en tu planificador.", 400, "training_not_found");
  return t;
}

// ---------------------------------------------------------------------------
// Datos para planificar (del usuario, no del jugador)
// ---------------------------------------------------------------------------

export async function loadPlanning(db, userId, { articles = [] } = {}) {
  const flags = { installed: true };
  const routines = softPlan(await db.from("training_routines").select("*").eq("owner_user_id", userId).order("name"), [], flags) || [];
  return {
    schema: { plan: flags.installed },
    routines,
    trainings: await userTrainings(db, userId),
    library: libraryList(articles)
  };
}

// ---------------------------------------------------------------------------
// Rutinas
// ---------------------------------------------------------------------------

export async function createRoutine(db, userId, body, { articles = [] } = {}) {
  const v = validateRoutineInput(body, articles);
  if (!v.ok) throw invalid(v, "invalid_routine");
  const row = check14(await db.from("training_routines").insert({ ...v.value, owner_user_id: userId }).select("*").single());
  return { routine: row };
}

export async function updateRoutine(db, userId, routineId, body, { articles = [] } = {}) {
  if (!isUuid(routineId)) throw new DevError("Rutina inexistente.", 404, "not_found");
  const current = check14(await db.from("training_routines").select("*").eq("id", routineId).eq("owner_user_id", userId).maybeSingle());
  if (!current) throw new DevError("Rutina inexistente.", 404, "not_found");
  const src = { ...(body || {}) };
  const archived = src.archived;
  delete src.archived;
  const v = validateRoutineInput(src, articles, { partial: true });
  if (!v.ok) throw invalid(v, "invalid_routine");
  const updates = { ...v.value };
  if (archived === true) updates.archived_at = new Date().toISOString();
  if (archived === false) updates.archived_at = null;
  if (!Object.keys(updates).length) return { routine: current };
  const row = check14(await db.from("training_routines").update(updates).eq("id", routineId).eq("owner_user_id", userId).select("*").single());
  return { routine: row };
}

// ---------------------------------------------------------------------------
// Trabajo planificado por jugador
// ---------------------------------------------------------------------------

async function assertGoal(db, playerId, goalId) {
  if (!goalId) return;
  const g = check(await db.from("player_goals").select("id").eq("id", goalId).eq("player_id", playerId).maybeSingle());
  if (!g) throw new DevError("El objetivo no es de este jugador.", 400, "invalid_goal");
}

/**
 * Asigna trabajo a un jugador. Según el tipo, el contenido lo arma el servidor:
 * - exercise: copia los datos del ejercicio de la biblioteca (no confía en el texto del navegador).
 * - routine: copia los ítems de una rutina propia.
 * - shooting_plan: calcula el plan de tiro sugerido con lo realizado por el jugador.
 * - custom: texto propio.
 */
export async function createPlanItem(db, userId, playerId, body, { articles = [], onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const src = body || {};
  const kind = src.kind;
  if (!["exercise", "routine", "shooting_plan", "custom"].includes(kind)) throw new DevError("Tipo de trabajo inválido.", 400, "invalid_plan");
  const v = validatePlanCommon({ ...src, title: src.title ?? "—" });
  if (!v.ok) throw invalid(v, "invalid_plan");
  const row = { ...v.value, kind, content: {}, routine_id: null };

  if (row.client_item_id) {
    const dup = check14(await db.from("player_plan_items").select("*").eq("player_id", playerId).eq("client_item_id", row.client_item_id).maybeSingle());
    if (dup) return { item: dup, duplicate: true };
  }
  await assertGoal(db, playerId, row.goal_id);
  if (row.training_ref) {
    const t = await findTraining(db, userId, row.training_ref);
    row.training_label = trainingLabel(t);
    if (!row.planned_on && t.date) row.planned_on = t.date;
  }

  if (kind === "exercise") {
    const ex = libraryFind(articles, src.exercise_key);
    if (!ex) throw new DevError("El ejercicio no está en la biblioteca.", 400, "invalid_plan");
    row.title = ex.name;
    row.content = { academy_ref: ex.key, article: ex.article, fundamento: ex.fundamento, objetivo: ex.objetivo, minutes: ex.minutes, objective: ex.objective };
  } else if (kind === "routine") {
    if (!isUuid(src.routine_id)) throw new DevError("Rutina inexistente.", 404, "not_found");
    const r = check14(await db.from("training_routines").select("*").eq("id", src.routine_id).eq("owner_user_id", userId).maybeSingle());
    if (!r || r.archived_at) throw new DevError("Rutina inexistente.", 404, "not_found");
    row.routine_id = r.id;
    row.title = r.name;
    row.content = { items: r.items, description: r.description, focus: r.focus };
  } else if (kind === "shooting_plan") {
    const total = Math.max(10, Math.min(500, Math.floor(Number(src.total_shots) || 60)));
    const profile = await loadProfile(db, userId, playerId);
    const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const sum = periodSummary(profile, { from });
    row.content = { ...shootingPlanContent(sum.shooting.byZone, profile.goals, { totalShots: total, includeFreeThrows: Boolean(src.include_ft) }), basis: { from, attempts: sum.attempts } };
    row.title = v.value.title && v.value.title !== "—" ? v.value.title : `Plan de tiro (${row.content.totalShots} lanzamientos)`;
  } else if (!v.value.title || v.value.title === "—") {
    throw new DevError("Falta el título.", 400, "invalid_plan");
  }

  const saved = check14(
    await db
      .from("player_plan_items")
      .insert({ ...row, player_id: playerId, status: "planned", created_by_user_id: userId, updated_by_user_id: userId })
      .select("*")
      .single()
  );
  await activity(onActivity, {
    playerId,
    eventType: kind === "routine" ? "plan.routine_assigned" : "plan.assigned",
    entityType: "player_plan_item",
    entityId: saved.id,
    summary: kind === "routine" ? `Rutina asignada: ${saved.title}` : `Trabajo planificado: ${saved.title}`,
    metadata: { kind, goal_id: saved.goal_id, training_ref: saved.training_ref, planned_on: saved.planned_on }
  });
  return { item: saved };
}

/** Cambia estado o datos. Realizado = con fecha y, si se quiere, la sesión de tiro que lo prueba. */
export async function updatePlanItem(db, userId, playerId, itemId, body, { onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  if (!isUuid(itemId)) throw new DevError("Trabajo inexistente.", 404, "not_found");
  const item = check14(await db.from("player_plan_items").select("*").eq("id", itemId).eq("player_id", playerId).maybeSingle());
  if (!item) throw new DevError("Trabajo inexistente.", 404, "not_found");
  const src = body || {};
  const v = validatePlanCommon(src, { partial: true });
  if (!v.ok) throw invalid(v, "invalid_plan");
  const updates = { ...v.value };
  delete updates.client_item_id;
  if ("goal_id" in updates) await assertGoal(db, playerId, updates.goal_id);
  if ("training_ref" in updates) {
    if (updates.training_ref) updates.training_label = trainingLabel(await findTraining(db, userId, updates.training_ref));
    else updates.training_label = null;
  }
  let event = null;
  if (src.status !== undefined && src.status !== item.status) {
    const err = validStatusChange(item, src.status);
    if (err) throw new DevError(err, 400, "invalid_plan");
    updates.status = src.status;
    if (src.status === "done") {
      updates.done_on = src.done_on || today();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updates.done_on) || updates.done_on > today()) throw new DevError("La fecha de realización no puede ser futura.", 400, "invalid_plan");
      event = { eventType: "plan.completed", summary: `Trabajo realizado: ${item.title}` };
    } else {
      updates.done_on = null;
      updates.shooting_session_id = null;
    }
  }
  if (src.result_notes !== undefined) updates.result_notes = src.result_notes ? String(src.result_notes).slice(0, 2000) : null;
  if (src.shooting_session_id !== undefined) {
    const sid = src.shooting_session_id || null;
    if (sid) {
      if ((updates.status || item.status) !== "done") throw new DevError("Solo se vincula una sesión a un trabajo realizado.", 400, "invalid_plan");
      if (!isUuid(sid)) throw new DevError("Sesión inexistente.", 404, "not_found");
      const link = check(await db.from("shooting_session_players").select("session_id").eq("session_id", sid).eq("player_id", playerId));
      if (!link?.length) throw new DevError("Esa sesión no es de este jugador.", 400, "invalid_plan");
    }
    updates.shooting_session_id = sid;
  }
  if (!Object.keys(updates).length) return { item };
  const saved = check14(
    await db.from("player_plan_items").update({ ...updates, updated_by_user_id: userId }).eq("id", itemId).eq("player_id", playerId).select("*").single()
  );
  if (event) await activity(onActivity, { playerId, ...event, entityType: "player_plan_item", entityId: itemId, metadata: { done_on: saved.done_on, shooting_session_id: saved.shooting_session_id } });
  return { item: saved };
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------

/** Registra la participación de varios jugadores en un entrenamiento del planificador del usuario. */
export async function saveAttendance(db, userId, body) {
  const t = await findTraining(db, userId, body?.training_ref);
  if (!t.date) throw new DevError("El entrenamiento no tiene fecha en el planificador.", 400, "training_without_date");
  if (t.date > today()) throw new DevError("No se registra asistencia de un entrenamiento futuro.", 400, "future_training");
  const v = validateAttendanceEntries(body?.entries);
  if (!v.ok) throw invalid(v, "invalid_attendance");
  const access = await accessMap(db, userId, v.value.map((e) => e.player_id));
  const denied = v.value.filter((e) => !satisfies(access[e.player_id], "editor"));
  if (denied.length) throw new DevError("No tenés permiso de edición sobre alguno de los jugadores.", 403, "forbidden");
  const existing = check14(await db.from("player_attendance").select("*").eq("training_ref", t.ref).in("player_id", v.value.map((e) => e.player_id))) || [];
  const byPlayer = Object.fromEntries(existing.map((r) => [r.player_id, r]));
  const saved = [];
  for (const e of v.value) {
    const prev = byPlayer[e.player_id];
    const fields = { status: e.status, notes: e.notes, trained_on: t.date, training_label: trainingLabel(t), updated_by_user_id: userId };
    const row = prev
      ? check14(await db.from("player_attendance").update(fields).eq("id", prev.id).select("*").single())
      : check14(await db.from("player_attendance").insert({ ...fields, player_id: e.player_id, training_ref: t.ref, created_by_user_id: userId }).select("*").single());
    saved.push(row);
  }
  return { training: t, attendance: saved };
}

/** Lo planificado y la asistencia de un entrenamiento (para el planificador), solo de jugadores accesibles. */
export async function loadTrainingOverview(db, userId, ref) {
  const t = await findTraining(db, userId, ref);
  const access = await accessMap(db, userId);
  const ids = Object.keys(access);
  if (!ids.length) return { training: t, players: [], items: [], attendance: [] };
  const flags = { installed: true };
  const items = softPlan(await db.from("player_plan_items").select("*").eq("training_ref", t.ref).in("player_id", ids).neq("status", "cancelled"), [], flags) || [];
  const attendance = softPlan(await db.from("player_attendance").select("*").eq("training_ref", t.ref).in("player_id", ids), [], flags) || [];
  const players = check(await db.from("players").select("id, display_name, category, status").in("id", ids)) || [];
  return {
    schema: { plan: flags.installed },
    training: t,
    players: players.filter((p) => p.status !== "archived").map((p) => ({ ...p, access_level: access[p.id] })),
    items,
    attendance
  };
}
