import { askAssistant } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req, { params }) {
  const { playerId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => askAssistant(user.id, playerId, body));
}
