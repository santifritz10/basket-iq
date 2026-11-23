import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

/**
 * Modelo por defecto. gemini-2.5-flash dejó de estar disponible para claves
 * nuevas (la API responde 404 NOT_FOUND "no longer available to new users"),
 * aunque todavía figure en ListModels. gemini-3.5-flash admite generateContent,
 * no es preview y responde con la cuota gratuita de la API de Gemini.
 * Se puede cambiar con la variable GEMINI_MODEL sin tocar código.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

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

/**
 * El SDK pone el cuerpo JSON de la respuesta de Google en error.message.
 * Devuelve { apiStatus, apiMessage, reason, quotaIds } o campos vacíos si no se puede leer.
 */
function parseGoogleError(error) {
  const raw = String(error?.message || "");
  let body = null;
  const start = raw.indexOf("{");
  if (start !== -1) {
    try {
      body = JSON.parse(raw.slice(start));
    } catch {
      body = null;
    }
  }
  const err = body?.error || {};
  const details = Array.isArray(err.details) ? err.details : [];
  const reason = details.find((d) => d?.reason)?.reason || "";
  const quotaIds = details
    .flatMap((d) => (Array.isArray(d?.violations) ? d.violations : []))
    .map((v) => ({ quotaId: v?.quotaId || "", quotaValue: v?.quotaValue ?? "" }))
    .filter((v) => v.quotaId);
  return {
    apiStatus: String(err.status || ""),
    apiMessage: String(err.message || raw),
    reason,
    quotaIds
  };
}

function redactKey(text) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  const value = String(text || "").slice(0, 300);
  return key ? value.split(key).join("***") : value;
}

function mapApiError(error, model) {
  const status = Number(error?.status) || 0;
  const { apiStatus, apiMessage, reason, quotaIds } = parseGoogleError(error);

  // Solo se registran datos de diagnóstico de Google: nunca la clave ni el contenido.
  console.error("[assistant] Gemini API error", {
    status,
    apiStatus,
    reason,
    model,
    quota: quotaIds.map((q) => `${q.quotaId}=${q.quotaValue}`).join(", "),
    message: redactKey(apiMessage)
  });

  // Autenticación: clave inválida, vencida, sin permisos o API no habilitada.
  if (
    status === 401 ||
    status === 403 ||
    apiStatus === "UNAUTHENTICATED" ||
    apiStatus === "PERMISSION_DENIED" ||
    /API_KEY_INVALID|API_KEY_EXPIRED|API_KEY_SERVICE_BLOCKED|SERVICE_DISABLED/.test(reason) ||
    (status === 400 && /api key/i.test(apiMessage))
  ) {
    return new AssistantError(
      "auth_failed",
      "La clave de Gemini no es válida o no tiene permisos. Revisá la variable GEMINI_API_KEY del servidor.",
      502
    );
  }

  // Cuota: 429 RESOURCE_EXHAUSTED. Un límite en 0 significa que el modelo no tiene cuota gratuita.
  if (status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
    if (quotaIds.some((q) => String(q.quotaValue) === "0")) {
      return new AssistantError(
        "quota_unavailable",
        `El modelo ${model} no tiene cuota gratuita para esta clave. Configurá otro modelo en GEMINI_MODEL.`,
        429
      );
    }
    if (quotaIds.some((q) => /PerDay/i.test(q.quotaId))) {
      return new AssistantError(
        "quota_exceeded_daily",
        "Se agotó la cuota gratuita diaria de Gemini. Vas a poder seguir usando el asistente mañana.",
        429
      );
    }
    return new AssistantError(
      "quota_exceeded",
      "Se alcanzó el límite de uso gratuito de Gemini por ahora. Esperá un minuto y volvé a intentar.",
      429
    );
  }

  // Disponibilidad del modelo: retirado, inexistente o no habilitado para esta clave.
  if (status === 404 || apiStatus === "NOT_FOUND") {
    return new AssistantError(
      "model_not_found",
      `El modelo ${model} no está disponible para esta clave (Google lo retiró o no existe). Configurá un modelo vigente en GEMINI_MODEL.`,
      502
    );
  }

  if (status === 400 && (apiStatus === "FAILED_PRECONDITION" || /location is not supported/i.test(apiMessage))) {
    return new AssistantError(
      "unavailable_region",
      "La cuota gratuita de Gemini no está disponible para esta cuenta o región.",
      502
    );
  }
  if (status === 400) {
    return new AssistantError("invalid_request", "Gemini no pudo procesar la consulta. Probá reformularla.", 400);
  }

  // Sobrecarga temporal del modelo (503 UNAVAILABLE "high demand").
  if (status === 503 || apiStatus === "UNAVAILABLE") {
    return new AssistantError(
      "model_overloaded",
      "El modelo de Gemini está saturado en este momento. Probá de nuevo en unos segundos.",
      503
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
      throw mapApiError(error, model);
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
