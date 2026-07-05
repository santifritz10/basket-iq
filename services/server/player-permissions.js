import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";

const ACCESS_RANK = { viewer: 1, editor: 2, admin: 3 };

export function accessLevelSatisfies(current, minimum) {
  return (ACCESS_RANK[current] || 0) >= (ACCESS_RANK[minimum] || 0);
}

export async function getPlayerMembership(userId, playerId) {
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_members")
    .select("*")
    .eq("player_id", playerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function requirePlayerAccess(userId, playerId, minimumLevel = "viewer") {
  const membership = await getPlayerMembership(userId, playerId);
  if (!membership || !accessLevelSatisfies(membership.access_level, minimumLevel)) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return membership;
}

export async function listPlayerIdsForUser(userId) {
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_members")
    .select("player_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (result.error) throw result.error;
  return (result.data || []).map((row) => row.player_id);
}
