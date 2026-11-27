import { addRoutine } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await readJson(req);
  return withLabUser((user) => addRoutine(user.id, body));
}
