import { createShootingLabSession } from "@/services/server/shooting-lab-service";
import { readJson, withLabUser } from "../_helpers";

export async function POST(req) {
  const body = await readJson(req);
  return withLabUser((user) => createShootingLabSession(user.id, body));
}
