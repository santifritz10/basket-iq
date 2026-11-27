import { getPlayerInvitations } from "@/services/server/player-dev-service";
import { withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const { playerId } = await params;
  return withLabUser((user) => getPlayerInvitations(user.id, playerId));
}
