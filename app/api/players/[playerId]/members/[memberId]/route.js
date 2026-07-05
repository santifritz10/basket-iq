import { revokeMember } from "@/services/server/player-member-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function DELETE(_req, { params }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const { playerId, memberId } = await params;
    const member = await revokeMember(auth.user.id, playerId, memberId);
    return jsonOk({ member });
  } catch (error) {
    return handleApiError(error);
  }
}
