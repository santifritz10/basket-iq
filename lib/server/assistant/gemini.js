import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

/**
 * gemini-2.5-flash tiene cuota gratuita en la API de Gemini (ver
 * https://ai.google.dev/gemini-api/docs/pricing). Se puede cambiar con la
 * variable GEMINI_MODEL sin tocar código.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const GENERATION_LIMITS = {
  maxOutputTokens: 4096,
  thinkingBudget: 1024,
  temperature: 0.7,
  timeoutMs: 50_000
};

export class AssistantError extends Error {
  constructor(code, userMessage, httpStatus) {
    super(userMessage);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function getGeminiModel() {
  return (process.env.GEMINI_MODEL || "").trim() || DEFAULT_GEMINI_MODEL;
}

let cachedClient = null;
let cachedKey = null;

function getClient() {
  if (typeof process.env.NEXT_PUBLIC_GEMINI_API_KEY !== "undefined") {
    throw new AssistantError(
      "insecure_config",
      "La clave de Gemini está mal configurada. Avisale al administrador.",
      500
    );
  }
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new AssistantError(
      "not_configured",
      "El asistente todavía no está configurado: falta la clave de Gemini en el servidor.",
      503
    );
  }
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }
  return cachedClient;
}

/** Une mensajes seguidos del mismo rol para mantener la alternancia que espera Gemini. */
export function toGeminiContents(messages) {
  const contents = [];
  for (const m of messages) {
    const last = contents[contents.length - 1];
    if (last && last.role === m.role) {
      last.parts.push({ text: m.text });
    } else {
      contents.push({ role: m.role, parts: [{ text: m.text }] });
    }
  }
  return contents;
}

function mapApiError(error) {
  const status = Number(error?.status) || 0;
  if (status === 429) {
    return new AssistantError(
      "quota_exceeded",
      "Se alcanzó el límite de uso gratuito de Gemini por ahora. Esperá unos minutos y volvé a intentar.",
      429
    );
  }
  const detail = String(error?.message || "");
  if (status === 400 && /API[_ ]KEY|api key/i.test(detail)) {
    return new AssistantError(
      "auth_failed",
      "La clave de Gemini no es válida. Revisá la variable GEMINI_API_KEY del servidor.",
      502
    );
  }
  if (status === 400 && /FAILED_PRECONDITION|location is not supported/i.test(detail)) {
    return new AssistantError(
      "unavailable_region",
      "La cuota gratuita de Gemini no está disponible para esta cuenta o región.",
      502
    );
  }
  if (status === 400) {
    return new AssistantError("invalid_request", "Gemini no pudo procesar la consulta. Probá reformularla.", 400);
  }
  if (status === 401 || status === 403) {
    return new AssistantError(
      "auth_failed",
      "La clave de Gemini no es válida o no tiene permisos. Revisá la configuración del servidor.",
      502
    );
  }
  if (status === 404) {
    return new AssistantError(
      "model_not_found",
      "El modelo de Gemini configurado no está disponible para esta clave.",
      502
    );
  }
  if (status >= 500) {
    return new AssistantError("upstream_unavailable", "Gemini no está disponible en este momento. Probá de nuevo en un rato.", 503);
  }
  return new AssistantError("upstream_error", "No se pudo obtener respuesta de Gemini.", 502);
}

/**
 * Envía la conversación a Gemini y devuelve { text, truncated, model }.
 * Sin reintentos automáticos: cada consulta del entrenador es una sola llamada.
 */
export async function generateAssistantReply({ systemInstruction, messages }) {
  const client = getClient();
  const model = getGeminiModel();

  const config = {
    systemInstruction,
    maxOutputTokens: GENERATION_LIMITS.maxOutputTokens,
    temperature: GENERATION_LIMITS.temperature,
    httpOptions: {
      timeout: GENERATION_LIMITS.timeoutMs,
      retryOptions: { attempts: 1 }
    }
  };
  if (model.startsWith("gemini-2.5")) {
    config.thinkingConfig = { thinkingBudget: GENERATION_LIMITS.thinkingBudget };
  }

  let response;
  try {
    response = await client.models.generateContent({
      model,
      contents: toGeminiContents(messages),
      config
    });
  } catch (error) {
    if (error instanceof AssistantError) throw error;
    if (error instanceof ApiError || typeof error?.status === "number") {
      // Solo se registra el código de estado: nunca la clave ni el contenido.
      console.error("[assistant] Gemini API error", { status: error.status, model });
      throw mapApiError(error);
    }
    console.error("[assistant] Gemini connection error", { name: error?.name, model });
    throw new AssistantError(
      "connection_error",
      "No se pudo conectar con Gemini. Revisá tu conexión y volvé a intentar.",
      504
    );
  }

  const blockReason = response?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AssistantError("blocked", "Gemini no respondió esta consulta por sus políticas de contenido. Probá reformularla.", 422);
  }

  const text = (response?.text || "").trim();
  const finishReason = response?.candidates?.[0]?.finishReason;
  if (!text) {
    throw new AssistantError("empty_response", "Gemini devolvió una respuesta vacía. Probá de nuevo o reformulá la consulta.", 502);
  }
  return { text, truncated: finishReason === "MAX_TOKENS", model };
}
