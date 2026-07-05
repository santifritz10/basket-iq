import { playerDomainFlags } from "@/lib/server/player-domain-flags";
import { getUserDataByType, saveUserDataByType } from "@/services/server/user-data-service";
import {
  createPlayer,
  getPlayerProfileBundle,
  listPlayersForUser
} from "@/services/server/player-service";
import { playerToLegacyShape } from "@/services/server/player-legacy-adapter";
import { requireApiUser, handleApiError, jsonOk } from "@/app/api/_lib/player-route-helpers";

const LEGACY_TYPE = "players_tracking";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    if (playerDomainFlags.active) {
      const players = await listPlayersForUser(user.id);
      const bundles = await Promise.all(
        players.map((p) => getPlayerProfileBundle(user.id, p.id))
      );
      const items = bundles.map(({ player, notes, goals, evolution }) =>
        playerToLegacyShape(player, { notes, goals, evolution })
      );
      return jsonOk({ items, source: "relational" });
    }

    const payload = (await getUserDataByType(user.id, LEGACY_TYPE)) || [];
    return jsonOk({ items: Array.isArray(payload) ? payload : [], source: "legacy" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = await req.json();

    if (playerDomainFlags.write) {
      if (Array.isArray(body?.items)) {
        const err = new Error("Bulk items replace is not supported. Use granular player API.");
        err.status = 400;
        throw err;
      }
      const player = await createPlayer(user.id, body);
      const bundle = await getPlayerProfileBundle(user.id, player.id);
      return jsonOk({
        player: playerToLegacyShape(bundle.player, {
          notes: bundle.notes,
          goals: bundle.goals,
          evolution: bundle.evolution
        }),
        source: "relational"
      });
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    await saveUserDataByType(user.id, LEGACY_TYPE, items);
    return jsonOk({ source: "legacy" });
  } catch (error) {
    return handleApiError(error);
  }
}
