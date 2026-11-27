import { removeGoalCheckin } from "@/services/server/player-dev-service";
import { withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  const { playerId, checkinId } = await params;
  return withLabUser((user) => removeGoalCheckin(user.id, playerId, checkinId));
}
