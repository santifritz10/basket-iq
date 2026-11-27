import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { playerDomainFlags } from "@/lib/server/player-domain-flags";
import { recordActivityEvent } from "@/services/server/activity-service";
import * as core from "@/lib/player-dev/core";
import * as goalsCore from "@/lib/player-dev/goals-core";

/** Perfil y seguimiento escribe solo en el modelo relacional. */
function requireRelationalMode() {
  if (!playerDomainFlags.write) {
    throw new core.DevError("Esta sección necesita el modo de jugadores relacional (PLAYER_CENTRIC_ENABLED).", 409, "player_domain_inactive");
  }
}

function db() {
  return createSupabaseServiceServerClient();
}

function deps(userId) {
  return {
    onActivity: async ({ playerId, eventType, entityType, entityId, summary, metadata }) => {
      try {
        await recordActivityEvent({ playerId, actorUserId: userId, eventType, entityType, entityId, summary, metadata: metadata || {} });
      } catch (error) {
        console.warn("[PlayerDev] activity event failed", error?.message || error);
      }
    }
  };
}

export async function getRoster(userId) {
  if (!playerDomainFlags.write) return { mode: { relational: false }, schema: { installed: false }, players: [], teams: [], suggestions: [] };
  return { mode: { relational: true }, ...(await core.loadRoster(db(), userId)) };
}

export async function getProfile(userId, playerId) {
  requireRelationalMode();
  return core.loadProfile(db(), userId, playerId);
}

export async function addAssessment(userId, playerId, body) {
  requireRelationalMode();
  return core.createAssessment(db(), userId, playerId, body, deps(userId));
}

export async function removeAssessment(userId, playerId, batchId) {
  requireRelationalMode();
  return core.voidAssessment(db(), userId, playerId, batchId);
}

export async function getCriteria(userId) {
  requireRelationalMode();
  return core.listCriteria(db(), userId);
}

export async function addCriterion(userId, body) {
  requireRelationalMode();
  return core.createCriterion(db(), userId, body);
}

export async function editCriterion(userId, criterionId, body) {
  requireRelationalMode();
  return core.updateCriterion(db(), userId, criterionId, body);
}

export async function addStatRecord(userId, playerId, body) {
  requireRelationalMode();
  return core.createStatRecord(db(), userId, playerId, body, deps(userId));
}

export async function editStatRecord(userId, playerId, recordId, body) {
  requireRelationalMode();
  return core.updateStatRecord(db(), userId, playerId, recordId, body);
}

export async function removeStatRecord(userId, playerId, recordId) {
  requireRelationalMode();
  return core.voidStatRecord(db(), userId, playerId, recordId);
}

export async function addTeam(userId, body) {
  requireRelationalMode();
  return core.createTeam(db(), userId, body);
}

export async function editTeam(userId, teamId, body) {
  requireRelationalMode();
  return core.updateTeam(db(), userId, teamId, body);
}

export async function addTeamMember(userId, teamId, body) {
  requireRelationalMode();
  return core.addTeamMember(db(), userId, teamId, body);
}

export async function endTeamMember(userId, membershipId, body) {
  requireRelationalMode();
  return core.endTeamMember(db(), userId, membershipId, body);
}

// --- Etapa 3: objetivos medibles, notas clasificadas y comparación ---

export async function addGoal(userId, playerId, body) {
  requireRelationalMode();
  return goalsCore.createGoal(db(), userId, playerId, body, deps(userId));
}

export async function editGoal(userId, playerId, goalId, body) {
  requireRelationalMode();
  return goalsCore.updateGoal(db(), userId, playerId, goalId, body, deps(userId));
}

export async function addGoalCheckin(userId, playerId, goalId, body) {
  requireRelationalMode();
  return goalsCore.addCheckin(db(), userId, playerId, goalId, body, deps(userId));
}

export async function removeGoalCheckin(userId, playerId, checkinId) {
  requireRelationalMode();
  return goalsCore.voidCheckin(db(), userId, playerId, checkinId);
}

export async function addNote(userId, playerId, body) {
  requireRelationalMode();
  return goalsCore.createNote(db(), userId, playerId, body, deps(userId));
}

export async function editNote(userId, playerId, noteId, body) {
  requireRelationalMode();
  return goalsCore.updateNote(db(), userId, playerId, noteId, body);
}

export async function removeNote(userId, playerId, noteId) {
  requireRelationalMode();
  return goalsCore.deleteNote(db(), userId, playerId, noteId);
}

export async function getCompare(userId, ids) {
  requireRelationalMode();
  return goalsCore.loadCompare(db(), userId, ids);
}
