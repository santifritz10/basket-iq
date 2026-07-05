import {
  deleteShootingSession,
  getShootingSession,
  updateShootingSession
} from "@/services/server/shooting-session-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function GET(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { sessionId } = await params;
    const session = await getShootingSession(auth.user.id, sessionId);
    return jsonOk({ session });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { sessionId } = await params;
    const body = await req.json();
    const session = await updateShootingSession(auth.user.id, sessionId, body);
    return jsonOk({ session });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { sessionId } = await params;
    await deleteShootingSession(auth.user.id, sessionId);
    return jsonOk({});
  } catch (error) {
    return handleApiError(error);
  }
}
