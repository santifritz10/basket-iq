import { addShootingLabEntries } from "@/services/server/shooting-lab-service";
import { readJson, withLabUser } from "../../../_helpers";

export async function POST(req, { params }) {
  const { sessionId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => addShootingLabEntries(user.id, sessionId, body?.entries ?? body));
}
