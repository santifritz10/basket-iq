import "server-only";

/** Map relational player + child rows → legacy JSON shape for UI adapter. */

function mapGoalStatusToLegacy(status) {
  if (status === "completed") return "completado";
  if (status === "archived") return "archivado";
  if (status === "active") return "pendiente";
  return status || "pendiente";
}
export function playerToLegacyShape(player, { notes = [], goals = [], evolution = [] } = {}) {
  if (!player) return null;
  return {
    id: player.id,
    name: player.display_name,
    display_name: player.display_name,
    position: player.position || "",
    age: player.age == null ? "" : player.age,
    height: player.height || "",
    level: player.level || "",
    team: player.team || "",
    category: player.category || "",
    photo_url: player.photo_url || "",
    club_shield_url: player.club_shield_url || "",
    fundamentals: player.fundamentals || {},
    stats: player.game_stats || {},
    game_stats: player.game_stats || {},
    notes_history: notes.map((n) => ({
      id: n.id,
      text: n.body,
      body: n.body,
      created_at: n.created_at,
      created_by_user_id: n.created_by_user_id
    })),
    goals: goals.map((g) => ({
      id: g.id,
      text: g.body,
      body: g.body,
      status: mapGoalStatusToLegacy(g.status),
      created_at: g.created_at,
      updated_at: g.updated_at
    })),
    evolution: evolution.map((e) => ({
      id: e.id,
      text: e.message,
      message: e.message,
      created_at: e.created_at,
      created_by_user_id: e.created_by_user_id
    })),
    status: player.status,
    created_at: player.created_at,
    updated_at: player.updated_at,
    created_by_user_id: player.created_by_user_id,
    updated_by_user_id: player.updated_by_user_id
  };
}

export async function playersBundleToLegacyList(bundles) {
  return bundles.map(({ player, notes, goals, evolution }) =>
    playerToLegacyShape(player, { notes, goals, evolution })
  );
}
