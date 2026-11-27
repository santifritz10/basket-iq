import { voidShootingLabEntry } from "@/services/server/shooting-lab-service";
import { withLabUser } from "../../../../_helpers";

/** «Deshacer»: anula el registro; no lo borra. */
export async function DELETE(_req, { params }) {
  const { sessionId, entryId } = await params;
  return withLabUser((user) => voidShootingLabEntry(user.id, sessionId, entryId));
}
