import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { AssistantError } from "@/lib/server/assistant/gemini";
import {
  DEFAULT_CONVERSATION_TITLE,
  escapeLikePattern,
  makeConversationTitle,
  normalizeTitle
} from "@/lib/assistant/conversation-utils";

/**
 * Acceso a las conversaciones del asistente (docs/sql/007-assistant-conversations.sql).
 *
 * Se usa la service role, así que TODAS las consultas filtran por user_id
 * del usuario autenticado en el servidor. Nunca se confía en ids de usuario
 * que vengan del navegador.
 */

const CONVERSATION_COLUMNS = "id, project_id, title, title_source, mode, created_at, updated_at, last_message_at";
const MESSAGE_COLUMNS = "id, seq, role, content, mode, truncated, model, created_at";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CONVERSATION_LIMITS = {
  listMax: 200,
  searchMax: 50,
  messagesMax: 500
};

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function db() {
  return createSupabaseServiceServerClient();
}

/** Traduce errores de Supabase a mensajes para el entrenador. */
function storageError(error, action) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  console.error("[assistant] storage error", { action, code, message: message.slice(0, 200) });
  if (code === "PGRST205" || code === "42P01" || (/assistant_(conversations|messages)/.test(message) && /does not exist|schema cache/i.test(message))) {
    return new AssistantError(
      "storage_not_ready",
      "El historial todavía no está activado en la base de datos: falta ejecutar docs/sql/007-assistant-conversations.sql en Supabase.",
      503
    );
  }
  return new AssistantError("storage_error", "No se pudo acceder al historial de conversaciones. Probá de nuevo.", 500);
}

export function toConversationDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id || null,
    title: row.title,
    titleSource: row.title_source,
    mode: row.mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at
  };
}

export function toMessageDto(row) {
  return {
    id: row.id,
    role: row.role,
    text: row.content,
    mode: row.mode || null,
    truncated: Boolean(row.truncated),
    model: row.model || null,
    createdAt: row.created_at
  };
}

export async function listConversations(userId, { query = "" } = {}) {
  const supabase = db();
  const q = String(query || "").trim().slice(0, 100);

  if (!q) {
    const { data, error } = await supabase
      .from("assistant_conversations")
      .select(CONVERSATION_COLUMNS)
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(CONVERSATION_LIMITS.listMax);
    if (error) throw storageError(error, "list");
    return (data || []).map(toConversationDto);
  }

  const pattern = `%${escapeLikePattern(q)}%`;
  const [byTitle, byMessage] = await Promise.all([
    supabase
      .from("assistant_conversations")
      .select(CONVERSATION_COLUMNS)
      .eq("user_id", userId)
      .ilike("title", pattern)
      .order("last_message_at", { ascending: false })
      .limit(CONVERSATION_LIMITS.searchMax),
    supabase
      .from("assistant_messages")
      .select("conversation_id")
      .eq("user_id", userId)
      .ilike("content", pattern)
      .order("seq", { ascending: false })
      .limit(200)
  ]);
  if (byTitle.error) throw storageError(byTitle.error, "search_title");
  if (byMessage.error) throw storageError(byMessage.error, "search_messages");

  const found = new Map((byTitle.data || []).map((row) => [row.id, row]));
  const extraIds = [...new Set((byMessage.data || []).map((m) => m.conversation_id))].filter((id) => !found.has(id));
  if (extraIds.length) {
    const { data, error } = await supabase
      .from("assistant_conversations")
      .select(CONVERSATION_COLUMNS)
      .eq("user_id", userId)
      .in("id", extraIds.slice(0, CONVERSATION_LIMITS.searchMax));
    if (error) throw storageError(error, "search_fetch");
    for (const row of data || []) found.set(row.id, row);
  }
  return [...found.values()]
    .sort((a, b) => String(b.last_message_at).localeCompare(String(a.last_message_at)))
    .slice(0, CONVERSATION_LIMITS.searchMax)
    .map(toConversationDto);
}

/** Devuelve la conversación si pertenece al usuario, o null. */
export async function getConversation(userId, conversationId) {
  if (!isUuid(conversationId)) return null;
  const { data, error } = await db()
    .from("assistant_conversations")
    .select(CONVERSATION_COLUMNS)
    .eq("user_id", userId)
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw storageError(error, "get");
  return toConversationDto(data);
}

export async function listMessages(userId, conversationId, { limit = CONVERSATION_LIMITS.messagesMax } = {}) {
  const { data, error } = await db()
    .from("assistant_messages")
    .select(MESSAGE_COLUMNS)
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) throw storageError(error, "messages");
  return (data || []).reverse().map(toMessageDto);
}

export async function createConversation(userId, { firstMessage = "", mode, projectId = null }) {
  const title = firstMessage ? makeConversationTitle(firstMessage) : DEFAULT_CONVERSATION_TITLE;
  const { data, error } = await db()
    .from("assistant_conversations")
    .insert({ user_id: userId, title, title_source: "auto", mode, project_id: projectId })
    .select(CONVERSATION_COLUMNS)
    .single();
  if (error) throw storageError(error, "create");
  return toConversationDto(data);
}

export async function updateConversation(userId, conversationId, { title, mode }) {
  const patch = {};
  if (typeof title === "string") {
    const clean = normalizeTitle(title);
    if (!clean) throw new AssistantError("invalid_title", "El título no puede quedar vacío.", 400);
    patch.title = clean;
    patch.title_source = "user";
  }
  if (typeof mode === "string") patch.mode = mode;
  if (!Object.keys(patch).length) return getConversation(userId, conversationId);

  const { data, error } = await db()
    .from("assistant_conversations")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", conversationId)
    .select(CONVERSATION_COLUMNS)
    .maybeSingle();
  if (error) throw storageError(error, "update");
  return toConversationDto(data);
}

/** Borra la conversación y sus mensajes (cascada). Devuelve true si existía. */
export async function deleteConversation(userId, conversationId) {
  if (!isUuid(conversationId)) return false;
  const { data, error } = await db()
    .from("assistant_conversations")
    .delete()
    .eq("user_id", userId)
    .eq("id", conversationId)
    .select("id");
  if (error) throw storageError(error, "delete");
  return Boolean(data?.length);
}

export async function insertMessage(userId, conversationId, { role, text, mode = null, truncated = false, model = null }) {
  const { data, error } = await db()
    .from("assistant_messages")
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content: text,
      mode,
      truncated,
      model
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw storageError(error, "insert_message");
  return toMessageDto(data);
}

export async function deleteMessage(userId, conversationId, messageId) {
  const { error } = await db()
    .from("assistant_messages")
    .delete()
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .eq("id", messageId);
  if (error) throw storageError(error, "delete_message");
}

/** Marca actividad reciente (ordena la lista) y guarda el último modo usado. */
export async function touchConversation(userId, conversationId, { mode } = {}) {
  const patch = { last_message_at: new Date().toISOString() };
  if (mode) patch.mode = mode;
  const { data, error } = await db()
    .from("assistant_conversations")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", conversationId)
    .select(CONVERSATION_COLUMNS)
    .maybeSingle();
  if (error) throw storageError(error, "touch");
  return toConversationDto(data);
}

/**
 * Contexto de Basket Lab Academy guardado con la conversación
 * (docs/sql/009-assistant-academy-context.sql). Se lee y se escribe aparte
 * para que el historial siga funcionando si la columna todavía no existe.
 */
function isMissingAcademyColumn(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return code === "42703" || code === "PGRST204" || /academy_context/.test(message);
}

export async function getAcademyContext(userId, conversationId) {
  if (!isUuid(conversationId)) return { available: true, value: null };
  const { data, error } = await db()
    .from("assistant_conversations")
    .select("academy_context")
    .eq("user_id", userId)
    .eq("id", conversationId)
    .maybeSingle();
  if (error) {
    if (isMissingAcademyColumn(error)) return { available: false, value: null };
    throw storageError(error, "get_academy");
  }
  return { available: true, value: data?.academy_context || null };
}

/** Devuelve true si quedó guardado; false si falta ejecutar la migración 009. */
export async function setAcademyContext(userId, conversationId, academy) {
  const { error } = await db()
    .from("assistant_conversations")
    .update({ academy_context: academy })
    .eq("user_id", userId)
    .eq("id", conversationId);
  if (error) {
    if (isMissingAcademyColumn(error)) {
      console.warn("[assistant] academy_context column missing: run docs/sql/009-assistant-academy-context.sql");
      return false;
    }
    throw storageError(error, "set_academy");
  }
  return true;
}
