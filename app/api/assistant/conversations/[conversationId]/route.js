import { NextResponse } from "next/server";
import {
  deleteConversation,
  getAcademyContext,
  getConversation,
  listMessages,
  updateConversation
} from "@/lib/server/assistant/conversations";
import { parseConversationPatch } from "@/lib/server/assistant/validation";
import { describeAcademyContext } from "@/lib/server/assistant/context";
import { errorResponse, handleRouteError, readJson, requireUser, unauthorized } from "@/lib/server/assistant/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound() {
  return errorResponse(404, "No encontramos esa conversación.", "not_found");
}

export async function GET(_req, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const { conversationId } = await params;
    const conversation = await getConversation(user.id, conversationId);
    if (!conversation) return notFound();
    const [messages, academy] = await Promise.all([
      listMessages(user.id, conversation.id),
      getAcademyContext(user.id, conversation.id)
    ]);
    const academyLabel = academy.value ? describeAcademyContext(academy.value) : null;
    return NextResponse.json({ ok: true, conversation: { ...conversation, academyLabel }, messages });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const { conversationId } = await params;
    const parsed = parseConversationPatch(await readJson(req, 5_000));
    if (!parsed.ok) return errorResponse(400, parsed.error, "invalid_request");
    const existing = await getConversation(user.id, conversationId);
    if (!existing) return notFound();
    const conversation = await updateConversation(user.id, existing.id, parsed.data);
    return NextResponse.json({ ok: true, conversation });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const { conversationId } = await params;
    const deleted = await deleteConversation(user.id, conversationId);
    if (!deleted) return notFound();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
