import { NextResponse } from "next/server";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { parseAssistantRequest } from "@/lib/server/assistant/validation";
import { checkRateLimit } from "@/lib/server/assistant/rate-limit";
import { buildSystemInstruction } from "@/lib/server/assistant/prompts";
import { buildCoachContext } from "@/lib/server/assistant/context";
import { AssistantError, generateAssistantReply, getGeminiModel } from "@/lib/server/assistant/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(status, error, code, extraHeaders) {
  return NextResponse.json({ ok: false, error, code }, { status, headers: extraHeaders });
}

export async function POST(req) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) {
    return errorResponse(401, "Tu sesión expiró. Volvé a iniciar sesión.", "unauthorized");
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 200_000) {
    return errorResponse(413, "El mensaje es demasiado grande.", "too_large");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "El mensaje no es válido.", "invalid_json");
  }

  const parsed = parseAssistantRequest(body);
  if (!parsed.ok) {
    return errorResponse(400, parsed.error, "invalid_request");
  }

  const limit = checkRateLimit(user.id);
  if (!limit.allowed) {
    const message =
      limit.scope === "minute"
        ? "Estás enviando muchas consultas seguidas. Esperá un minuto y volvé a intentar."
        : "Llegaste al límite diario de consultas al asistente. Mañana vas a poder seguir.";
    return errorResponse(429, message, "rate_limited", { "Retry-After": String(limit.retryAfterSeconds) });
  }

  try {
    const { mode, messages } = parsed.data;
    const contextSections = await buildCoachContext({ userId: user.id });
    const systemInstruction = buildSystemInstruction(mode, contextSections, { persistent: false });
    const reply = await generateAssistantReply({ systemInstruction, messages });
    return NextResponse.json({
      ok: true,
      reply: reply.text,
      truncated: reply.truncated,
      model: reply.model,
      mode
    });
  } catch (error) {
    if (error instanceof AssistantError) {
      return errorResponse(error.httpStatus, error.message, error.code);
    }
    console.error("[assistant] unexpected error", { name: error?.name });
    return errorResponse(500, "Ocurrió un error inesperado. Probá de nuevo.", "internal_error");
  }
}

export async function GET() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) {
    return errorResponse(401, "Tu sesión expiró. Volvé a iniciar sesión.", "unauthorized");
  }
  const configured = Boolean((process.env.GEMINI_API_KEY || "").trim());
  return NextResponse.json({ ok: true, configured, model: getGeminiModel() });
}
