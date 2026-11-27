import { removeAssessment } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  const { playerId, batchId } = await params;
  return withLabUser((user) => removeAssessment(user.id, playerId, batchId));
}
