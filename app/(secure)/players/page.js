import PlayersModule from "@/components/players/PlayersModule";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";

export default async function PlayersPage() {
  const user = await getAuthenticatedUserFromCookies();
  const items = user?.id ? (await getUserDataByType(user.id, "players_tracking")) || [] : [];
  return <PlayersModule initialItems={Array.isArray(items) ? items : []} />;
}
