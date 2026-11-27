import { uploadMedia } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req, { params }) {
  const { playerId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => uploadMedia(user.id, playerId, body));
}
