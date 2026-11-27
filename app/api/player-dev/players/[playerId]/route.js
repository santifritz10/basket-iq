import { getProfile } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { playerId } = await params;
  return withLabUser((user) => getProfile(user.id, playerId));
}
