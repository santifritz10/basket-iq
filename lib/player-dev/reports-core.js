/**
 * Inteligencia e informes — reglas del servidor.
 * - Informes en public.player_reports: se crean como BORRADOR (solo los ve su autor), el entrenador los
 *   revisa y edita, y recién ahí los comparte. Nada se publica solo.
 * - Consultas al Asistente IA: mismo motor (Gemini) y mismos límites que el Asistente existente; se
 *   envía un resumen minimizado y sin datos identificatorios, solo cuando el entrenador lo pide.
 */
import { DevError, activity, check, loadProfile, requireAccess } from "./core.js";
import { isUuid } from "./model.js";
import {
  ASK_PRESETS,
  PLAYER_ANALYSIS_RULES,
  REPORT_SECTIONS,
  REPORT_TYPES,
  buildDigest,
  defaultPeriod,
  digestToText,
  reportSections,
  shiftDate,
  validatePeriod
} from "./insights.js";

export function isReportsNotInstalledError(error) {
  const code = String(error?.code || "");
  return (code === "42703" || code === "PGRST204") && /status|period_from|period_to|shared_at|archived_at/.test(String(error?.message || ""));
}

function check15(result) {
  if (result.error && isReportsNotInstalledError(result.error)) {
    throw new DevError("Falta correr la migración docs/sql/015-player-reports.sql en Supabase.", 503, "reports_not_installed");
  }
  return check(result);
}

const SECTION_IDS = REPORT_SECTIONS.map((s) => s.id);
const MAX_TEXT = 8000;

/** Un borrador solo lo ve (y edita) quien lo creó. Los informes viejos (status NULL) cuentan como compartidos. */
export function canSeeReport(row, userId) {
  return row.status !== "draft" || row.created_by_user_id === userId;
}

function toDto(row) {
  const meta = row.metadata || {};
  return {
    id: row.id,
    player_id: row.player_id,
    title: row.title,
    report_type: row.report_type,
    status: row.status || "shared",
    period_from: row.period_from || null,
    period_to: row.period_to || null,
    sections: Array.isArray(meta.sections) ? meta.sections : null,
    texts: meta.texts || (row.body ? { summary: row.body } : {}),
    snapshot: meta.snapshot || null,
    ai_assisted: Boolean(meta.ai_assisted),
    generated_at: meta.generated_at || null,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    shared_at: row.shared_at || null,
    archived_at: row.archived_at || null,
    legacy: !row.status && !meta.version
  };
}

export async function listReports(db, userId, playerId) {
  await requireAccess(db, userId, playerId, "viewer");
  const res = await db.from("player_reports").select("*").eq("player_id", playerId).order("created_at", { ascending: false });
  if (res.error && isReportsNotInstalledError(res.error)) return { installed: false, reports: [] };
  const rows = check(res) || [];
  return { installed: true, reports: rows.filter((r) => canSeeReport(r, userId)).map(toDto) };
}

async function loadReport(db, userId, reportId, min) {
  if (!isUuid(reportId)) throw new DevError("Informe inexistente.", 404, "not_found");
  const row = check15(await db.from("player_reports").select("*").eq("id", reportId).maybeSingle());
  if (!row) throw new DevError("Informe inexistente.", 404, "not_found");
  await requireAccess(db, userId, row.player_id, min);
  if (!canSeeReport(row, userId)) throw new DevError("Informe inexistente.", 404, "not_found");
  return row;
}

export async function getReport(db, userId, reportId) {
  const row = await loadReport(db, userId, reportId, "viewer");
  const player = check(await db.from("players").select("id, display_name, category, position").eq("id", row.player_id).maybeSingle());
  return { report: toDto(row), player };
}

export function validateReportInput(body, todayIso) {
  const errors = [];
  const type = REPORT_TYPES.find((t) => t.id === body?.report_type);
  if (!type) errors.push("Elegí el tipo de informe.");
  const def = defaultPeriod(type?.id, todayIso);
  const from = body?.period_from || def.from;
  const to = body?.period_to || def.to;
  const pErr = validatePeriod(from, to, todayIso);
  if (pErr) errors.push(pErr);
  let sections = Array.isArray(body?.sections) ? body.sections.filter((s) => SECTION_IDS.includes(s)) : SECTION_IDS.filter((s) => s !== "notes");
  if (!sections.length) errors.push("Elegí al menos una sección.");
  if (!sections.includes("summary")) sections = ["summary", ...sections];
  const title = String(body?.title || "").trim().slice(0, 160) || `Informe ${type ? type.label.toLowerCase() : ""} · ${from} a ${to}`.replace(/\s+/g, " ");
  return { ok: !errors.length, errors, value: { type, from, to, sections: SECTION_IDS.filter((s) => sections.includes(s)), title } };
}

/** Crea un BORRADOR con los datos del período congelados (snapshot) y textos iniciales editables. */
export async function createReport(db, userId, playerId, body, { now = new Date() } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const todayIso = now.toISOString().slice(0, 10);
  const v = validateReportInput(body, todayIso);
  if (!v.ok) {
    const err = new DevError(v.errors[0], 400, "invalid_report");
    err.details = v.errors;
    throw err;
  }
  const { type, from, to, sections, title } = v.value;
  const profile = await loadProfile(db, userId, playerId);
  const digest = buildDigest(profile, { from, to, today: todayIso, includeNotes: sections.includes("notes"), viewerId: userId });
  const all = reportSections(digest);
  const texts = Object.fromEntries(sections.map((s) => [s, all[s] || ""]));
  const row = check15(
    await db
      .from("player_reports")
      .insert({
        player_id: playerId,
        title,
        body: texts.summary || null,
        report_type: type.id,
        status: "draft",
        period_from: from,
        period_to: to,
        metadata: { version: 1, sections, texts, snapshot: digest, generated_at: now.toISOString(), ai_assisted: false },
        created_by_user_id: userId,
        updated_by_user_id: userId
      })
      .select("*")
      .single()
  );
  return { report: toDto(row) };
}

/**
 * Edita un informe. Solo los borradores se editan (y solo su autor); al compartir queda fijo.
 * Transiciones: borrador → compartido | archivado; compartido → archivado; archivado → compartido.
 */
export async function updateReport(db, userId, reportId, body, { onActivity, now = new Date() } = {}) {
  const row = await loadReport(db, userId, reportId, "editor");
  const status = row.status || "shared";
  const patch = { updated_by_user_id: userId };
  const meta = { ...(row.metadata || {}) };
  const editsContent = ["title", "texts", "ai_assisted"].some((k) => Object.prototype.hasOwnProperty.call(body || {}, k));
  if (editsContent) {
    if (status !== "draft") throw new DevError("Un informe compartido no se edita. Creá uno nuevo si hace falta corregirlo.", 409, "report_locked");
    if (body.title !== undefined) {
      const t = String(body.title || "").trim().slice(0, 160);
      if (!t) throw new DevError("Poné un título.", 400, "invalid_report");
      patch.title = t;
    }
    if (body.texts && typeof body.texts === "object") {
      const texts = { ...(meta.texts || {}) };
      Object.entries(body.texts).forEach(([k, val]) => {
        if (!(meta.sections || SECTION_IDS).includes(k)) return;
        texts[k] = String(val ?? "").slice(0, MAX_TEXT);
      });
      meta.texts = texts;
      patch.body = texts.summary || null;
    }
    if (body.ai_assisted === true) meta.ai_assisted = true;
    patch.metadata = meta;
  }
  if (body?.status !== undefined && body.status !== status) {
    const next = body.status;
    const allowed = { draft: ["shared", "archived"], shared: ["archived"], archived: ["shared"] };
    if (!(allowed[status] || []).includes(next)) throw new DevError("Ese cambio de estado no está permitido.", 400, "invalid_status");
    patch.status = next;
    if (next === "shared") {
      patch.shared_at = row.shared_at || now.toISOString();
      patch.archived_at = null;
    }
    if (next === "archived") patch.archived_at = now.toISOString();
  }
  const saved = check15(await db.from("player_reports").update(patch).eq("id", row.id).select("*").single());
  if (patch.status === "shared" && status === "draft") {
    await activity(onActivity, {
      playerId: row.player_id,
      eventType: "report.shared",
      entityType: "player_report",
      entityId: row.id,
      summary: `Informe compartido: ${saved.title}`
    });
  }
  return { report: toDto(saved) };
}

// ---------------------------------------------------------------------------
// Análisis y Asistente IA
// ---------------------------------------------------------------------------

const ASK_DAYS = [30, 90, 180, 365];

export function parseAskOptions(input) {
  const days = ASK_DAYS.includes(Number(input?.days)) ? Number(input.days) : 90;
  const includeNotes = input?.include_notes === true || input?.include_notes === "1" || input?.include_notes === "true";
  return { days, includeNotes };
}

/** Resumen + señales + datos faltantes (sin llamar a la IA). Incluye el texto exacto que se enviaría. */
export async function loadInsights(db, userId, playerId, input, { now = new Date(), library = [] } = {}) {
  await requireAccess(db, userId, playerId, "viewer");
  const { days, includeNotes } = parseAskOptions(input);
  const todayIso = now.toISOString().slice(0, 10);
  const profile = await loadProfile(db, userId, playerId);
  const digest = buildDigest(profile, { from: shiftDate(todayIso, -(days - 1)), to: todayIso, today: todayIso, includeNotes, viewerId: userId });
  return { days, includeNotes, digest, sent: digestToText(digest, { library }), presets: ASK_PRESETS };
}

/**
 * Pregunta al Asistente IA sobre un jugador. `generate`, `rateLimit` y `buildInstruction` son los del
 * Asistente existente (se inyectan para poder probarlo sin llamar a Gemini).
 */
export async function askAboutPlayer(db, userId, playerId, body, { generate, rateLimit, buildInstruction, library = [], now = new Date(), saveHistory = null } = {}) {
  const preset = ASK_PRESETS.find((p) => p.id === body?.preset);
  const question = String(body?.question || preset?.text || "").trim();
  if (!question) throw new DevError("Escribí una pregunta.", 400, "invalid_question");
  if (question.length > 1000) throw new DevError("La pregunta puede tener hasta 1000 caracteres.", 400, "invalid_question");
  const insights = await loadInsights(db, userId, playerId, body, { now, library });
  const limit = rateLimit(userId);
  if (!limit.allowed) {
    throw new DevError(
      limit.scope === "minute" ? "Estás enviando muchas consultas seguidas. Esperá un minuto y volvé a intentar." : "Llegaste al límite diario de consultas al asistente.",
      429,
      "rate_limited"
    );
  }
  const systemInstruction = buildInstruction([
    { title: "Análisis de jugador", content: PLAYER_ANALYSIS_RULES },
    { title: "Resumen del jugador (anonimizado)", content: insights.sent }
  ]);
  let reply;
  try {
    reply = await generate({ systemInstruction, messages: [{ role: "user", text: question }] });
  } catch (error) {
    const status = Number(error?.httpStatus || error?.status) || 502;
    throw new DevError(error?.message || "El Asistente no respondió. Probá de nuevo.", status >= 500 ? 502 : status, error?.code || "assistant_error");
  }
  let conversationId = null;
  if (saveHistory) {
    try {
      conversationId = await saveHistory({ question, answer: reply.text, model: reply.model, truncated: reply.truncated });
    } catch {
      conversationId = null; // el historial es opcional: la respuesta se devuelve igual
    }
  }
  return { question, answer: reply.text, truncated: Boolean(reply.truncated), model: reply.model || null, days: insights.days, includeNotes: insights.includeNotes, conversationId };
}
