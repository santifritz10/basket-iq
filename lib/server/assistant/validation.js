import "server-only";
import { z } from "zod";
import { ASSISTANT_MODES, DEFAULT_MODE } from "@/lib/server/assistant/prompts";

export const ASSISTANT_LIMITS = {
  maxMessageChars: 4000,
  maxHistoryMessages: 20,
  maxTotalChars: 24000
};

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(ASSISTANT_LIMITS.maxMessageChars)
});

const requestSchema = z.object({
  mode: z.enum(Object.keys(ASSISTANT_MODES)).optional().default(DEFAULT_MODE),
  messages: z.array(messageSchema).min(1).max(ASSISTANT_LIMITS.maxHistoryMessages)
});

/**
 * Valida el pedido del chat. Devuelve { ok: true, data } o { ok: false, error }.
 * La conversación tiene que terminar con un mensaje del entrenador.
 */
export function parseAssistantRequest(body) {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.code === "too_big" && i.path.includes("text"));
    const tooMany = parsed.error.issues.some((i) => i.code === "too_big" && i.path.length === 1);
    if (tooLong) {
      return { ok: false, error: `Cada mensaje puede tener hasta ${ASSISTANT_LIMITS.maxMessageChars} caracteres.` };
    }
    if (tooMany) {
      return { ok: false, error: "La conversación es demasiado larga. Empezá una nueva." };
    }
    return { ok: false, error: "El mensaje no es válido." };
  }

  const { mode, messages } = parsed.data;
  if (messages[messages.length - 1].role !== "user") {
    return { ok: false, error: "El último mensaje tiene que ser del entrenador." };
  }
  const totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);
  if (totalChars > ASSISTANT_LIMITS.maxTotalChars) {
    return { ok: false, error: "La conversación es demasiado larga. Empezá una nueva." };
  }
  return { ok: true, data: { mode, messages } };
}

const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const chatSchema = z.object({
  conversationId: uuidSchema.nullable().optional(),
  mode: z.enum(Object.keys(ASSISTANT_MODES)).optional().default(DEFAULT_MODE),
  action: z.enum(["send", "regenerate", "retry"]).optional().default("send"),
  text: z.string().optional()
});

/**
 * Valida un pedido al chat con historial guardado.
 * - send: agrega el mensaje del entrenador (crea la conversación si no hay id).
 * - retry: vuelve a pedir respuesta para el último mensaje del entrenador.
 * - regenerate: reemplaza la última respuesta de la IA por una nueva.
 */
export function parseChatRequest(body) {
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "El pedido no es válido." };
  const { conversationId = null, mode, action } = parsed.data;
  const text = String(parsed.data.text || "").trim();
  if (action === "send") {
    if (!text) return { ok: false, error: "Escribí un mensaje." };
    if (text.length > ASSISTANT_LIMITS.maxMessageChars) {
      return { ok: false, error: `Cada mensaje puede tener hasta ${ASSISTANT_LIMITS.maxMessageChars} caracteres.` };
    }
  } else if (!conversationId) {
    return { ok: false, error: "Falta la conversación." };
  }
  return { ok: true, data: { conversationId, mode, action, text } };
}

const conversationPatchSchema = z.object({
  title: z.string().max(200).optional(),
  mode: z.enum(Object.keys(ASSISTANT_MODES)).optional()
});

export function parseConversationPatch(body) {
  const parsed = conversationPatchSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Los cambios no son válidos." };
  return { ok: true, data: parsed.data };
}
