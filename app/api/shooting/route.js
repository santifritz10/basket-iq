import { NextResponse } from "next/server";
import { playerDomainFlags } from "@/lib/server/player-domain-flags";
import { getUserDataByType, saveUserDataByType } from "@/services/server/user-data-service";
import { buildShootingHeatmapPayload } from "@/services/server/shooting-session-service";
import { listPlayerIdsForUser } from "@/services/server/player-permissions";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

const LEGACY_TYPE = "shooting_heatmap";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    if (playerDomainFlags.active) {
      const playerIds = await listPlayerIdsForUser(user.id);
      const payload = await buildShootingHeatmapPayload(user.id, playerIds);
      return jsonOk({ payload, source: "relational" });
    }

    const payload = (await getUserDataByType(user.id, LEGACY_TYPE)) || {};
    return jsonOk({ payload, source: "legacy" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    if (playerDomainFlags.write) {
      return NextResponse.json(
        { ok: false, error: "Use /api/players/:playerId/shooting-sessions for session writes." },
        { status: 410 }
      );
    }

    const body = await req.json();
    const payload = body?.payload ?? {};
    await saveUserDataByType(user.id, LEGACY_TYPE, payload);
    return jsonOk({ source: "legacy" });
  } catch (error) {
    return handleApiError(error);
  }
}
