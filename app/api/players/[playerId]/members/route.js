import { listPlayerMembers } from "@/services/server/player-member-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function GET(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId } = await params;
    const items = await listPlayerMembers(auth.user.id, playerId);
    return jsonOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
