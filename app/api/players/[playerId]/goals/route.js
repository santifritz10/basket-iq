import {
  createPlayerGoal,
  listPlayerGoals
} from "@/services/server/player-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function GET(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId } = await params;
    const items = await listPlayerGoals(auth.user.id, playerId);
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
    const item = await createPlayerGoal(auth.user.id, playerId, body);
    return jsonOk({ item });
  } catch (error) {
    return handleApiError(error);
  }
}
