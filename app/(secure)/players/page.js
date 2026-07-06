import { playerDomainFlags } from "@/lib/server/player-domain-flags";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";
import {
  getPlayerProfileBundle,
  listPlayersForUser
} from "@/services/server/player-service";
import { playerToLegacyShape } from "@/services/server/player-legacy-adapter";
import { buildShootingHeatmapPayload } from "@/services/server/shooting-session-service";
import { listPlayerIdsForUser } from "@/services/server/player-permissions";
import PlayersModule from "@/components/players/PlayersModule";

async function loadLegacyPlayers(userId) {
  const items = (await getUserDataByType(userId, "players_tracking")) || [];
  return Array.isArray(items) ? items : [];
}

async function loadLegacyShooting(userId) {
  const payload = (await getUserDataByType(userId, "shooting_heatmap")) || {};
  return payload && typeof payload === "object" ? payload : {};
}

async function loadRelationalPlayers(userId) {
  const players = await listPlayersForUser(userId);
  const bundles = await Promise.all(
    players.map((p) => getPlayerProfileBundle(userId, p.id))
  );
  return bundles.map(({ player, notes, goals, evolution }) =>
    playerToLegacyShape(player, { notes, goals, evolution })
  );
}

export default async function PlayersPage() {
  const user = await getAuthenticatedUserFromCookies();
  const useRelational = playerDomainFlags.active;

  let initialItems = [];
  let initialShootingPayload = {};

  if (user?.id) {
    if (useRelational) {
      initialItems = await loadRelationalPlayers(user.id);
      const playerIds = await listPlayerIdsForUser(user.id);
      initialShootingPayload = await buildShootingHeatmapPayload(user.id, playerIds);
    } else {
      initialItems = await loadLegacyPlayers(user.id);
      initialShootingPayload = await loadLegacyShooting(user.id);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  return (
    <PlayersModule
      initialItems={initialItems}
      initialShootingPayload={initialShootingPayload}
      playerDomainRead={useRelational}
      playerDomainWrite={playerDomainFlags.write}
      playerDomainEnabled={playerDomainFlags.enabled}
      playerDomainRealtime={playerDomainFlags.realtime}
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
    />
  );
}
