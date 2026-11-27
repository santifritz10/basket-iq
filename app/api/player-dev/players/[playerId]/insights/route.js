import { getInsights } from "@/services/server/player-dev-service";
import { withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { playerId } = await params;
  const q = new URL(req.url).searchParams;
  return withLabUser((user) => getInsights(user.id, playerId, { days: q.get("days"), include_notes: q.get("notes") }));
}
