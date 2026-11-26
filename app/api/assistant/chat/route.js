import { NextResponse } from "next/server";
import { parseChatRequest, ASSISTANT_LIMITS } from "@/lib/server/assistant/validation";
import { checkRateLimit } from "@/lib/server/assistant/rate-limit";
import { buildSystemInstruction } from "@/lib/server/assistant/prompts";
import { buildCoachContext } from "@/lib/server/assistant/context";
import { generateAssistantReply } from "@/lib/server/assistant/gemini";
import {
  createConversation,
  deleteMessage,
  getConversation,
  insertMessage,
  listMessages,
  touchConversation
} from "@/lib/server/assistant/conversations";
import { buildGeminiHistory } from "@/lib/assistant/conversation-utils";
import { errorResponse, handleRouteError, readJson, requireUser, unauthorized } from "@/lib/server/assistant/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chat con historial guardado. El historial que se envía a Gemini se lee
 * de la base de datos (no del navegador) y solo de la conversación pedida,
 * que tiene que pertenecer al usuario autenticado.
 */
export async function POST(req) {
  const user = await requireUser();
  if (!user) return unauthorized();

  let conversation = null;
  let userMessage = null;
  try {
    const parsed = parseChatRequest(await readJson(req, 50_000));
    if (!parsed.ok) return errorResponse(400, parsed.error, "invalid_request");
    const { conversationId, mode, action, text } = parsed.data;

    if (conversationId) {
      conversation = await getConversation(user.id, conversationId);
      if (!conversation) return errorResponse(404, "No encontramos esa conversación.", "not_found");
    }

    const limit = checkRateLimit(user.id);
    if (!limit.allowed) {
      const message =
        limit.scope === "minute"
          ? "Estás enviando muchas consultas seguidas. Esperá un minuto y volvé a intentar."
          : "Llegaste al límite diario de consultas al asistente. Mañana vas a poder seguir.";
      return errorResponse(429, message, "rate_limited", { conversation }, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    if (action === "send") {
      if (!conversation) conversation = await createConversation(user.id, { firstMessage: text, mode });
      userMessage = await insertMessage(user.id, conversation.id, { role: "user", text, mode });
      conversation = (await touchConversation(user.id, conversation.id, { mode })) || conversation;
    }

    let stored = await listMessages(user.id, conversation.id, { limit: ASSISTANT_LIMITS.maxHistoryMessages + 1 });
    let replaced = null;
    if (action === "regenerate" && stored.length && stored[stored.length - 1].role === "model") {
      replaced = stored[stored.length - 1];
      stored = stored.slice(0, -1);
    }
    // Reintento después de cancelar la espera: si la respuesta ya se había guardado, se devuelve sin llamar a Gemini.
    if (action === "retry" && stored.length && stored[stored.length - 1].role === "model") {
      return NextResponse.json({ ok: true, conversation, userMessage: null, message: stored[stored.length - 1], replacedMessageId: null, model: null });
    }
    if (!stored.length || stored[stored.length - 1].role !== "user") {
      return errorResponse(400, "No hay un mensaje del entrenador para responder.", "nothing_to_answer", { conversation });
    }

    const history = buildGeminiHistory(stored, {
      maxMessages: ASSISTANT_LIMITS.maxHistoryMessages,
      maxChars: ASSISTANT_LIMITS.maxTotalChars
    });
    const contextSections = await buildCoachContext({ userId: user.id, projectId: conversation.projectId });
    const systemInstruction = buildSystemInstruction(mode, contextSections);
    const reply = await generateAssistantReply({ systemInstruction, messages: history });

    if (replaced) await deleteMessage(user.id, conversation.id, replaced.id);
    const message = await insertMessage(user.id, conversation.id, {
      role: "model",
      text: reply.text,
      mode,
      truncated: reply.truncated,
      model: reply.model
    });
    conversation = (await touchConversation(user.id, conversation.id, { mode })) || conversation;

    return NextResponse.json({
      ok: true,
      conversation,
      userMessage,
      message,
      replacedMessageId: replaced?.id || null,
      model: reply.model
    });
  } catch (error) {
    // Si el mensaje del entrenador ya se guardó, se devuelve igual para que
    // la interfaz muestre la conversación y ofrezca reintentar.
    return handleRouteError(error, { conversation, userMessage });
  }
}
