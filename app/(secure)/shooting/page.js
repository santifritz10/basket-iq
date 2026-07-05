import { playerDomainFlags } from "@/lib/server/player-domain-flags";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";
import { buildShootingHeatmapPayload } from "@/services/server/shooting-session-service";
import { listPlayerIdsForUser } from "@/services/server/player-permissions";
import ShootingPayloadEditor from "@/components/data/ShootingPayloadEditor";

export default async function ShootingPage() {
  const user = await getAuthenticatedUserFromCookies();
  const useRelational = playerDomainFlags.read || playerDomainFlags.write;

  let payload = {};
  if (user?.id) {
    if (useRelational) {
      const playerIds = await listPlayerIdsForUser(user.id);
      payload = await buildShootingHeatmapPayload(user.id, playerIds);
    } else {
      payload = (await getUserDataByType(user.id, "shooting_heatmap")) || {};
    }
  }

  return <ShootingPayloadEditor initialPayload={payload} readOnly={playerDomainFlags.write} />;
}
