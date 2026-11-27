import { addCriterion, getCriteria } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(_req) {
  return withLabUser((user) => getCriteria(user.id));
}

export async function POST(req) {
  const body = await readJson(req);
  return withLabUser((user) => addCriterion(user.id, body));
}
