import { editPlanItem } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { playerId, itemId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => editPlanItem(user.id, playerId, itemId, body));
}
