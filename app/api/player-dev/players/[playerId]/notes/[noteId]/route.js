import { editNote, removeNote } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { playerId, noteId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => editNote(user.id, playerId, noteId, body));
}

export async function DELETE(_req, { params }) {
  const { playerId, noteId } = await params;
  return withLabUser((user) => removeNote(user.id, playerId, noteId));
}
