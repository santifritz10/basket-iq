import { acceptInvitation } from "@/services/server/player-member-service";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

export async function POST(req) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const email = auth.user.email;
    const member = await acceptInvitation(auth.user.id, email, body?.token);
    return jsonOk({ member });
  } catch (error) {
    return handleApiError(error);
  }
}
