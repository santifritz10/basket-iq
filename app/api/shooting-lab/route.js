import { getShootingLabOverview } from "@/services/server/shooting-lab-service";
import { withLabUser } from "./_helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return withLabUser((user) => getShootingLabOverview(user.id));
}
