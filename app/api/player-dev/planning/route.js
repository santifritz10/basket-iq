import { getPlanning } from "@/services/server/player-dev-service";
import { withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return withLabUser((user) => getPlanning(user.id));
}
