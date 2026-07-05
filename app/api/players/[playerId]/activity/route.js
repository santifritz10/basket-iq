import { listActivityEvents } from "@/services/server/activity-service";
import { requirePlayerAccess } from "@/services/server/player-permissions";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function GET(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId } = await params;
    await requirePlayerAccess(auth.user.id, playerId, "viewer");
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 50);
    const cursor = searchParams.get("cursor");
    const items = await listActivityEvents(playerId, { limit, cursor });
    return jsonOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
