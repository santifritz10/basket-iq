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
import Link from "next/link";
import PlayersModule from "@/components/players/PlayersModule";
import PlayersApp from "@/components/player-dev/PlayersApp";

export const metadata = {
  title: "Jugadores · Basket Lab"
};

/** Mismo marco que tenía la pantalla antigua (layout seguro), para el modo sin escritura relacional. */
function LegacyShell({ children }) {
  return (
    <div className="app-container" style={{ display: "block", minHeight: "100dvh" }}>
      <header style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" className="btn-back">
          ← Volver a Basket Lab
        </Link>
      </header>
      <main style={{ padding: "16px 20px 32px" }}>{children}</main>
    </div>
  );
}

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
  // Jugadores Lab necesita el modelo relacional con escritura habilitada.
  if (playerDomainFlags.write) return <PlayersApp />;

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
    <LegacyShell>
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
    </LegacyShell>
  );
}
