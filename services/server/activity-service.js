import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";

export async function recordActivityEvent({
  playerId,
  actorUserId,
  eventType,
  entityType = null,
  entityId = null,
  summary,
  metadata = {},
  createdAt = null
}) {
  const service = createSupabaseServiceServerClient();
  const row = {
    player_id: playerId,
    actor_user_id: actorUserId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    metadata
  };
  if (createdAt) row.created_at = createdAt;

  const result = await service.from("activity_events").insert(row).select("id").single();
  if (result.error) throw result.error;
  return result.data;
}

export async function listActivityEvents(playerId, { limit = 50, cursor = null } = {}) {
  const service = createSupabaseServiceServerClient();
  let query = service
    .from("activity_events")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const result = await query;
  if (result.error) throw result.error;
  return result.data || [];
}
