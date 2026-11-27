import { editReport, getReport } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { reportId } = await params;
  return withLabUser((user) => getReport(user.id, reportId));
}

export async function PATCH(req, { params }) {
  const { reportId } = await params;
  const body = await readJson(req);
  return withLabUser((user) => editReport(user.id, reportId, body));
}
