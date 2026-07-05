#!/usr/bin/env node
/**
 * Compara blobs legacy vs tablas relacionales por usuario.
 *
 * Uso: node scripts/reconcile-player-domain.mjs [--user-id=<uuid>]
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

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
  const args = { userId: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--user-id=")) args.userId = arg.slice("--user-id=".length);
  }
  return args;
}

async function main() {
  loadEnvLocal();
  const { userId: singleUserId } = parseArgs();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let userIds = [];
  if (singleUserId) {
    userIds = [singleUserId];
  } else {
    const res = await service
      .from("user_app_data")
      .select("user_id")
      .eq("data_type", "players_tracking");
    if (res.error) throw res.error;
    userIds = [...new Set((res.data || []).map((r) => r.user_id))];
  }

  const report = [];

  for (const userId of userIds) {
    const blobRes = await service
      .from("user_app_data")
      .select("payload")
      .eq("user_id", userId)
      .eq("data_type", "players_tracking")
      .maybeSingle();

    const blobPlayers = Array.isArray(blobRes.data?.payload) ? blobRes.data.payload : [];
    const mapRes = await service
      .from("player_legacy_id_map")
      .select("player_id")
      .eq("migrated_from_user_id", userId);

    const sqlPlayerCount = new Set((mapRes.data || []).map((r) => r.player_id)).size;

    const shootingBlob = await service
      .from("user_app_data")
      .select("payload")
      .eq("user_id", userId)
      .eq("data_type", "shooting_heatmap")
      .maybeSingle();

    const blobSessions = Array.isArray(shootingBlob.data?.payload?.sessions)
      ? shootingBlob.data.payload.sessions
      : [];

    const sessionMapRes = await service
      .from("shooting_session_legacy_id_map")
      .select("session_id")
      .eq("migrated_from_user_id", userId);

    const sqlSessionCount = new Set((sessionMapRes.data || []).map((r) => r.session_id)).size;

    const entry = {
      userId,
      blobPlayers: blobPlayers.length,
      sqlPlayers: sqlPlayerCount,
      playersMatch: blobPlayers.length === sqlPlayerCount,
      blobSessions: blobSessions.length,
      sqlSessions: sqlSessionCount,
      sessionsMatch: blobSessions.length === sqlSessionCount
    };
    report.push(entry);
    const flag = entry.playersMatch && entry.sessionsMatch ? "OK" : "MISMATCH";
    console.log(
      `[${flag}] ${userId} players ${entry.blobPlayers}/${entry.sqlPlayers} sessions ${entry.blobSessions}/${entry.sqlSessions}`
    );
  }

  const outPath = join(root, "scripts", "reconcile-player-domain-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Report: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
