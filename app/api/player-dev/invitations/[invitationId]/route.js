import { declineMyInvitation } from "@/services/server/player-dev-service";
import { withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(_req, { params }) {
  const { invitationId } = await params;
  return withLabUser((user) => declineMyInvitation(user, invitationId));
}
