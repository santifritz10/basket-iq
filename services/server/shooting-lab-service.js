import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { playerDomainFlags } from "@/lib/server/player-domain-flags";
import { recordActivityEvent } from "@/services/server/activity-service";
import * as core from "@/lib/shooting/lab-core";

/**
 * Shooting Lab escribe solo en el modelo relacional. Si el modo relacional
 * no está activo, los jugadores viven en el JSON antiguo y no hay a quién
 * atribuir un tiro: se bloquea con un aviso claro.
 */
function requireRelationalMode() {
  if (!playerDomainFlags.write) {
    throw new core.LabError(
      "Shooting Lab necesita el modo de jugadores relacional (PLAYER_CENTRIC_ENABLED).",
      409,
      "player_domain_inactive"
    );
  }
}

function db() {
  return createSupabaseServiceServerClient();
}

async function onActivity(userId, { playerId, eventType, entityId, summary, metadata }) {
  try {
    await recordActivityEvent({
      playerId,
      actorUserId: userId,
      eventType,
      entityType: "shooting_session",
      entityId,
      summary,
      metadata: metadata || {}
    });
  } catch (error) {
    // El registro de actividad nunca debe impedir guardar los tiros.
    console.warn("[ShootingLab] activity event failed", error?.message || error);
  }
}

function deps(userId) {
  return { onActivity: (e) => onActivity(userId, e) };
}

export function shootingLabMode() {
  return { relational: playerDomainFlags.write, realtime: playerDomainFlags.realtime };
}

export async function getShootingLabOverview(userId) {
  const mode = shootingLabMode();
  if (!mode.relational) return { mode, schema: { installed: false }, players: [], sessions: [], entries: [], goals: [] };
  const client = db();
  const schema = await core.schemaStatus(client);
  if (!schema.installed) {
    const players = await core.listPlayersForLab(client, userId);
    return { mode, schema, players, sessions: [], entries: [], goals: [] };
  }
  const overview = await core.loadOverview(client, userId);
  return { mode, schema, ...overview };
}

export async function getShootingLabSession(userId, sessionId) {
  requireRelationalMode();
  return core.loadSession(db(), userId, sessionId);
}

export async function createShootingLabSession(userId, body) {
  requireRelationalMode();
  return core.createSession(db(), userId, body, deps(userId));
}

export async function updateShootingLabSession(userId, sessionId, body) {
  requireRelationalMode();
  return core.updateSession(db(), userId, sessionId, body, deps(userId));
}

export async function duplicateShootingLabSession(userId, sessionId, body) {
  requireRelationalMode();
  return core.duplicateSession(db(), userId, sessionId, body, deps(userId));
}

export async function deleteShootingLabSession(userId, sessionId, body) {
  requireRelationalMode();
  return core.deleteSession(db(), userId, sessionId, body, deps(userId));
}

export async function addShootingLabEntries(userId, sessionId, items) {
  requireRelationalMode();
  return core.addEntries(db(), userId, sessionId, items);
}

export async function voidShootingLabEntry(userId, sessionId, entryId) {
  requireRelationalMode();
  return core.voidEntry(db(), userId, sessionId, entryId);
}
