import {
  deletePlayerNote,
  updatePlayerNote
} from "@/services/server/player-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function PATCH(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId, noteId } = await params;
    const body = await req.json();
    const item = await updatePlayerNote(auth.user.id, playerId, noteId, body);
    return jsonOk({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId, noteId } = await params;
    await deletePlayerNote(auth.user.id, playerId, noteId);
    return jsonOk({});
  } catch (error) {
    return handleApiError(error);
  }
}
