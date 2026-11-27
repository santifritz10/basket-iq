import { editCriterion } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { criterionId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => editCriterion(user.id, criterionId, body));
}
