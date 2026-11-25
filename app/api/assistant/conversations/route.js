import { NextResponse } from "next/server";
import { listConversations } from "@/lib/server/assistant/conversations";
import { handleRouteError, requireUser, unauthorized } from "@/lib/server/assistant/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista las conversaciones del entrenador, por actividad reciente. ?q= busca en títulos y mensajes. */
export async function GET(req) {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const query = new URL(req.url).searchParams.get("q") || "";
    const conversations = await listConversations(user.id, { query });
    return NextResponse.json({ ok: true, conversations });
  } catch (error) {
    return handleRouteError(error);
  }
}
