import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { requirePlayerAccess } from "@/services/server/player-permissions";
import { recordActivityEvent } from "@/services/server/activity-service";

async function attachPlayerIds(session) {
  const service = createSupabaseServiceServerClient();
  const links = await service
    .from("shooting_session_players")
    .select("player_id")
    .eq("session_id", session.id);
  if (links.error) throw links.error;
  return {
    ...session,
    player_ids: (links.data || []).map((r) => r.player_id)
  };
}

export async function listShootingSessionsForPlayer(userId, playerId) {
  await requirePlayerAccess(userId, playerId, "viewer");
  const service = createSupabaseServiceServerClient();

  const links = await service
    .from("shooting_session_players")
    .select("session_id")
    .eq("player_id", playerId);
  if (links.error) throw links.error;

  const sessionIds = (links.data || []).map((r) => r.session_id);
  if (!sessionIds.length) return [];

  const sessions = await service
    .from("shooting_sessions")
    .select("*")
    .in("id", sessionIds)
    .order("fecha", { ascending: false });
  if (sessions.error) throw sessions.error;

  const enriched = await Promise.all((sessions.data || []).map(attachPlayerIds));
  return enriched;
}

export async function getShootingSession(userId, sessionId) {
  const service = createSupabaseServiceServerClient();
  const result = await service.from("shooting_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  const session = await attachPlayerIds(result.data);
  for (const pid of session.player_ids) {
    await requirePlayerAccess(userId, pid, "viewer");
  }
  return session;
}

export async function createShootingSession(userId, playerId, body) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();

  const playerIds = Array.isArray(body?.player_ids) && body.player_ids.length
    ? body.player_ids.map(String)
    : [playerId];

  for (const pid of playerIds) {
    await requirePlayerAccess(userId, pid, "editor");
  }

  const sessionType = playerIds.length > 1 ? "group" : "individual";
  const row = {
    nombre: String(body?.nombre || "Sesión de tiro").trim() || "Sesión de tiro",
    fecha: body?.fecha || new Date().toISOString().slice(0, 10),
    zones: body?.zones || {},
    session_type: sessionType,
    created_by_user_id: userId,
    updated_by_user_id: userId
  };

  const sessionResult = await service.from("shooting_sessions").insert(row).select("*").single();
  if (sessionResult.error) throw sessionResult.error;

  const junctionRows = playerIds.map((pid) => ({
    session_id: sessionResult.data.id,
    player_id: pid
  }));
  const junctionResult = await service.from("shooting_session_players").insert(junctionRows);
  if (junctionResult.error) throw junctionResult.error;

  for (const pid of playerIds) {
    await recordActivityEvent({
      playerId: pid,
      actorUserId: userId,
      eventType: "shooting_session.created",
      entityType: "shooting_session",
      entityId: sessionResult.data.id,
      summary: `Sesión de tiro: ${row.nombre}`
    });
  }

  return attachPlayerIds(sessionResult.data);
}

export async function updateShootingSession(userId, sessionId, body) {
  const existing = await getShootingSession(userId, sessionId);
  for (const pid of existing.player_ids) {
    await requirePlayerAccess(userId, pid, "editor");
  }

  const service = createSupabaseServiceServerClient();
  const updates = { updated_by_user_id: userId };
  if (body.nombre !== undefined) updates.nombre = body.nombre;
  if (body.fecha !== undefined) updates.fecha = body.fecha;
  if (body.zones !== undefined) updates.zones = body.zones;

  const result = await service
    .from("shooting_sessions")
    .update(updates)
    .eq("id", sessionId)
    .select("*")
    .single();
  if (result.error) throw result.error;

  if (Array.isArray(body?.player_ids)) {
    await service.from("shooting_session_players").delete().eq("session_id", sessionId);
    const junctionRows = body.player_ids.map((pid) => ({
      session_id: sessionId,
      player_id: pid
    }));
    const junctionResult = await service.from("shooting_session_players").insert(junctionRows);
    if (junctionResult.error) throw junctionResult.error;
  }

  const session = await attachPlayerIds(result.data);
  for (const pid of session.player_ids) {
    await recordActivityEvent({
      playerId: pid,
      actorUserId: userId,
      eventType: "shooting_session.updated",
      entityType: "shooting_session",
      entityId: sessionId,
      summary: `Sesión actualizada: ${session.nombre}`
    });
  }

  return session;
}

export async function deleteShootingSession(userId, sessionId) {
  const existing = await getShootingSession(userId, sessionId);
  for (const pid of existing.player_ids) {
    await requirePlayerAccess(userId, pid, "editor");
  }

  const service = createSupabaseServiceServerClient();
  const result = await service.from("shooting_sessions").delete().eq("id", sessionId);
  if (result.error) throw result.error;

  for (const pid of existing.player_ids) {
    await recordActivityEvent({
      playerId: pid,
      actorUserId: userId,
      eventType: "shooting_session.deleted",
      entityType: "shooting_session",
      entityId: sessionId,
      summary: `Sesión eliminada: ${existing.nombre}`
    });
  }
}

export async function buildShootingHeatmapPayload(userId, playerIds) {
  const service = createSupabaseServiceServerClient();
  const allSessions = [];

  for (const playerId of playerIds) {
    const sessions = await listShootingSessionsForPlayer(userId, playerId);
    sessions.forEach((s) => {
      if (!allSessions.some((x) => x.id === s.id)) allSessions.push(s);
    });
  }

  allSessions.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  return {
    version: 2,
    active_session_id: allSessions[0]?.id || null,
    sessions: allSessions.map((s) => ({
      id: s.id,
      fecha: s.fecha,
      nombre: s.nombre,
      player_ids: s.player_ids,
      zones: s.zones || {},
      created_at: s.created_at,
      updated_at: s.updated_at
    }))
  };
}
