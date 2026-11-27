import { getCompare } from "@/services/server/player-dev-service";
import { withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const ids = String(new URL(req.url).searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return withLabUser((user) => getCompare(user.id, ids));
}
