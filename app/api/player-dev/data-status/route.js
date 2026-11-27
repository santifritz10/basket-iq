import { getDataStatus, runMediaAction } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return withLabUser((user) => getDataStatus(user.id));
}

export async function POST(req) {
  const body = await readJson(req);
  return withLabUser((user) => runMediaAction(user.id, body));
}
