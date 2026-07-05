import {
  getPlayerProfileBundle,
  updatePlayer,
  archivePlayer
} from "@/services/server/player-service";
import { playerToLegacyShape } from "@/services/server/player-legacy-adapter";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function GET(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { playerId } = await params;
    const bundle = await getPlayerProfileBundle(auth.user.id, playerId);
    return jsonOk({
      player: playerToLegacyShape(bundle.player, {
        notes: bundle.notes,
        goals: bundle.goals,
        evolution: bundle.evolution
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { playerId } = await params;
    const body = await req.json();
    const player = await updatePlayer(auth.user.id, playerId, body);
    return jsonOk({ player });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { playerId } = await params;
    const player = await archivePlayer(auth.user.id, playerId);
    return jsonOk({ player });
  } catch (error) {
    return handleApiError(error);
  }
}
