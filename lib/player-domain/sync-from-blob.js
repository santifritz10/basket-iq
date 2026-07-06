import { isUuid } from "./is-uuid.js";

function legacyPlayerId(raw) {
  return String(raw?.id || "");
}

async function syncPlayerChildRows(service, userId, playerId, raw) {
  const notes = Array.isArray(raw.notes_history) ? raw.notes_history : [];
  for (const note of notes) {
    const body = String(note.text || note.body || "").trim();
    if (!body) continue;
    const noteId = note.id ? String(note.id) : null;
    if (noteId && isUuid(noteId)) {
      const existing = await service.from("player_notes").select("id").eq("id", noteId).maybeSingle();
      if (existing.data) {
        await service.from("player_notes").update({ body, updated_by_user_id: userId }).eq("id", noteId);
        continue;
      }
    }
    await service.from("player_notes").insert({
      player_id: playerId,
      body,
      created_by_user_id: userId,
      updated_by_user_id: userId,
      ...(note.created_at ? { created_at: note.created_at } : {})
    });
  }

  const goals = Array.isArray(raw.goals) ? raw.goals : [];
  for (const goal of goals) {
    const body = String(goal.text || goal.body || "").trim();
    if (!body) continue;
    const goalId = goal.id ? String(goal.id) : null;
    if (goalId && isUuid(goalId)) {
      const existing = await service.from("player_goals").select("id").eq("id", goalId).maybeSingle();
      if (existing.data) {
        await service
          .from("player_goals")
          .update({ body, status: goal.status || "active", updated_by_user_id: userId })
          .eq("id", goalId);
        continue;
      }
    }
    await service.from("player_goals").insert({
      player_id: playerId,
      body,
      status: goal.status || "active",
      created_by_user_id: userId,
      updated_by_user_id: userId,
      ...(goal.created_at ? { created_at: goal.created_at } : {})
    });
  }

  const evolution = Array.isArray(raw.evolution) ? raw.evolution : [];
  for (const ev of evolution) {
    const message = String(ev.message || ev.text || "").trim();
    if (!message) continue;
    const eventId = ev.id ? String(ev.id) : null;
    if (eventId && isUuid(eventId)) {
      const existing = await service
        .from("player_evolution_events")
        .select("id")
        .eq("id", eventId)
        .maybeSingle();
      if (existing.data) {
        await service
          .from("player_evolution_events")
          .update({ message, updated_by_user_id: userId })
          .eq("id", eventId);
        continue;
      }
    }
    await service.from("player_evolution_events").insert({
      player_id: playerId,
      message,
      created_by_user_id: userId,
      updated_by_user_id: userId,
      ...(ev.created_at ? { created_at: ev.created_at } : {})
    });
  }
}

export async function syncPlayersTrackingFromBlob(service, userId, items) {
  const list = Array.isArray(items) ? items : [];
  const report = { upserted: 0, warnings: [] };

  for (const raw of list) {
    const legacyId = legacyPlayerId(raw);
    if (!legacyId) {
      report.warnings.push("Skipped player without id");
      continue;
    }

    const mapResult = await service
      .from("player_legacy_id_map")
      .select("player_id")
      .eq("legacy_id", legacyId)
      .eq("migrated_from_user_id", userId)
      .maybeSingle();

    let playerId = mapResult.data?.player_id;

    const playerRow = {
      display_name: String(raw.name || raw.display_name || "Sin nombre").trim() || "Sin nombre",
      position: raw.position || null,
      age: raw.age != null && raw.age !== "" ? Number(raw.age) : null,
      height: raw.height || null,
      level: raw.level || null,
      team: raw.team || null,
      category: raw.category || null,
      photo_url: raw.photo_url || null,
      club_shield_url: raw.club_shield_url || null,
      fundamentals: raw.fundamentals || {},
      game_stats: raw.stats || raw.game_stats || {},
      status: "active",
      updated_by_user_id: userId
    };

    if (playerId) {
      await service.from("players").update(playerRow).eq("id", playerId);
    } else {
      const insert = await service
        .from("players")
        .insert({ ...playerRow, created_by_user_id: userId })
        .select("id")
        .single();
      if (insert.error) {
        report.warnings.push(`Player ${legacyId}: ${insert.error.message}`);
        continue;
      }
      playerId = insert.data.id;

      await service.from("player_legacy_id_map").upsert({
        legacy_id: legacyId,
        player_id: playerId,
        migrated_from_user_id: userId
      });

      await service.from("player_members").upsert(
        {
          player_id: playerId,
          user_id: userId,
          relationship_type: "coach",
          access_level: "editor",
          status: "active",
          accepted_at: new Date().toISOString(),
          created_by_user_id: userId,
          updated_by_user_id: userId
        },
        { onConflict: "player_id,user_id" }
      );
    }

    await syncPlayerChildRows(service, userId, playerId, raw);
    report.upserted += 1;
  }

  return report;
}

async function resolvePlayerUuid(service, userId, legacyId) {
  const map = await service
    .from("player_legacy_id_map")
    .select("player_id")
    .eq("legacy_id", String(legacyId))
    .eq("migrated_from_user_id", userId)
    .maybeSingle();
  return map.data?.player_id || null;
}

async function resolveSessionUuid(service, userId, legacyId) {
  if (isUuid(legacyId)) return legacyId;
  const map = await service
    .from("shooting_session_legacy_id_map")
    .select("session_id")
    .eq("legacy_id", String(legacyId))
    .eq("migrated_from_user_id", userId)
    .maybeSingle();
  return map.data?.session_id || null;
}

export async function syncShootingHeatmapFromBlob(service, userId, payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const report = { upserted: 0, warnings: [] };

  for (const raw of sessions) {
    const legacySessionId = raw.id ? String(raw.id) : null;
    if (!legacySessionId) {
      report.warnings.push("Skipped session without id");
      continue;
    }

    let sessionId = await resolveSessionUuid(service, userId, legacySessionId);

    const playerIds = [];
    for (const legacyPid of raw.player_ids || []) {
      const uuid = await resolvePlayerUuid(service, userId, legacyPid);
      if (uuid) playerIds.push(uuid);
      else report.warnings.push(`Session ${legacySessionId}: unresolved player ${legacyPid}`);
    }

    const row = {
      nombre: String(raw.nombre || "Sesión de tiro").trim() || "Sesión de tiro",
      fecha: raw.fecha || new Date().toISOString().slice(0, 10),
      zones: raw.zones || {},
      session_type: playerIds.length > 1 ? "group" : "individual",
      updated_by_user_id: userId
    };

    if (sessionId) {
      await service.from("shooting_sessions").update(row).eq("id", sessionId);
    } else {
      const insertPayload = {
        ...row,
        created_by_user_id: userId,
        ...(isUuid(legacySessionId) ? { id: legacySessionId } : {})
      };
      const insert = await service.from("shooting_sessions").insert(insertPayload).select("id").single();
      if (insert.error) {
        report.warnings.push(`Session ${legacySessionId}: ${insert.error.message}`);
        continue;
      }
      sessionId = insert.data.id;

      if (!isUuid(legacySessionId)) {
        await service.from("shooting_session_legacy_id_map").upsert({
          legacy_id: legacySessionId,
          session_id: sessionId,
          migrated_from_user_id: userId
        });
      }
    }

    await service.from("shooting_session_players").delete().eq("session_id", sessionId);
    if (playerIds.length) {
      const junction = playerIds.map((pid) => ({ session_id: sessionId, player_id: pid }));
      await service.from("shooting_session_players").insert(junction);
    }

    report.upserted += 1;
  }

  return report;
}

export async function syncPlayerDomainFromBlob(service, userId, dataType, payload) {
  if (dataType === "players_tracking") {
    return syncPlayersTrackingFromBlob(service, userId, payload);
  }
  if (dataType === "shooting_heatmap") {
    return syncShootingHeatmapFromBlob(service, userId, payload);
  }
  return { skipped: true };
}

export async function migrateUserPlayerDomain(service, userId, { playersPayload, shootingPayload } = {}) {
  const warnings = [];
  let playersCount = 0;
  let sessionsCount = 0;

  if (playersPayload != null) {
    const playersReport = await syncPlayersTrackingFromBlob(
      service,
      userId,
      Array.isArray(playersPayload) ? playersPayload : []
    );
    playersCount = playersReport.upserted;
    warnings.push(...(playersReport.warnings || []));
  }

  if (shootingPayload != null) {
    const shootingReport = await syncShootingHeatmapFromBlob(service, userId, shootingPayload);
    sessionsCount = shootingReport.upserted;
    warnings.push(...(shootingReport.warnings || []));
  }

  await service.from("player_domain_migrations").upsert({
    user_id: userId,
    migrated_at: new Date().toISOString(),
    players_count: playersCount,
    sessions_count: sessionsCount,
    warnings
  });

  return { userId, playersCount, sessionsCount, warnings };
}
