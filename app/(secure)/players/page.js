import PlayersModule from "@/components/players/PlayersModule";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";

export default async function PlayersPage() {
  const user = await getAuthenticatedUserFromCookies();
  const items = user?.id ? (await getUserDataByType(user.id, "players_tracking")) || [] : [];
  const shootingPayload = user?.id ? (await getUserDataByType(user.id, "shooting_heatmap")) || {} : {};
  return (
    <PlayersModule
      initialItems={Array.isArray(items) ? items : []}
      initialShootingPayload={shootingPayload && typeof shootingPayload === "object" ? shootingPayload : {}}
    />
  );
}
