import { createInvitation } from "@/services/server/player-member-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function POST(req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId } = await params;
    const body = await req.json();
    const result = await createInvitation(auth.user.id, playerId, body);
    // El hash del código no sale del servidor.
    const { token_hash: _hash, ...invitation } = result.invitation || {};
    return jsonOk({ invitation, token: result.token });
  } catch (error) {
    return handleApiError(error);
  }
}
