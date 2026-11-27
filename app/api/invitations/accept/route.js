import { acceptMyInvitation } from "@/services/server/player-dev-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

/** Compatibilidad con la pantalla anterior: misma lógica que /api/player-dev/invitations. */
export async function POST(req) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const result = await acceptMyInvitation(auth.user, body);
    return jsonOk({ member: result.member, player_id: result.player_id });
  } catch (error) {
    return handleApiError(error);
  }
}
