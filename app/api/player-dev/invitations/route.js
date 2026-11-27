import { acceptMyInvitation, getMyInvitations } from "@/services/server/player-dev-service";
import { readJson, withLabUser } from "@/app/api/shooting-lab/_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Invitaciones pendientes para el email de la cuenta con la que se entró. */
export async function GET() {
  return withLabUser((user) => getMyInvitations(user));
}

/** Aceptar: { token } (enlace) o { invitation_id } (lista de pendientes). */
export async function POST(req) {
  const body = await readJson(req);
  return withLabUser((user) => acceptMyInvitation(user, body));
}
