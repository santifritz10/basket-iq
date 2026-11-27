import { addGoalCheckin } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { playerId, goalId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => addGoalCheckin(user.id, playerId, goalId, body));
}
