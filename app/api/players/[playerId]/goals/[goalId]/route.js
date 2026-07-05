import {
  deletePlayerGoal,
  updatePlayerGoal
} from "@/services/server/player-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function PATCH(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId, goalId } = await params;
    const body = await req.json();
    const item = await updatePlayerGoal(auth.user.id, playerId, goalId, body);
    return jsonOk({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId, goalId } = await params;
    await deletePlayerGoal(auth.user.id, playerId, goalId);
    return jsonOk({});
  } catch (error) {
    return handleApiError(error);
  }
}
