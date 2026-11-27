import { endTeamMember } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { membershipId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => endTeamMember(user.id, membershipId, body));
}
