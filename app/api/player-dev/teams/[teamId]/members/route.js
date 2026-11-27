import { addTeamMember } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { teamId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => addTeamMember(user.id, teamId, body));
}
