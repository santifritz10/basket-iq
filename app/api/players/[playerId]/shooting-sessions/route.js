import {
  createShootingSession,
  listShootingSessionsForPlayer
} from "@/services/server/shooting-session-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function GET(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId } = await params;
    const items = await listShootingSessionsForPlayer(auth.user.id, playerId);
    return jsonOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId } = await params;
    const body = await req.json();
    const session = await createShootingSession(auth.user.id, playerId, body);
    return jsonOk({ session });
  } catch (error) {
    return handleApiError(error);
  }
}
