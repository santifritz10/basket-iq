import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { listPlayerIdsForUser, requirePlayerAccess } from "@/services/server/player-permissions";
import { recordActivityEvent } from "@/services/server/activity-service";

function pickPlayerFields(row) {
  if (!row) return null;
  return {
    id: row.id,
    display_name: row.display_name,
    position: row.position,
    age: row.age,
    height: row.height,
    level: row.level,
    team: row.team,
    category: row.category,
    photo_url: row.photo_url,
    club_shield_url: row.club_shield_url,
    fundamentals: row.fundamentals || {},
    game_stats: row.game_stats || {},
    status: row.status,
    created_by_user_id: row.created_by_user_id,
    updated_by_user_id: row.updated_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function listPlayersForUser(userId) {
  const playerIds = await listPlayerIdsForUser(userId);
  if (!playerIds.length) return [];

  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("players")
    .select("*")
    .in("id", playerIds)
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data || []).map(pickPlayerFields);
}

export async function getPlayerById(userId, playerId) {
  await requirePlayerAccess(userId, playerId, "viewer");
  const service = createSupabaseServiceServerClient();
  const result = await service.from("players").select("*").eq("id", playerId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) {
    const err = new Error("Player not found");
    err.status = 404;
    throw err;
  }
  return pickPlayerFields(result.data);
}

export async function createPlayer(userId, body) {
  const service = createSupabaseServiceServerClient();
  const asSelf = body?.as_self === true;
  const displayName = String(body?.display_name || body?.name || "").trim();
  if (!displayName) {
    const err = new Error("display_name is required");
    err.status = 400;
    throw err;
  }

  const playerRow = {
    display_name: displayName,
    position: body?.position || null,
    age: body?.age != null && body.age !== "" ? Number(body.age) : null,
    height: body?.height || null,
    level: body?.level || null,
    team: body?.team || null,
    category: body?.category || null,
    photo_url: body?.photo_url || null,
    club_shield_url: body?.club_shield_url || null,
    fundamentals: body?.fundamentals || {},
    game_stats: body?.game_stats || body?.stats || {},
    status: "active",
    created_by_user_id: userId,
    updated_by_user_id: userId
  };

  const playerResult = await service.from("players").insert(playerRow).select("*").single();
  if (playerResult.error) throw playerResult.error;

  const player = playerResult.data;
  const membership = {
    player_id: player.id,
    user_id: userId,
    relationship_type: asSelf ? "player" : body?.relationship_type || "coach",
    access_level: asSelf ? "admin" : body?.access_level || "editor",
    status: "active",
    accepted_at: new Date().toISOString(),
    created_by_user_id: userId,
    updated_by_user_id: userId
  };

  const memberResult = await service.from("player_members").insert(membership).select("*").single();
  if (memberResult.error) throw memberResult.error;

  await recordActivityEvent({
    playerId: player.id,
    actorUserId: userId,
    eventType: "player.created",
    entityType: "player",
    entityId: player.id,
    summary: `Perfil creado: ${displayName}`
  });

  return pickPlayerFields(player);
}

export async function updatePlayer(userId, playerId, patch) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();

  const updates = { updated_by_user_id: userId };
  const fields = [
    "display_name", "position", "age", "height", "level", "team", "category",
    "photo_url", "club_shield_url", "fundamentals", "game_stats"
  ];
  fields.forEach((field) => {
    if (patch[field] !== undefined) updates[field] = patch[field];
  });
  if (patch.name !== undefined && patch.display_name === undefined) {
    updates.display_name = patch.name;
  }
  if (patch.stats !== undefined && patch.game_stats === undefined) {
    updates.game_stats = patch.stats;
  }

  const result = await service.from("players").update(updates).eq("id", playerId).select("*").single();
  if (result.error) throw result.error;

  await recordActivityEvent({
    playerId,
    actorUserId: userId,
    eventType: "player.updated",
    entityType: "player",
    entityId: playerId,
    summary: "Perfil actualizado"
  });

  return pickPlayerFields(result.data);
}

export async function archivePlayer(userId, playerId) {
  await requirePlayerAccess(userId, playerId, "admin");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("players")
    .update({ status: "archived", updated_by_user_id: userId })
    .eq("id", playerId)
    .select("*")
    .single();
  if (result.error) throw result.error;

  await recordActivityEvent({
    playerId,
    actorUserId: userId,
    eventType: "player.archived",
    entityType: "player",
    entityId: playerId,
    summary: "Perfil archivado"
  });

  return pickPlayerFields(result.data);
}

// --- Notes ---

export async function listPlayerNotes(userId, playerId) {
  await requirePlayerAccess(userId, playerId, "viewer");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_notes")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

export async function createPlayerNote(userId, playerId, body) {
  await requirePlayerAccess(userId, playerId, "editor");
  const text = String(body?.body || "").trim();
  if (!text) {
    const err = new Error("body is required");
    err.status = 400;
    throw err;
  }
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_notes")
    .insert({
      player_id: playerId,
      body: text,
      created_by_user_id: userId,
      updated_by_user_id: userId
    })
    .select("*")
    .single();
  if (result.error) throw result.error;

  await recordActivityEvent({
    playerId,
    actorUserId: userId,
    eventType: "player_note.created",
    entityType: "player_note",
    entityId: result.data.id,
    summary: "Nueva nota registrada"
  });

  return result.data;
}

export async function updatePlayerNote(userId, playerId, noteId, body) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_notes")
    .update({ body: body.body, updated_by_user_id: userId })
    .eq("id", noteId)
    .eq("player_id", playerId)
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deletePlayerNote(userId, playerId, noteId) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();
  const result = await service.from("player_notes").delete().eq("id", noteId).eq("player_id", playerId);
  if (result.error) throw result.error;
}

// --- Goals ---

export async function listPlayerGoals(userId, playerId) {
  await requirePlayerAccess(userId, playerId, "viewer");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_goals")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

export async function createPlayerGoal(userId, playerId, body) {
  await requirePlayerAccess(userId, playerId, "editor");
  const text = String(body?.body || "").trim();
  if (!text) {
    const err = new Error("body is required");
    err.status = 400;
    throw err;
  }
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_goals")
    .insert({
      player_id: playerId,
      body: text,
      status: body?.status || "active",
      created_by_user_id: userId,
      updated_by_user_id: userId
    })
    .select("*")
    .single();
  if (result.error) throw result.error;

  await recordActivityEvent({
    playerId,
    actorUserId: userId,
    eventType: "player_goal.created",
    entityType: "player_goal",
    entityId: result.data.id,
    summary: "Nuevo objetivo registrado"
  });

  return result.data;
}

export async function updatePlayerGoal(userId, playerId, goalId, body) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();
  const updates = { updated_by_user_id: userId };
  if (body.body !== undefined) updates.body = body.body;
  if (body.status !== undefined) updates.status = body.status;
  const result = await service
    .from("player_goals")
    .update(updates)
    .eq("id", goalId)
    .eq("player_id", playerId)
    .select("*")
    .single();
  if (result.error) throw result.error;

  await recordActivityEvent({
    playerId,
    actorUserId: userId,
    eventType: "player_goal.updated",
    entityType: "player_goal",
    entityId: goalId,
    summary: "Objetivo actualizado"
  });

  return result.data;
}

export async function deletePlayerGoal(userId, playerId, goalId) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();
  const result = await service.from("player_goals").delete().eq("id", goalId).eq("player_id", playerId);
  if (result.error) throw result.error;
}

// --- Evolution ---

export async function listPlayerEvolution(userId, playerId) {
  await requirePlayerAccess(userId, playerId, "viewer");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_evolution_events")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

export async function createPlayerEvolution(userId, playerId, body) {
  await requirePlayerAccess(userId, playerId, "editor");
  const message = String(body?.message || "").trim();
  if (!message) {
    const err = new Error("message is required");
    err.status = 400;
    throw err;
  }
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_evolution_events")
    .insert({
      player_id: playerId,
      message,
      created_by_user_id: userId,
      updated_by_user_id: userId
    })
    .select("*")
    .single();
  if (result.error) throw result.error;

  await recordActivityEvent({
    playerId,
    actorUserId: userId,
    eventType: "player_evolution.created",
    entityType: "player_evolution",
    entityId: result.data.id,
    summary: "Nuevo evento de evolución"
  });

  return result.data;
}

export async function updatePlayerEvolution(userId, playerId, eventId, body) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_evolution_events")
    .update({ message: body.message, updated_by_user_id: userId })
    .eq("id", eventId)
    .eq("player_id", playerId)
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deletePlayerEvolution(userId, playerId, eventId) {
  await requirePlayerAccess(userId, playerId, "editor");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_evolution_events")
    .delete()
    .eq("id", eventId)
    .eq("player_id", playerId);
  if (result.error) throw result.error;
}

// --- Full profile with child data (for adapter) ---

export async function getPlayerProfileBundle(userId, playerId) {
  const player = await getPlayerById(userId, playerId);
  const [notes, goals, evolution] = await Promise.all([
    listPlayerNotes(userId, playerId),
    listPlayerGoals(userId, playerId),
    listPlayerEvolution(userId, playerId)
  ]);
  return { player, notes, goals, evolution };
}
