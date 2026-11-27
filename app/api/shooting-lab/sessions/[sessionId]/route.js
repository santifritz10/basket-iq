import {
  deleteShootingLabSession,
  getShootingLabSession,
  updateShootingLabSession
} from "@/services/server/shooting-lab-service";
import { readJson, withLabUser } from "../../_helpers";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { sessionId } = await params;
  return withLabUser((user) => getShootingLabSession(user.id, sessionId));
}

export async function PATCH(req, { params }) {
  const { sessionId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => updateShootingLabSession(user.id, sessionId, body));
}

export async function DELETE(req, { params }) {
  const { sessionId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => deleteShootingLabSession(user.id, sessionId, body));
}
