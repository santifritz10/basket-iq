import {
  deletePlayerEvolution,
  updatePlayerEvolution
} from "@/services/server/player-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function PATCH(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId, eventId } = await params;
    const body = await req.json();
    const item = await updatePlayerEvolution(auth.user.id, playerId, eventId, body);
    return jsonOk({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId, eventId } = await params;
    await deletePlayerEvolution(auth.user.id, playerId, eventId);
    return jsonOk({});
  } catch (error) {
    return handleApiError(error);
  }
}
