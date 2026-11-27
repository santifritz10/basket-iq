import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { playerDomainFlags } from "@/lib/server/player-domain-flags";
import { recordActivityEvent } from "@/services/server/activity-service";
import * as core from "@/lib/player-dev/core";
import * as goalsCore from "@/lib/player-dev/goals-core";
import * as planCore from "@/lib/player-dev/plan-core";
import * as reportsCore from "@/lib/player-dev/reports-core";
import * as mediaCore from "@/lib/player-dev/media-core";
import { libraryList } from "@/lib/player-dev/plan";
import { ACADEMY_ARTICLES } from "@/lib/server/assistant/academy-registry";
import { generateAssistantReply } from "@/lib/server/assistant/gemini";
import { checkRateLimit } from "@/lib/server/assistant/rate-limit";
import { buildSystemInstruction } from "@/lib/server/assistant/prompts";
import { createConversation, insertMessage, touchConversation } from "@/lib/server/assistant/conversations";

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

// --- Etapa 4: rutinas, trabajo planificado y asistencia ---
// La biblioteca de ejercicios son los mismos contenidos de Basket Lab Academy (solo lectura).

function planDeps(userId) {
  return { ...deps(userId), articles: ACADEMY_ARTICLES };
}

export async function getPlanning(userId) {
  requireRelationalMode();
  return planCore.loadPlanning(db(), userId, { articles: ACADEMY_ARTICLES });
}

export async function addRoutine(userId, body) {
  requireRelationalMode();
  return planCore.createRoutine(db(), userId, body, planDeps(userId));
}

export async function editRoutine(userId, routineId, body) {
  requireRelationalMode();
  return planCore.updateRoutine(db(), userId, routineId, body, planDeps(userId));
}

export async function addPlanItem(userId, playerId, body) {
  requireRelationalMode();
  return planCore.createPlanItem(db(), userId, playerId, body, planDeps(userId));
}

export async function editPlanItem(userId, playerId, itemId, body) {
  requireRelationalMode();
  return planCore.updatePlanItem(db(), userId, playerId, itemId, body, deps(userId));
}

export async function addAttendance(userId, body) {
  requireRelationalMode();
  return planCore.saveAttendance(db(), userId, body);
}

export async function getTrainingOverview(userId, ref) {
  requireRelationalMode();
  return planCore.loadTrainingOverview(db(), userId, ref);
}


// ---------------------------------------------------------------------------
// Etapa 5: informes y Asistente IA
// ---------------------------------------------------------------------------

export async function getReports(userId, playerId) {
  requireRelationalMode();
  return reportsCore.listReports(db(), userId, playerId);
}

export async function getReport(userId, reportId) {
  requireRelationalMode();
  return reportsCore.getReport(db(), userId, reportId);
}

export async function addReport(userId, playerId, body) {
  requireRelationalMode();
  return reportsCore.createReport(db(), userId, playerId, body);
}

export async function editReport(userId, reportId, body) {
  requireRelationalMode();
  return reportsCore.updateReport(db(), userId, reportId, body, deps(userId));
}

export async function getInsights(userId, playerId, query) {
  requireRelationalMode();
  return reportsCore.loadInsights(db(), userId, playerId, query, { library: libraryList(ACADEMY_ARTICLES) });
}

/** Usa el Asistente IA existente: mismo modelo de Gemini, mismas instrucciones base y mismos límites. */
export async function askAssistant(userId, playerId, body) {
  requireRelationalMode();
  return reportsCore.askAboutPlayer(db(), userId, playerId, body, {
    library: libraryList(ACADEMY_ARTICLES),
    generate: generateAssistantReply,
    rateLimit: checkRateLimit,
    buildInstruction: (sections) => buildSystemInstruction("tecnico", sections),
    // La consulta queda en el historial del Asistente (sin el resumen del jugador, que no se guarda).
    saveHistory: body?.save_history === false
      ? null
      : async ({ question, answer, model, truncated }) => {
          const conv = await createConversation(userId, { firstMessage: `Análisis de jugador: ${question}`, mode: "tecnico" });
          await insertMessage(userId, conv.id, { role: "user", text: `[Análisis de jugador con datos de Jugadores Lab] ${question}`, mode: "tecnico" });
          await insertMessage(userId, conv.id, { role: "model", text: answer, mode: "tecnico", model, truncated });
          await touchConversation(userId, conv.id, { mode: "tecnico" });
          return conv.id;
        }
  });
}

// ---------------------------------------------------------------------------
// Etapa 6: imágenes en Storage y datos del sistema anterior
// ---------------------------------------------------------------------------

export async function uploadMedia(userId, playerId, body) {
  requireRelationalMode();
  const client = db();
  return mediaCore.uploadPlayerImage(client, client.storage, userId, playerId, body);
}

export async function getDataStatus(userId) {
  requireRelationalMode();
  const client = db();
  const [media, legacy] = await Promise.all([mediaCore.mediaStatus(client, userId), mediaCore.legacyStatus(client, userId)]);
  return { media, legacy };
}

export async function runMediaAction(userId, body) {
  requireRelationalMode();
  const client = db();
  if (body?.action === "migrate") return { result: await mediaCore.migrateLegacyImages(client, client.storage, userId) };
  if (body?.action === "release") return { result: await mediaCore.releaseLegacyImages(client, client.storage, userId) };
  throw new core.DevError("Acción inválida.", 400, "invalid_action");
}
