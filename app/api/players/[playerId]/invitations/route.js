import { createInvitation } from "@/services/server/player-member-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function POST(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId } = await params;
    const body = await req.json();
    const result = await createInvitation(auth.user.id, playerId, body);
    return jsonOk({
      invitation: result.invitation,
      token: result.token
    });
  } catch (error) {
    return handleApiError(error);
  }
}
