import { addReport, getReports } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { playerId } = await params;
  return withLabUser((user) => getReports(user.id, playerId));
}

export async function POST(req, { params }) {
  const { playerId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => addReport(user.id, playerId, body));
}
