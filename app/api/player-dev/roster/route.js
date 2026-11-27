import { getRoster } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(_req) {
  return withLabUser((user) => getRoster(user.id));
}
