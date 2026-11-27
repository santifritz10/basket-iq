import { getTrainingOverview } from "@/services/server/player-dev-service";
import { withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { trainingRef } = await params;
  return withLabUser((user) => getTrainingOverview(user.id, decodeURIComponent(trainingRef)));
}
