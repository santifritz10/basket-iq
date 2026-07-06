#!/usr/bin/env node
/**
 * Repara duplicados API y restaura los jugadores del blob legacy.
 *
 * 1. Archiva jugadores SQL activos sin entrada en player_legacy_id_map (duplicados API).
 * 2. Migra user_app_data → tablas relacionales (4 jugadores del blob).
 *
 * Uso:
 *   node scripts/repair-player-duplicates.mjs --user-id=<uuid>
 *   node scripts/repair-player-duplicates.mjs --user-id=<uuid> --dry-run
 *
 * Requiere .env.local con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { migrateUserPlayerDomain } from "../lib/player-domain/sync-from-blob.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function parseArgs() {
  const args = { userId: null, dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--user-id=")) args.userId = arg.slice("--user-id=".length);
    if (arg === "--dry-run") args.dryRun = true;
  }
  return args;
}

function playerLabel(raw) {
  return String(raw?.name || raw?.display_name || "Sin nombre").trim() || "Sin nombre";
}

async function listActivePlayerRows(service, userId) {
  const members = await service
    .from("player_members")
    .select("player_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (members.error) throw members.error;

  const ids = (members.data || []).map((r) => r.player_id);
  if (!ids.length) return [];

  const players = await service
    .from("players")
    .select("id, display_name, status, created_at")
    .in("id", ids)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (players.error) throw players.error;
  return players.data || [];
}

async function listMappedPlayerIds(service, userId) {
  const map = await service
    .from("player_legacy_id_map")
    .select("player_id, legacy_id")
    .eq("migrated_from_user_id", userId);
  if (map.error) throw map.error;
  return map.data || [];
}

async function archivePlayers(service, playerIds, dryRun) {
  if (!playerIds.length) return 0;
  if (dryRun) return playerIds.length;

  const result = await service
    .from("players")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .in("id", playerIds)
    .eq("status", "active")
    .select("id");
  if (result.error) throw result.error;
  return (result.data || []).length;
}

async function main() {
  loadEnvLocal();
  const { userId, dryRun } = parseArgs();
  if (!userId) {
    console.error("Usage: node scripts/repair-player-duplicates.mjs --user-id=<uuid> [--dry-run]");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const blobRes = await service
    .from("user_app_data")
    .select("payload")
    .eq("user_id", userId)
    .eq("data_type", "players_tracking")
    .maybeSingle();
  if (blobRes.error) throw blobRes.error;

  const blobPlayers = Array.isArray(blobRes.data?.payload) ? blobRes.data.payload : [];
  if (!blobPlayers.length) {
    console.error("No players_tracking blob found for user.");
    process.exit(1);
  }

  const shootingRes = await service
    .from("user_app_data")
    .select("payload")
    .eq("user_id", userId)
    .eq("data_type", "shooting_heatmap")
    .maybeSingle();
  if (shootingRes.error) throw shootingRes.error;
  const shootingPayload = shootingRes.data?.payload || null;

  const activePlayers = await listActivePlayerRows(service, userId);
  const mapped = await listMappedPlayerIds(service, userId);
  const mappedIds = new Set(mapped.map((r) => r.player_id));

  const toArchive = activePlayers.filter((p) => !mappedIds.has(p.id));

  console.log(dryRun ? "\n[DRY RUN]\n" : "\n[REPAIR]\n");
  console.log(`User: ${userId}`);
  console.log(`Blob players (${blobPlayers.length}):`);
  blobPlayers.forEach((raw, i) => {
    console.log(`  ${i + 1}. ${playerLabel(raw)}  legacy_id=${raw.id}`);
  });

  console.log(`\nActive SQL players without legacy map (${toArchive.length}):`);
  toArchive.forEach((p) => {
    console.log(`  - ${p.display_name}  ${p.id}  created=${p.created_at}`);
  });

  if (!dryRun && toArchive.length) {
    const archived = await archivePlayers(
      service,
      toArchive.map((p) => p.id),
      false
    );
    console.log(`\nArchived ${archived} duplicate player row(s).`);
  } else if (dryRun && toArchive.length) {
    console.log(`\nWould archive ${toArchive.length} duplicate player row(s).`);
  }

  if (!dryRun) {
    const result = await migrateUserPlayerDomain(service, userId, {
      playersPayload: blobPlayers,
      shootingPayload
    });
    console.log(
      `\nMigrated: players=${result.playersCount}, sessions=${result.sessionsCount}, warnings=${result.warnings.length}`
    );
    if (result.warnings.length) {
      result.warnings.forEach((w) => console.warn("  warning:", w));
    }
  } else {
    console.log(`\nWould migrate ${blobPlayers.length} player(s) from blob.`);
  }

  const finalActive = dryRun ? activePlayers : await listActivePlayerRows(service, userId);
  const finalMapped = dryRun ? mapped : await listMappedPlayerIds(service, userId);

  if (!dryRun) {
    console.log(`\nFinal active players (${finalActive.length}):`);
    finalActive.forEach((p) => {
      const legacy = finalMapped.find((m) => m.player_id === p.id);
      console.log(`  - ${p.display_name}  ${p.id}  legacy=${legacy?.legacy_id || "?"}`);
    });

    if (finalActive.length !== blobPlayers.length) {
      console.warn(
        `\nExpected ${blobPlayers.length} active players, found ${finalActive.length}. Review manually.`
      );
      process.exit(1);
    }
  }

  console.log(dryRun ? "\nDry run complete. Re-run without --dry-run to apply." : "\nRepair complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
