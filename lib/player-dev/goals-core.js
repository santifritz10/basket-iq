/**
 * Objetivos medibles, notas clasificadas y comparación — reglas del servidor.
 * Igual que core.js: recibe `db` (clave de servicio) y verifica permisos acá.
 */
import { DevError, activity, check, isGoalsNotInstalledError, loadProfile, requireAccess, today } from "./core.js";
import { criteriaCatalog, isUuid } from "./model.js";
import { validateCheckin, validateGoalInput, validateNoteInput } from "./goals.js";

function check13(result) {
  if (result.error && isGoalsNotInstalledError(result.error)) {
    throw new DevError("Falta correr la migración docs/sql/013-goals-notes.sql en Supabase.", 503, "goals_not_installed");
  }
  return check(result);
}

function invalid(v, code) {
  const err = new DevError(v.errors[0], 400, code);
  err.details = v.errors;
  return err;
}

async function catalogFor(db, userId) {
  const custom = check(await db.from("assessment_criteria").select("*").eq("owner_user_id", userId)) || [];
  return criteriaCatalog(custom);
}

async function goalOf(db, playerId, goalId) {
  if (!isUuid(goalId)) throw new DevError("Objetivo inexistente.", 404, "not_found");
  const goal = check13(await db.from("player_goals").select("*").eq("id", goalId).eq("player_id", playerId).maybeSingle());
  if (!goal) throw new DevError("Objetivo inexistente.", 404, "not_found");
  return goal;
}

// ---------------------------------------------------------------------------
// Objetivos
// ---------------------------------------------------------------------------

export async function createGoal(db, userId, playerId, body, { onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const v = validateGoalInput(body, await catalogFor(db, userId));
  if (!v.ok) throw invalid(v, "invalid_goal");
  const row = check13(
    await db
      .from("player_goals")
      .insert({ ...v.value, player_id: playerId, status: "active", start_on: v.value.start_on || today(), created_by_user_id: userId, updated_by_user_id: userId })
      .select("*")
      .single()
  );
  await activity(onActivity, {
    playerId,
    eventType: "player_goal.created",
    entityType: "player_goal",
    entityId: row.id,
    summary: `Objetivo creado: ${row.title}`,
    metadata: { goal_type: row.goal_type, metric_key: row.metric_key, target_value: row.target_value }
  });
  return { goal: row };
}

const GOAL_STATUS = ["active", "completed", "archived"];

/**
 * Edita un objetivo. Pasar a "completed" lo confirma el entrenador y deja
 * registro de la fecha y del valor alcanzado (si lo hay). Nunca se completa solo.
 */
export async function updateGoal(db, userId, playerId, goalId, body, { onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const goal = await goalOf(db, playerId, goalId);
  const src = body || {};
  const fields = { ...src };
  delete fields.status;
  delete fields.achieved_value;
  let updates = {};
  if (Object.keys(fields).length) {
    const v = validateGoalInput(fields, await catalogFor(db, userId), { partial: true });
    if (!v.ok) throw invalid(v, "invalid_goal");
    updates = v.value;
    // Un objetivo de texto antiguo sin título conserva su texto como descripción.
    if (updates.body == null) delete updates.body;
  }
  let event = null;
  if (src.status !== undefined && src.status !== goal.status) {
    if (!GOAL_STATUS.includes(src.status)) throw new DevError("Estado inválido.", 400, "invalid_goal");
    updates.status = src.status;
    if (src.status === "completed") {
      updates.achieved_at = new Date().toISOString();
      const av = src.achieved_value === "" || src.achieved_value == null ? null : Number(src.achieved_value);
      updates.achieved_value = Number.isFinite(av) ? av : null;
      event = { eventType: "player_goal.achieved", summary: `Objetivo alcanzado: ${goal.title || goal.body}` };
    } else if (goal.status === "completed") {
      updates.achieved_at = null;
      updates.achieved_value = null;
    }
  }
  if (!Object.keys(updates).length) return { goal };
  const saved = check13(
    await db.from("player_goals").update({ ...updates, updated_by_user_id: userId }).eq("id", goalId).eq("player_id", playerId).select("*").single()
  );
  await activity(onActivity, {
    playerId,
    eventType: event?.eventType || "player_goal.updated",
    entityType: "player_goal",
    entityId: goalId,
    summary: event?.summary || `Objetivo modificado: ${saved.title || saved.body}`,
    metadata: { fields: Object.keys(updates) }
  });
  return { goal: saved };
}

export async function addCheckin(db, userId, playerId, goalId, body, { onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const goal = await goalOf(db, playerId, goalId);
  const v = validateCheckin(body, today());
  if (!v.ok) throw invalid(v, "invalid_checkin");
  const row = check13(
    await db.from("player_goal_checkins").insert({ ...v.value, goal_id: goal.id, player_id: playerId, created_by_user_id: userId }).select("*").single()
  );
  await activity(onActivity, {
    playerId,
    eventType: "player_goal.measured",
    entityType: "player_goal",
    entityId: goal.id,
    summary: `Medición registrada en «${goal.title || goal.body}»`,
    metadata: { value: row.value, measured_on: row.measured_on }
  });
  return { checkin: row };
}

export async function voidCheckin(db, userId, playerId, checkinId) {
  await requireAccess(db, userId, playerId, "editor");
  if (!isUuid(checkinId)) throw new DevError("Medición inexistente.", 404, "not_found");
  const row = check13(await db.from("player_goal_checkins").select("id").eq("id", checkinId).eq("player_id", playerId).maybeSingle());
  if (!row) throw new DevError("Medición inexistente.", 404, "not_found");
  check13(
    await db.from("player_goal_checkins").update({ voided_at: new Date().toISOString(), voided_by_user_id: userId }).eq("id", checkinId).eq("player_id", playerId)
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

async function noteOf(db, userId, playerId, noteId) {
  if (!isUuid(noteId)) throw new DevError("Nota inexistente.", 404, "not_found");
  const note = check(await db.from("player_notes").select("*").eq("id", noteId).eq("player_id", playerId).maybeSingle());
  // Una nota privada ajena se trata como inexistente (no se confirma que existe).
  if (!note || (note.visibility === "private" && note.created_by_user_id !== userId)) throw new DevError("Nota inexistente.", 404, "not_found");
  return note;
}

export async function createNote(db, userId, playerId, body, { onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const v = validateNoteInput(body);
  if (!v.ok) throw invalid(v, "invalid_note");
  const row = check13(
    await db.from("player_notes").insert({ ...v.value, player_id: playerId, created_by_user_id: userId, updated_by_user_id: userId }).select("*").single()
  );
  // Las notas privadas no dejan rastro visible para otros colaboradores.
  if (row.visibility !== "private") {
    await activity(onActivity, {
      playerId,
      eventType: "player_note.created",
      entityType: "player_note",
      entityId: row.id,
      summary: "Nueva nota registrada",
      metadata: { note_type: row.note_type }
    });
  }
  return { note: row };
}

export async function updateNote(db, userId, playerId, noteId, body) {
  await requireAccess(db, userId, playerId, "editor");
  const note = await noteOf(db, userId, playerId, noteId);
  const v = validateNoteInput(body, { partial: true });
  if (!v.ok) throw invalid(v, "invalid_note");
  if (v.value.visibility === "private" && note.created_by_user_id !== userId) {
    throw new DevError("Solo quien escribió la nota puede hacerla privada.", 403, "forbidden");
  }
  if (!Object.keys(v.value).length) return { note };
  const saved = check13(
    await db.from("player_notes").update({ ...v.value, updated_by_user_id: userId }).eq("id", noteId).eq("player_id", playerId).select("*").single()
  );
  return { note: saved };
}

export async function deleteNote(db, userId, playerId, noteId) {
  await requireAccess(db, userId, playerId, "editor");
  await noteOf(db, userId, playerId, noteId);
  check(await db.from("player_notes").delete().eq("id", noteId).eq("player_id", playerId));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Comparación entre jugadores
// ---------------------------------------------------------------------------

export const MAX_COMPARE = 4;

/**
 * Perfiles de 2 a 4 jugadores para comparar. Cada uno exige acceso de lector:
 * si alguno no es accesible, falla todo con 404 (no se revela cuál existe).
 * Se devuelven sin colaboradores ni notas: solo datos deportivos.
 */
export async function loadCompare(db, userId, ids) {
  const list = [...new Set((ids || []).filter(Boolean))];
  if (list.length < 2) throw new DevError("Elegí al menos dos jugadores.", 400, "invalid_compare");
  if (list.length > MAX_COMPARE) throw new DevError(`Se pueden comparar hasta ${MAX_COMPARE} jugadores.`, 400, "invalid_compare");
  const out = [];
  for (const id of list) {
    const p = await loadProfile(db, userId, id);
    out.push({
      player: p.player,
      access_level: p.access_level,
      assessments: p.assessments,
      criteria: p.criteria,
      stats: p.stats,
      goals: p.goals,
      sessions: p.sessions,
      entries: p.entries,
      schema: p.schema
    });
  }
  return { players: out };
}
