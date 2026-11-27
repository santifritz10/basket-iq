import { editStatRecord, removeStatRecord } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { playerId, recordId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => editStatRecord(user.id, playerId, recordId, body));
}

export async function DELETE(_req, { params }) {
  const { playerId, recordId } = await params;
  return withLabUser((user) => removeStatRecord(user.id, playerId, recordId));
}
