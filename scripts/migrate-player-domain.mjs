#!/usr/bin/env node
/**
 * Migración histórica: user_app_data → dominio jugador relacional.
 *
 * Uso:
 *   node scripts/migrate-player-domain.mjs
 *   node scripts/migrate-player-domain.mjs --user-id=<uuid>
 *
 * Requiere .env.local con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
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
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
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
      .in("data_type", ["players_tracking", "shooting_heatmap"]);
    if (res.error) throw res.error;
    userIds = [...new Set((res.data || []).map((r) => r.user_id))];
  }

  const report = { migrated: [], errors: [] };

  for (const userId of userIds) {
    try {
      const rows = await service
        .from("user_app_data")
        .select("data_type, payload")
        .eq("user_id", userId)
        .in("data_type", ["players_tracking", "shooting_heatmap"]);

      if (rows.error) throw rows.error;

      let playersPayload = null;
      let shootingPayload = null;
      for (const row of rows.data || []) {
        if (row.data_type === "players_tracking") playersPayload = row.payload;
        if (row.data_type === "shooting_heatmap") shootingPayload = row.payload;
      }

      const result = await migrateUserPlayerDomain(service, userId, {
        playersPayload,
        shootingPayload
      });
      report.migrated.push(result);
      console.log(
        `[OK] ${userId} — players: ${result.playersCount}, sessions: ${result.sessionsCount}, warnings: ${result.warnings.length}`
      );
    } catch (error) {
      report.errors.push({ userId, message: error.message });
      console.error(`[ERR] ${userId}:`, error.message);
    }
  }

  const outPath = join(root, "scripts", "migrate-player-domain-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${outPath}`);
  console.log(`Done: ${report.migrated.length} migrated, ${report.errors.length} errors`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
