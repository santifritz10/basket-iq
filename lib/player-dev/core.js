/**
 * Perfil y seguimiento — reglas del servidor (permisos, persistencia).
 * Recibe el cliente de Supabase por parámetro (`db`) para probarse sin red.
 * services/server/player-dev-service.js lo usa con la clave de servicio:
 * por eso todas las verificaciones de permisos se hacen acá.
 */
import { accessMap } from "../shooting/lab-core.js";
import { sessionProvenance } from "../shooting/model.js";
import {
  criteriaCatalog,
  isUuid,
  suggestTeams,
  validateAssessmentInput,
  validateCriterionInput,
  validateStatRecord,
  validateTeamInput
} from "./model.js";

const RANK = { viewer: 1, editor: 2, admin: 3 };
const satisfies = (level, min) => (RANK[level] || 0) >= (RANK[min] || 0);
const NEW_TABLES = /player_assessments|player_stat_records|assessment_criteria|team_players|teams/;

export class DevError extends Error {
  constructor(message, status = 400, code = "bad_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isNotInstalledError(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return (code === "42P01" || code === "PGRST205" || code === "PGRST204" || code === "42703") && NEW_TABLES.test(msg);
}

function check(result) {
  if (result.error) {
    if (isNotInstalledError(result.error)) {
      throw new DevError("Falta correr la migración docs/sql/012-player-development.sql en Supabase.", 503, "player_dev_not_installed");
    }
    throw result.error;
  }
  return result.data;
}

/** Como check, pero si la tabla nueva no existe devuelve `fallback` (pantallas que funcionan igual). */
function soft(result, fallback, flags) {
  if (result.error && isNotInstalledError(result.error)) {
    flags.installed = false;
    return fallback;
  }
  return check(result);
}

const today = () => new Date().toISOString().slice(0, 10);

async function requireAccess(db, userId, playerId, min) {
  if (!isUuid(playerId)) throw new DevError("Jugador inexistente.", 404, "not_found");
  const access = await accessMap(db, userId, [playerId]);
  const level = access[playerId];
  if (!level) throw new DevError("Jugador inexistente.", 404, "not_found");
  if (!satisfies(level, min)) throw new DevError("No tenés permiso para hacer esto con este jugador.", 403, "forbidden");
  return level;
}

async function activity(onActivity, event) {
  if (onActivity) await onActivity(event);
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

export async function loadRoster(db, userId, { since30 } = {}) {
  const flags = { installed: true };
  const access = await accessMap(db, userId);
  const ids = Object.keys(access);
  const base = { schema: flags, players: [], teams: [], suggestions: [] };
  if (!ids.length) return base;

  const players = check(
    await db.from("players").select("id, display_name, position, age, height, level, team, category, status, photo_url, updated_at").in("id", ids)
  ) || [];

  const goals = check(await db.from("player_goals").select("player_id, status").in("player_id", ids).eq("status", "active")) || [];
  const goalCount = {};
  goals.forEach((g) => (goalCount[g.player_id] = (goalCount[g.player_id] || 0) + 1));

  const assessments = soft(await db.from("player_assessments").select("player_id, assessed_on, voided_at").in("player_id", ids).is("voided_at", null), [], flags) || [];
  const lastAssessment = {};
  assessments.forEach((a) => {
    if (!lastAssessment[a.player_id] || a.assessed_on > lastAssessment[a.player_id]) lastAssessment[a.player_id] = a.assessed_on;
  });

  const links = check(await db.from("shooting_session_players").select("session_id, player_id").in("player_id", ids)) || [];
  const sessionIds = [...new Set(links.map((l) => l.session_id))];
  const sessions = sessionIds.length ? check(await db.from("shooting_sessions").select("id, fecha, recording_mode, status").in("id", sessionIds)) || [] : [];
  const sessionById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const lastSession = {};
  links.forEach((l) => {
    const s = sessionById[l.session_id];
    if (!s || s.status === "archived" || s.status === "draft") return;
    if (!lastSession[l.player_id] || s.fecha > lastSession[l.player_id]) lastSession[l.player_id] = s.fecha;
  });

  // Efectividad de campo de los últimos 30 días, solo con registros propios.
  const from = since30 || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const recentEntrySessions = sessions.filter((s) => s.recording_mode === "entries" && s.fecha >= from && s.status !== "archived").map((s) => s.id);
  const fg30 = {};
  if (recentEntrySessions.length) {
    const entries = soft(
      await db.from("shooting_entries").select("player_id, zone_id, attempts, made, voided_at, session_id").in("session_id", recentEntrySessions).is("voided_at", null),
      [],
      { installed: true }
    ) || [];
    entries.forEach((e) => {
      if (!e.player_id || !access[e.player_id] || e.zone_id === "ft") return;
      const l = (fg30[e.player_id] = fg30[e.player_id] || { made: 0, att: 0 });
      l.made += Number(e.made) || 0;
      l.att += Number(e.attempts) || 0;
    });
  }

  const teams = soft(await db.from("teams").select("*").eq("owner_user_id", userId).is("archived_at", null).order("name"), [], flags) || [];
  const teamIds = teams.map((t) => t.id);
  const memberships = teamIds.length
    ? soft(await db.from("team_players").select("*").in("team_id", teamIds).is("left_on", null), [], flags) || []
    : [];
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const playerTeams = {};
  memberships.forEach((m) => {
    if (!access[m.player_id] || !teamById[m.team_id]) return;
    (playerTeams[m.player_id] = playerTeams[m.player_id] || []).push({ id: m.team_id, name: teamById[m.team_id].name, category: teamById[m.team_id].category });
  });

  const list = players.map((p) => ({
    ...p,
    access_level: access[p.id],
    active_goals: goalCount[p.id] || 0,
    last_assessment_on: lastAssessment[p.id] || null,
    last_session_on: lastSession[p.id] || null,
    fg30: fg30[p.id] || null,
    teams: playerTeams[p.id] || [],
    teamLabel: playerTeams[p.id]?.[0]?.name || p.team || ""
  }));

  const ownEditable = list.filter((p) => p.status === "active" && satisfies(p.access_level, "editor"));
  const inTeam = new Set(memberships.map((m) => m.player_id));
  return {
    schema: flags,
    players: list,
    teams: teams.map((t) => ({ ...t, player_ids: memberships.filter((m) => m.team_id === t.id && access[m.player_id]).map((m) => m.player_id) })),
    suggestions: flags.installed ? suggestTeams(ownEditable, inTeam) : []
  };
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export async function loadProfile(db, userId, playerId) {
  const level = await requireAccess(db, userId, playerId, "viewer");
  const flags = { installed: true };
  const player = check(await db.from("players").select("*").eq("id", playerId).maybeSingle());
  if (!player) throw new DevError("Jugador inexistente.", 404, "not_found");

  const [assessments, criteria, stats, goals, notes, evolution, activityRows] = await Promise.all([
    db.from("player_assessments").select("*").eq("player_id", playerId).is("voided_at", null).order("assessed_on", { ascending: false }),
    db.from("assessment_criteria").select("*").eq("owner_user_id", userId).order("created_at"),
    db.from("player_stat_records").select("*").eq("player_id", playerId).is("voided_at", null).order("played_on", { ascending: false }),
    db.from("player_goals").select("*").eq("player_id", playerId).order("created_at", { ascending: false }),
    db.from("player_notes").select("*").eq("player_id", playerId).order("created_at", { ascending: false }),
    db.from("player_evolution_events").select("*").eq("player_id", playerId).order("created_at", { ascending: false }),
    db.from("activity_events").select("*").eq("player_id", playerId).order("created_at", { ascending: false }).limit(80)
  ]);

  const links = check(await db.from("shooting_session_players").select("session_id, player_id").eq("player_id", playerId)) || [];
  const sessionIds = links.map((l) => l.session_id);
  let sessions = [];
  let entries = [];
  if (sessionIds.length) {
    sessions = check(await db.from("shooting_sessions").select("*").in("id", sessionIds).order("fecha", { ascending: false })) || [];
    const all = check(await db.from("shooting_session_players").select("session_id, player_id").in("session_id", sessionIds)) || [];
    const counts = {};
    all.forEach((l) => (counts[l.session_id] = (counts[l.session_id] || 0) + 1));
    const entrySessions = sessions.filter((s) => s.recording_mode === "entries").map((s) => s.id);
    if (entrySessions.length) {
      entries = soft(
        await db.from("shooting_entries").select("*").in("session_id", entrySessions).eq("player_id", playerId).is("voided_at", null),
        [],
        { installed: true }
      ) || [];
    }
    sessions = sessions.map((s) => {
      const n = counts[s.id] || 0;
      const provenance = sessionProvenance({ recording_mode: s.recording_mode, player_ids: new Array(n).fill(0) });
      return {
        id: s.id,
        nombre: s.nombre,
        fecha: s.fecha,
        status: s.status || "completed",
        recording_mode: s.recording_mode || "legacy_zones",
        provenance,
        participants_total: n,
        // Zonas históricas solo si la sesión fue de este jugador solo; las grupales no se atribuyen.
        legacy_zones: provenance === "legacy_single" ? s.zones || {} : null
      };
    });
  }

  let teams = [];
  const tp = soft(await db.from("team_players").select("*").eq("player_id", playerId), [], flags) || [];
  if (tp.length) {
    const teamRows = soft(await db.from("teams").select("*").in("id", [...new Set(tp.map((t) => t.team_id))]).eq("owner_user_id", userId), [], flags) || [];
    const byId = Object.fromEntries(teamRows.map((t) => [t.id, t]));
    teams = tp.filter((m) => byId[m.team_id]).map((m) => ({ ...m, team: byId[m.team_id] }));
  }

  let members = null;
  if (satisfies(level, "admin")) {
    members = check(await db.from("player_members").select("*").eq("player_id", playerId).order("created_at")) || [];
  }

  return {
    schema: { installed: flags.installed && !assessments.error && !stats.error },
    access_level: level,
    player,
    assessments: soft(assessments, [], flags) || [],
    criteria: soft(criteria, [], flags) || [],
    stats: soft(stats, [], flags) || [],
    goals: check(goals) || [],
    notes: check(notes) || [],
    evolution: check(evolution) || [],
    activity: check(activityRows) || [],
    sessions,
    entries,
    teams,
    members
  };
}

// ---------------------------------------------------------------------------
// Evaluaciones
// ---------------------------------------------------------------------------

async function customCriteria(db, userId) {
  return check(await db.from("assessment_criteria").select("*").eq("owner_user_id", userId)) || [];
}

export async function createAssessment(db, userId, playerId, body, { onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const catalog = criteriaCatalog(await customCriteria(db, userId));
  const v = validateAssessmentInput(body, catalog);
  if (!v.ok) {
    const err = new DevError(v.errors[0], 400, "invalid_assessment");
    err.details = v.errors;
    throw err;
  }
  const { batch_id, assessed_on, context, source, notes, rows } = v.value;
  if (assessed_on > today()) throw new DevError("La fecha de la evaluación no puede ser futura.", 400, "future_date");
  const existing = check(await db.from("player_assessments").select("id").eq("batch_id", batch_id).limit(1)) || [];
  check(
    await db.from("player_assessments").upsert(
      rows.map((r) => ({
        ...r,
        notes: r.notes || notes,
        player_id: playerId,
        batch_id,
        assessed_on,
        context,
        source,
        evaluator_user_id: userId
      })),
      { onConflict: "batch_id,criterion_key", ignoreDuplicates: true }
    )
  );
  const saved = check(await db.from("player_assessments").select("*").eq("batch_id", batch_id).eq("player_id", playerId)) || [];
  if (!existing.length) {
    await activity(onActivity, {
      playerId,
      eventType: "assessment.recorded",
      entityType: "player_assessment",
      entityId: batch_id,
      summary: source === "legacy_confirmed" ? "Valores del sistema anterior confirmados como evaluación" : `Evaluación técnica (${saved.length} criterio${saved.length === 1 ? "" : "s"})`,
      metadata: { assessed_on, context, criteria: saved.length }
    });
  }
  return { assessments: saved };
}

/** Anula una evaluación completa (queda registrada con fecha y autor). */
export async function voidAssessment(db, userId, playerId, batchId) {
  await requireAccess(db, userId, playerId, "editor");
  if (!isUuid(batchId)) throw new DevError("Evaluación inexistente.", 404, "not_found");
  const rows = check(await db.from("player_assessments").select("id").eq("batch_id", batchId).eq("player_id", playerId)) || [];
  if (!rows.length) throw new DevError("Evaluación inexistente.", 404, "not_found");
  check(
    await db
      .from("player_assessments")
      .update({ voided_at: new Date().toISOString(), voided_by_user_id: userId })
      .eq("batch_id", batchId)
      .eq("player_id", playerId)
      .is("voided_at", null)
  );
  return { voided: rows.length };
}

export async function listCriteria(db, userId) {
  return { criteria: await customCriteria(db, userId) };
}

export async function createCriterion(db, userId, body) {
  const v = validateCriterionInput(body);
  if (!v.ok) throw new DevError(v.errors[0], 400, "invalid_criterion");
  const row = check(await db.from("assessment_criteria").insert({ ...v.value, owner_user_id: userId }).select("*").single());
  return { criterion: row };
}

export async function updateCriterion(db, userId, criterionId, body) {
  if (!isUuid(criterionId)) throw new DevError("Criterio inexistente.", 404, "not_found");
  const row = check(await db.from("assessment_criteria").select("*").eq("id", criterionId).eq("owner_user_id", userId).maybeSingle());
  if (!row) throw new DevError("Criterio inexistente.", 404, "not_found");
  const updates = {};
  if (body?.active !== undefined) updates.active = Boolean(body.active);
  if (body?.label !== undefined || body?.description !== undefined || body?.level_descriptions !== undefined) {
    // La escala no cambia: las evaluaciones anteriores quedarían mal leídas.
    const v = validateCriterionInput({ ...row, ...body, scale_max: row.scale_max, dimension: row.dimension });
    if (!v.ok) throw new DevError(v.errors[0], 400, "invalid_criterion");
    Object.assign(updates, { label: v.value.label, description: v.value.description, level_descriptions: v.value.level_descriptions });
  }
  const saved = check(await db.from("assessment_criteria").update(updates).eq("id", criterionId).eq("owner_user_id", userId).select("*").single());
  return { criterion: saved };
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

export async function createStatRecord(db, userId, playerId, body, { onActivity } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const v = validateStatRecord(body);
  if (!v.ok) {
    const err = new DevError(v.errors[0], 400, "invalid_stats");
    err.details = v.errors;
    throw err;
  }
  if (v.value.played_on > today()) throw new DevError("La fecha no puede ser futura.", 400, "future_date");
  if (v.value.client_record_id) {
    const dup = check(
      await db.from("player_stat_records").select("*").eq("player_id", playerId).eq("client_record_id", v.value.client_record_id).maybeSingle()
    );
    if (dup) return { record: dup };
  }
  const record = check(
    await db
      .from("player_stat_records")
      .insert({ ...v.value, player_id: playerId, created_by_user_id: userId, updated_by_user_id: userId })
      .select("*")
      .single()
  );
  await activity(onActivity, {
    playerId,
    eventType: "stats.recorded",
    entityType: "player_stat_record",
    entityId: record.id,
    summary: `Estadísticas de ${record.record_type === "match" ? "partido" : "entrenamiento"}${record.opponent ? ` vs. ${record.opponent}` : ""}`,
    metadata: { record_type: record.record_type, played_on: record.played_on }
  });
  return { record };
}

async function loadRecord(db, playerId, recordId) {
  if (!isUuid(recordId)) throw new DevError("Registro inexistente.", 404, "not_found");
  const r = check(await db.from("player_stat_records").select("*").eq("id", recordId).eq("player_id", playerId).maybeSingle());
  if (!r || r.voided_at) throw new DevError("Registro inexistente.", 404, "not_found");
  return r;
}

export async function updateStatRecord(db, userId, playerId, recordId, body) {
  await requireAccess(db, userId, playerId, "editor");
  const current = await loadRecord(db, playerId, recordId);
  if (current.record_type === "manual_legacy") throw new DevError("Los registros del sistema anterior se conservan como están.", 409, "legacy_readonly");
  const v = validateStatRecord({ ...current, ...body, record_type: body?.record_type || current.record_type });
  if (!v.ok) {
    const err = new DevError(v.errors[0], 400, "invalid_stats");
    err.details = v.errors;
    throw err;
  }
  const { client_record_id, ...rest } = v.value;
  const record = check(
    await db.from("player_stat_records").update({ ...rest, updated_by_user_id: userId }).eq("id", recordId).eq("player_id", playerId).select("*").single()
  );
  return { record };
}

export async function voidStatRecord(db, userId, playerId, recordId) {
  await requireAccess(db, userId, playerId, "editor");
  const current = await loadRecord(db, playerId, recordId);
  if (current.record_type === "manual_legacy") throw new DevError("Los registros del sistema anterior se conservan como están.", 409, "legacy_readonly");
  check(
    await db
      .from("player_stat_records")
      .update({ voided_at: new Date().toISOString(), voided_by_user_id: userId, updated_by_user_id: userId })
      .eq("id", recordId)
      .eq("player_id", playerId)
  );
  return { voided: true };
}

// ---------------------------------------------------------------------------
// Equipos
// ---------------------------------------------------------------------------

async function ownTeam(db, userId, teamId) {
  if (!isUuid(teamId)) throw new DevError("Equipo inexistente.", 404, "not_found");
  const t = check(await db.from("teams").select("*").eq("id", teamId).eq("owner_user_id", userId).maybeSingle());
  if (!t) throw new DevError("Equipo inexistente.", 404, "not_found");
  return t;
}

export async function createTeam(db, userId, body) {
  const v = validateTeamInput(body);
  if (!v.ok) throw new DevError(v.errors[0], 400, "invalid_team");
  const team = check(await db.from("teams").insert({ ...v.value, owner_user_id: userId }).select("*").single());
  const added = [];
  const skipped = [];
  const ids = [...new Set((body?.player_ids || []).map(String))];
  if (ids.length) {
    const access = await accessMap(db, userId, ids.filter(isUuid));
    for (const pid of ids) {
      if (!satisfies(access[pid], "editor")) {
        skipped.push(pid);
        continue;
      }
      const p = check(await db.from("players").select("team, category").eq("id", pid).maybeSingle());
      check(
        await db.from("team_players").insert({
          team_id: team.id,
          player_id: pid,
          joined_on: today(),
          original_team: p?.team || null,
          original_category: p?.category || null,
          created_by_user_id: userId
        })
      );
      added.push(pid);
    }
  }
  return { team, added, skipped };
}

export async function updateTeam(db, userId, teamId, body) {
  const current = await ownTeam(db, userId, teamId);
  const updates = {};
  if (body?.archived === true) updates.archived_at = new Date().toISOString();
  if (body?.archived === false) updates.archived_at = null;
  if (["name", "category", "season", "club"].some((k) => body?.[k] !== undefined)) {
    const v = validateTeamInput({ ...current, ...body });
    if (!v.ok) throw new DevError(v.errors[0], 400, "invalid_team");
    Object.assign(updates, v.value);
  }
  const team = check(await db.from("teams").update(updates).eq("id", teamId).eq("owner_user_id", userId).select("*").single());
  return { team };
}

export async function addTeamMember(db, userId, teamId, body) {
  await ownTeam(db, userId, teamId);
  const playerId = String(body?.player_id || "");
  await requireAccess(db, userId, playerId, "editor");
  const active = check(await db.from("team_players").select("id").eq("team_id", teamId).eq("player_id", playerId).is("left_on", null)) || [];
  if (active.length) throw new DevError("El jugador ya está en este equipo.", 409, "already_member");
  const joined = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.joined_on || "")) ? body.joined_on : today();
  const p = check(await db.from("players").select("team, category").eq("id", playerId).maybeSingle());
  const row = check(
    await db
      .from("team_players")
      .insert({ team_id: teamId, player_id: playerId, joined_on: joined, original_team: p?.team || null, original_category: p?.category || null, created_by_user_id: userId })
      .select("*")
      .single()
  );
  return { membership: row };
}

/** Cierra la pertenencia (no se borra: queda el historial del jugador). */
export async function endTeamMember(db, userId, membershipId, body) {
  if (!isUuid(membershipId)) throw new DevError("Registro inexistente.", 404, "not_found");
  const m = check(await db.from("team_players").select("*").eq("id", membershipId).maybeSingle());
  if (!m) throw new DevError("Registro inexistente.", 404, "not_found");
  await ownTeam(db, userId, m.team_id);
  await requireAccess(db, userId, m.player_id, "editor");
  if (m.left_on) return { membership: m };
  const left = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.left_on || "")) ? body.left_on : today();
  if (left < m.joined_on) throw new DevError("La fecha de salida no puede ser anterior a la de ingreso.", 400, "bad_date");
  const row = check(await db.from("team_players").update({ left_on: left }).eq("id", membershipId).select("*").single());
  return { membership: row };
}
