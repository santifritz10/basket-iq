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
