/**
 * Shooting Lab — reglas del servidor (permisos, persistencia, anti-duplicados).
 * Recibe el cliente de Supabase por parámetro (`db`) para poder probarse sin red.
 * Lo usa services/server/shooting-lab-service.js con la clave de servicio:
 * por eso TODAS las verificaciones de permisos se hacen acá.
 */
import {
  isUuid,
  sessionProvenance,
  summarizeEntries,
  validateEntryInput,
  zonesCacheFromEntries
} from "./model.js";

const RANK = { viewer: 1, editor: 2, admin: 3 };
const MAX_BATCH = 200;
const MAX_SESSIONS = 300;

export const SESSION_STATUSES = ["draft", "in_progress", "completed", "archived"];

export class LabError extends Error {
  constructor(message, status = 400, code = "bad_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function satisfies(level, min) {
  return (RANK[level] || 0) >= (RANK[min] || 0);
}

/** Traduce errores de "tabla o columna inexistente" a un aviso entendible. */
export function isNotInstalledError(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    /shooting_entries|recording_mode/.test(msg) && /does not exist|schema cache|Could not find/i.test(msg)
  );
}

function check(result) {
  if (result.error) {
    if (isNotInstalledError(result.error)) {
      throw new LabError(
        "Falta correr la migración docs/sql/011-shooting-lab.sql en Supabase.",
        503,
        "shooting_lab_not_installed"
      );
    }
    throw result.error;
  }
  return result.data;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanName(value) {
  const name = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return name || "Sesión de tiro";
}

function cleanDate(value) {
  const s = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : today();
}

function cleanNotes(value) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 2000);
  return s || null;
}

// ---------------------------------------------------------------------------
// Accesos
// ---------------------------------------------------------------------------

/** { [playerId]: 'viewer'|'editor'|'admin' } para los jugadores con membresía activa. */
export async function accessMap(db, userId, playerIds = null) {
  let q = db.from("player_members").select("player_id, access_level").eq("user_id", userId).eq("status", "active");
  if (playerIds) {
    if (!playerIds.length) return {};
    q = q.in("player_id", playerIds);
  }
  const rows = check(await q);
  const map = {};
  (rows || []).forEach((r) => {
    map[r.player_id] = r.access_level;
  });
  return map;
}

function requireAll(access, playerIds, min, message) {
  const missing = playerIds.filter((pid) => !satisfies(access[pid], min));
  if (missing.length) throw new LabError(message || "No tenés permiso sobre todos los jugadores de la sesión.", 403, "forbidden");
}

async function loadParticipants(db, sessionIds) {
  if (!sessionIds.length) return {};
  const rows = check(await db.from("shooting_session_players").select("session_id, player_id").in("session_id", sessionIds));
  const map = {};
  (rows || []).forEach((r) => {
    (map[r.session_id] = map[r.session_id] || []).push(r.player_id);
  });
  return map;
}

/** Carga una sesión y verifica que el usuario tenga acceso a algún participante. */
async function loadSessionForUser(db, userId, sessionId) {
  if (!isUuid(sessionId)) throw new LabError("Sesión inexistente.", 404, "not_found");
  const session = check(await db.from("shooting_sessions").select("*").eq("id", sessionId).maybeSingle());
  if (!session) throw new LabError("Sesión inexistente.", 404, "not_found");
  const participants = (await loadParticipants(db, [sessionId]))[sessionId] || [];
  const access = await accessMap(db, userId, participants);
  const visible = participants.filter((pid) => satisfies(access[pid], "viewer"));
  // Sin participantes visibles la sesión no existe para este usuario.
  if (!visible.length) throw new LabError("Sesión inexistente.", 404, "not_found");
  return { session, participants, visible, access };
}

/** Registros que el usuario puede ver: de jugadores accesibles + colectivos. */
function visibleEntries(entries, access) {
  return (entries || []).filter((e) => (e.player_id ? satisfies(access[e.player_id], "viewer") : true));
}

function publicEntry(e) {
  return {
    id: e.id,
    session_id: e.session_id,
    player_id: e.player_id,
    scope: e.scope,
    entry_type: e.entry_type,
    zone_id: e.zone_id,
    tags: e.tags || [],
    attempts: e.attempts,
    made: e.made,
    x_m: e.x_m == null ? null : Number(e.x_m),
    y_m: e.y_m == null ? null : Number(e.y_m),
    seq: e.seq,
    recorded_at: e.recorded_at,
    client_entry_id: e.client_entry_id,
    voided_at: e.voided_at,
    created_by_user_id: e.created_by_user_id,
    created_at: e.created_at
  };
}

function publicSession(session, participants, access, { hiddenCount = 0 } = {}) {
  const playerIds = participants.filter((pid) => satisfies(access[pid], "viewer"));
  const canEdit = playerIds.length > 0 && participants.every((pid) => satisfies(access[pid], "editor"));
  const canDelete = playerIds.length > 0 && participants.every((pid) => satisfies(access[pid], "admin"));
  const base = {
    id: session.id,
    nombre: session.nombre,
    fecha: session.fecha,
    status: session.status || "completed",
    recording_mode: session.recording_mode || "legacy_zones",
    notes: session.notes || null,
    finished_at: session.finished_at || null,
    archived_at: session.archived_at || null,
    created_at: session.created_at,
    updated_at: session.updated_at,
    created_by_user_id: session.created_by_user_id,
    player_ids: playerIds,
    participants_total: participants.length,
    hidden_participants: hiddenCount || participants.length - playerIds.length,
    can_edit: canEdit,
    can_delete: canDelete
  };
  base.provenance = sessionProvenance({ recording_mode: base.recording_mode, player_ids: participants });
  // Las zonas agregadas solo se exponen para el histórico; en sesiones nuevas
  // se calculan desde los registros visibles (sin datos de jugadores ajenos).
  base.legacy_zones = base.recording_mode === "legacy_zones" ? session.zones || {} : null;
  return base;
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

export async function listPlayersForLab(db, userId) {
  const access = await accessMap(db, userId);
  const ids = Object.keys(access);
  if (!ids.length) return [];
  const rows = check(
    await db
      .from("players")
      .select("id, display_name, position, team, category, status")
      .in("id", ids)
      .eq("status", "active")
  );
  return (rows || [])
    .map((p) => ({ ...p, access_level: access[p.id] }))
    .sort((a, b) => String(a.display_name).localeCompare(String(b.display_name), "es"));
}

/**
 * Todo lo que necesita el panel: jugadores, sesiones visibles con sus registros
 * visibles y objetivos activos de texto libre.
 */
export async function loadOverview(db, userId, { includeArchived = true } = {}) {
  const players = await listPlayersForLab(db, userId);
  const access = {};
  players.forEach((p) => {
    access[p.id] = p.access_level;
  });
  const playerIds = players.map((p) => p.id);
  if (!playerIds.length) return { players, sessions: [], entries: [], goals: [] };

  const links = check(await db.from("shooting_session_players").select("session_id, player_id").in("player_id", playerIds));
  const sessionIds = [...new Set((links || []).map((l) => l.session_id))];
  let sessions = [];
  if (sessionIds.length) {
    sessions = check(
      await db.from("shooting_sessions").select("*").in("id", sessionIds).order("fecha", { ascending: false }).limit(MAX_SESSIONS)
    ) || [];
  }
  if (!includeArchived) sessions = sessions.filter((s) => s.status !== "archived");

  const participants = await loadParticipants(db, sessions.map((s) => s.id));
  // Accesos sobre participantes que no son de este usuario (para saber cuántos hay ocultos).
  const entrySessionIds = sessions.filter((s) => s.recording_mode === "entries").map((s) => s.id);
  let entries = [];
  if (entrySessionIds.length) {
    entries = check(
      await db.from("shooting_entries").select("*").in("session_id", entrySessionIds).is("voided_at", null).order("recorded_at", { ascending: true })
    ) || [];
  }

  const goals = check(
    await db.from("player_goals").select("id, player_id, body, status, created_at").in("player_id", playerIds).eq("status", "active")
  ) || [];

  return {
    players,
    sessions: sessions.map((s) => publicSession(s, participants[s.id] || [], access)),
    entries: visibleEntries(entries, access).map(publicEntry),
    goals
  };
}

export async function loadSession(db, userId, sessionId) {
  const { session, participants, access } = await loadSessionForUser(db, userId, sessionId);
  let entries = [];
  if (session.recording_mode === "entries") {
    entries = check(await db.from("shooting_entries").select("*").eq("session_id", sessionId).order("recorded_at", { ascending: true })) || [];
  }
  return {
    session: publicSession(session, participants, access),
    entries: visibleEntries(entries, access).map(publicEntry)
  };
}

// ---------------------------------------------------------------------------
// Escrituras de sesiones
// ---------------------------------------------------------------------------

export async function createSession(db, userId, body, { onActivity } = {}) {
  const playerIds = [...new Set((Array.isArray(body?.player_ids) ? body.player_ids : []).map(String))];
  if (!playerIds.length) throw new LabError("Elegí al menos un jugador.", 400, "players_required");
  if (playerIds.length > 30) throw new LabError("Una sesión admite hasta 30 jugadores.", 400, "too_many_players");
  if (!playerIds.every(isUuid)) throw new LabError("Jugador inválido.", 400, "bad_player");
  const access = await accessMap(db, userId, playerIds);
  requireAll(access, playerIds, "editor", "Solo podés crear sesiones con jugadores que podés editar.");

  const status = body?.status === "draft" ? "draft" : "in_progress";
  const row = {
    nombre: cleanName(body?.nombre),
    fecha: cleanDate(body?.fecha),
    zones: {},
    session_type: playerIds.length > 1 ? "group" : "individual",
    status,
    recording_mode: "entries",
    notes: cleanNotes(body?.notes),
    created_by_user_id: userId,
    updated_by_user_id: userId
  };
  const session = check(await db.from("shooting_sessions").insert(row).select("*").single());
  const junction = await db.from("shooting_session_players").insert(playerIds.map((pid) => ({ session_id: session.id, player_id: pid })));
  if (junction.error) {
    // Sin participantes la sesión no sirve: se deshace la creación.
    await db.from("shooting_sessions").delete().eq("id", session.id);
    check(junction);
  }
  if (onActivity) {
    await Promise.all(
      playerIds.map((pid) =>
        onActivity({ playerId: pid, eventType: "shooting_session.created", entityId: session.id, summary: `Sesión de tiro: ${row.nombre}` })
      )
    );
  }
  return loadSession(db, userId, session.id);
}

const TRANSITIONS = {
  start: { from: ["draft"], to: "in_progress" },
  finish: { from: ["draft", "in_progress"], to: "completed" },
  resume: { from: ["completed"], to: "in_progress" },
  archive: { from: ["draft", "in_progress", "completed"], to: "archived" },
  unarchive: { from: ["archived"], to: "completed" }
};

/**
 * Cambia datos o estado de la sesión. body: { nombre?, fecha?, notes?, action?, add_player_ids?, remove_player_ids? }
 * No permite tocar las zonas: en sesiones nuevas son un resumen calculado.
 */
export async function updateSession(db, userId, sessionId, body, { onActivity } = {}) {
  const { session, participants, access } = await loadSessionForUser(db, userId, sessionId);
  requireAll(access, participants, "editor");

  const updates = { updated_by_user_id: userId };
  if (body?.nombre !== undefined) updates.nombre = cleanName(body.nombre);
  if (body?.fecha !== undefined) updates.fecha = cleanDate(body.fecha);
  if (body?.notes !== undefined) updates.notes = cleanNotes(body.notes);

  const current = session.status || "completed";
  let transition = null;
  if (body?.action) {
    transition = TRANSITIONS[body.action];
    if (!transition) throw new LabError("Acción desconocida.", 400, "bad_action");
    if (!transition.from.includes(current)) throw new LabError("La sesión no está en un estado que permita esa acción.", 409, "bad_transition");
    if (session.recording_mode !== "entries" && ["start", "resume"].includes(body.action)) {
      throw new LabError("Las sesiones históricas no se pueden reanudar: se conservan como están.", 409, "legacy_readonly");
    }
    updates.status = transition.to;
    const now = new Date().toISOString();
    if (body.action === "finish") updates.finished_at = now;
    if (body.action === "archive") updates.archived_at = now;
    if (body.action === "unarchive") updates.archived_at = null;
  }

  const add = [...new Set((body?.add_player_ids || []).map(String))].filter((pid) => !participants.includes(pid));
  const remove = [...new Set((body?.remove_player_ids || []).map(String))].filter((pid) => participants.includes(pid));
  if ((add.length || remove.length) && session.recording_mode !== "entries") {
    throw new LabError("Los participantes de una sesión histórica no se modifican.", 409, "legacy_readonly");
  }
  if (add.length) {
    if (!add.every(isUuid)) throw new LabError("Jugador inválido.", 400, "bad_player");
    const addAccess = await accessMap(db, userId, add);
    requireAll(addAccess, add, "editor", "Solo podés sumar jugadores que podés editar.");
  }
  if (remove.length) {
    if (participants.length - remove.length + add.length < 1) throw new LabError("La sesión necesita al menos un jugador.", 400, "players_required");
    const withEntries = check(await db.from("shooting_entries").select("player_id").eq("session_id", sessionId).in("player_id", remove)) || [];
    if (withEntries.length) {
      throw new LabError("No se puede quitar a un jugador que ya tiene registros en la sesión.", 409, "player_has_entries");
    }
  }

  check(await db.from("shooting_sessions").update(updates).eq("id", sessionId));
  if (add.length) check(await db.from("shooting_session_players").insert(add.map((pid) => ({ session_id: sessionId, player_id: pid }))));
  if (remove.length) check(await db.from("shooting_session_players").delete().eq("session_id", sessionId).in("player_id", remove));
  if (add.length || remove.length) {
    const count = participants.length + add.length - remove.length;
    check(await db.from("shooting_sessions").update({ session_type: count > 1 ? "group" : "individual" }).eq("id", sessionId));
  }

  const result = await loadSession(db, userId, sessionId);
  if (onActivity && body?.action === "finish" && session.recording_mode === "entries") {
    await Promise.all(
      result.session.player_ids.map((pid) => {
        const s = summarizeEntries(result.entries, { playerId: pid });
        return onActivity({
          playerId: pid,
          eventType: "shooting_session.completed",
          entityId: sessionId,
          summary: `Sesión de tiro completada: ${result.session.nombre}`,
          metadata: { fg: s.fg, ft: s.ft, shots: s.shots, series: s.series }
        });
      })
    );
  }
  return result;
}

/** Copia nombre y participantes (los que el usuario puede editar). Nunca copia registros. */
export async function duplicateSession(db, userId, sessionId, body = {}, deps) {
  const { session, participants, access } = await loadSessionForUser(db, userId, sessionId);
  const editable = participants.filter((pid) => satisfies(access[pid], "editor"));
  if (!editable.length) throw new LabError("No tenés permiso para duplicar esta sesión.", 403, "forbidden");
  return createSession(
    db,
    userId,
    {
      nombre: body.nombre || `${session.nombre} (copia)`,
      fecha: body.fecha || today(),
      player_ids: editable,
      status: "draft",
      notes: session.notes
    },
    deps
  );
}

/**
 * Elimina una sesión y sus registros. Exige ser admin de todos los participantes
 * y escribir el nombre exacto de la sesión como confirmación.
 */
export async function deleteSession(db, userId, sessionId, body = {}, { onActivity } = {}) {
  const { session, participants, access } = await loadSessionForUser(db, userId, sessionId);
  requireAll(access, participants, "admin", "Solo un administrador de todos los jugadores puede eliminar la sesión. Podés archivarla.");
  if (String(body?.confirm_name || "").trim() !== String(session.nombre).trim()) {
    throw new LabError("Para eliminar, escribí el nombre exacto de la sesión.", 400, "confirmation_required");
  }
  check(await db.from("shooting_sessions").delete().eq("id", sessionId));
  if (onActivity) {
    await Promise.all(
      participants.map((pid) =>
        onActivity({ playerId: pid, eventType: "shooting_session.deleted", entityId: sessionId, summary: `Sesión eliminada: ${session.nombre}` })
      )
    );
  }
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Registros
// ---------------------------------------------------------------------------

async function refreshZonesCache(db, sessionId) {
  const rows = check(await db.from("shooting_entries").select("*").eq("session_id", sessionId).is("voided_at", null)) || [];
  check(await db.from("shooting_sessions").update({ zones: zonesCacheFromEntries(rows) }).eq("id", sessionId));
}

/**
 * Guarda uno o varios registros. Repetir el mismo client_entry_id no duplica:
 * devuelve el registro ya guardado.
 */
export async function addEntries(db, userId, sessionId, items) {
  const list = Array.isArray(items) ? items : [items];
  if (!list.length) throw new LabError("No hay registros para guardar.", 400, "empty");
  if (list.length > MAX_BATCH) throw new LabError(`Máximo ${MAX_BATCH} registros por envío.`, 400, "too_many");

  const { session, participants, access } = await loadSessionForUser(db, userId, sessionId);
  if (session.recording_mode !== "entries") {
    throw new LabError("Las sesiones históricas no admiten registros nuevos. Creá una sesión nueva.", 409, "legacy_readonly");
  }
  const status = session.status || "completed";
  if (status === "completed" || status === "archived") {
    throw new LabError("La sesión está finalizada. Reanudala para seguir registrando.", 409, "session_closed");
  }

  const rows = [];
  const errors = [];
  list.forEach((item, index) => {
    const v = validateEntryInput(item);
    if (!v.ok) {
      errors.push({ index, errors: v.errors });
      return;
    }
    const value = v.value;
    if (value.scope === "player") {
      if (!participants.includes(value.player_id)) {
        errors.push({ index, errors: ["El jugador no participa de esta sesión."] });
        return;
      }
      if (!satisfies(access[value.player_id], "editor")) {
        errors.push({ index, errors: ["No tenés permiso para registrar tiros de ese jugador."] });
        return;
      }
    } else if (!participants.every((pid) => satisfies(access[pid], "editor"))) {
      errors.push({ index, errors: ["Los registros colectivos requieren permiso sobre todos los jugadores."] });
      return;
    }
    rows.push({
      session_id: sessionId,
      player_id: value.player_id,
      scope: value.scope,
      entry_type: value.entry_type,
      zone_id: value.zone_id,
      tags: value.tags,
      attempts: value.attempts,
      made: value.made,
      x_m: value.x_m,
      y_m: value.y_m,
      seq: value.seq,
      ...(value.recorded_at ? { recorded_at: value.recorded_at } : {}),
      client_entry_id: value.client_entry_id,
      created_by_user_id: userId
    });
  });
  if (errors.length) {
    const err = new LabError(errors[0].errors[0], 400, "invalid_entries");
    err.details = errors;
    throw err;
  }

  check(
    await db.from("shooting_entries").upsert(rows, { onConflict: "session_id,client_entry_id", ignoreDuplicates: true })
  );
  const saved = check(
    await db.from("shooting_entries").select("*").eq("session_id", sessionId).in("client_entry_id", rows.map((r) => r.client_entry_id))
  ) || [];

  const updates = { updated_by_user_id: userId };
  if (status === "draft") updates.status = "in_progress";
  check(await db.from("shooting_sessions").update(updates).eq("id", sessionId));
  await refreshZonesCache(db, sessionId);

  return { entries: visibleEntries(saved, access).map(publicEntry) };
}

/** «Deshacer»: anula el registro (queda en la base con fecha y autor de la anulación). */
export async function voidEntry(db, userId, sessionId, entryId) {
  if (!isUuid(entryId)) throw new LabError("Registro inexistente.", 404, "not_found");
  const { session, participants, access } = await loadSessionForUser(db, userId, sessionId);
  const entry = check(await db.from("shooting_entries").select("*").eq("id", entryId).eq("session_id", sessionId).maybeSingle());
  if (!entry) throw new LabError("Registro inexistente.", 404, "not_found");
  if (entry.player_id ? !satisfies(access[entry.player_id], "editor") : !participants.every((pid) => satisfies(access[pid], "editor"))) {
    throw new LabError("No tenés permiso para modificar ese registro.", 403, "forbidden");
  }
  const status = session.status || "completed";
  if (status === "completed" || status === "archived") {
    throw new LabError("La sesión está finalizada. Reanudala para corregir registros.", 409, "session_closed");
  }
  if (!entry.voided_at) {
    check(
      await db
        .from("shooting_entries")
        .update({ voided_at: new Date().toISOString(), voided_by_user_id: userId })
        .eq("id", entryId)
        .is("voided_at", null)
    );
    await refreshZonesCache(db, sessionId);
  }
  const updated = check(await db.from("shooting_entries").select("*").eq("id", entryId).maybeSingle());
  return { entry: publicEntry(updated) };
}

/** ¿Está instalada la migración 011? */
export async function schemaStatus(db) {
  const r = await db.from("shooting_entries").select("id").limit(1);
  if (r.error) {
    if (isNotInstalledError(r.error)) return { installed: false };
    throw r.error;
  }
  return { installed: true };
}
