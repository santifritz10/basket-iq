/**
 * Utilidades puras del asistente, compartidas entre servidor, cliente y tests.
 * No importan nada del servidor ni del navegador.
 */

export const TITLE_MAX_CHARS = 60;
export const DEFAULT_CONVERSATION_TITLE = "Nueva conversación";

const LEADING_FILLERS = /^(hola|buenas|buen día|buenos días|buenas tardes|buenas noches|che|ey|hey)[\s,!.¡:;-]+/i;

/**
 * Genera un título corto a partir del primer mensaje del entrenador,
 * sin llamar a Gemini: primera oración, sin saludos, cortada en una palabra.
 */
export function makeConversationTitle(text, maxChars = TITLE_MAX_CHARS) {
  let value = String(text || "")
    .replace(/[`*_#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (let i = 0; i < 2; i += 1) value = value.replace(LEADING_FILLERS, "").trim();

  const sentence = value.match(/^(.+?[.?!])(\s|$)/);
  if (sentence && sentence[1].length >= 12) value = sentence[1];
  value = value.replace(/^[¿¡]+/, "").replace(/[.!?¿¡,;:\s]+$/, "").trim();

  if (!value) return DEFAULT_CONVERSATION_TITLE;
  if (value.length > maxChars) {
    const cut = value.slice(0, maxChars + 1);
    const lastSpace = cut.lastIndexOf(" ");
    value = `${(lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut.slice(0, maxChars)).replace(/[,;:\s]+$/, "")}…`;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Normaliza un título escrito por el entrenador. Devuelve "" si no es válido. */
export function normalizeTitle(text, maxChars = 120) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars)
    .trim();
}

/**
 * Arma el historial que se envía a Gemini: los últimos mensajes, dentro de
 * los límites de cantidad y caracteres, empezando siempre por el entrenador.
 */
export function buildGeminiHistory(messages, { maxMessages = 20, maxChars = 24000 } = {}) {
  let history = (messages || [])
    .filter((m) => (m.role === "user" || m.role === "model") && String(m.text || "").trim())
    .map((m) => ({ role: m.role, text: String(m.text) }))
    .slice(-maxMessages);
  let total = history.reduce((sum, m) => sum + m.text.length, 0);
  while (history.length > 1 && total > maxChars) {
    total -= history[0].text.length;
    history = history.slice(1);
  }
  while (history.length > 1 && history[0].role !== "user") history = history.slice(1);
  if (history.length === 1 && history[0].text.length > maxChars) {
    history = [{ role: history[0].role, text: history[0].text.slice(-maxChars) }];
  }
  return history;
}

/** Escapa los comodines de LIKE para buscar el texto literal. */
export function escapeLikePattern(text) {
  return String(text || "").replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Agrupa conversaciones por actividad: Hoy, Ayer, Últimos 7 días, Últimos 30 días, Anteriores. */
export function groupConversationsByActivity(conversations, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 24 * 60 * 60 * 1000;
  const groups = [
    { id: "today", label: "Hoy", items: [] },
    { id: "yesterday", label: "Ayer", items: [] },
    { id: "week", label: "Últimos 7 días", items: [] },
    { id: "month", label: "Últimos 30 días", items: [] },
    { id: "older", label: "Anteriores", items: [] }
  ];
  for (const c of conversations || []) {
    const t = new Date(c.lastMessageAt || c.updatedAt || c.createdAt).getTime();
    let g = 4;
    if (t >= startOfToday) g = 0;
    else if (t >= startOfToday - DAY) g = 1;
    else if (t >= startOfToday - 7 * DAY) g = 2;
    else if (t >= startOfToday - 30 * DAY) g = 3;
    groups[g].items.push(c);
  }
  return groups.filter((g) => g.items.length);
}
