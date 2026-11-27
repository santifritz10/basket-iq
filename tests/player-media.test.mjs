import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import * as media from "../lib/player-dev/media-core.js";
import * as core from "../lib/player-dev/core.js";

const U = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const V = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";
const PNG = "data:image/png;base64," + Buffer.from("png-bytes-123").toString("base64");
const JPG = "data:image/jpeg;base64," + Buffer.from("jpeg-bytes-456").toString("base64");

function fakeStorage({ corrupt = false, fail = false } = {}) {
  const files = new Map();
  const api = {
    files,
    from(bucket) {
      assert.equal(bucket, "player-media");
      return {
        async upload(path, bytes, opts) {
          if (fail) return { error: { message: "boom" } };
          if (files.has(path) && !opts.upsert) return { error: { message: "exists" } };
          files.set(path, corrupt ? Buffer.from("otra cosa") : Buffer.from(bytes));
          return { data: { path }, error: null };
        },
        async download(path) {
          return files.has(path) ? { data: files.get(path), error: null } : { data: null, error: { message: "not found" } };
        },
        async createSignedUrl(path) {
          return { data: { signedUrl: `https://signed/${path}` }, error: null };
        },
        async createSignedUrls(paths) {
          return { data: paths.map((p) => ({ path: p, signedUrl: files.has(p) ? `https://signed/${p}` : null, error: files.has(p) ? null : "nf" })), error: null };
        }
      };
    }
  };
  return api;
}

function seed() {
  return createFakeDb({
    players: [
      { id: P1, display_name: "Ana", status: "active", photo_url: PNG, club_shield_url: JPG, photo_path: null, shield_path: null, fundamentals: { tiro: 3 } },
      { id: P2, display_name: "Beto", status: "active", photo_url: "https://externa/foto.jpg", photo_path: null, shield_path: null },
      { id: P3, display_name: "Ciro", status: "active", photo_url: PNG, photo_path: null, shield_path: null }
    ],
    player_members: [
      { player_id: P1, user_id: U, access_level: "admin", status: "active" },
      { player_id: P2, user_id: U, access_level: "admin", status: "active" },
      { player_id: P1, user_id: V, access_level: "editor", status: "active" },
      { player_id: P3, user_id: V, access_level: "admin", status: "active" }
    ],
    player_goals: [{ id: "g", player_id: P1, status: "active", body: "texto viejo" }],
    player_assessments: [], player_stat_records: [], assessment_criteria: [], teams: [], team_players: [],
    shooting_sessions: [], shooting_session_players: [], shooting_entries: [],
    player_notes: [], player_evolution_events: [], activity_events: [], player_goal_checkins: [], player_plan_items: [], player_attendance: []
  });
}

test("imágenes: valida formato y tamaño", () => {
  assert.ok(media.parseImageDataUrl(PNG));
  assert.equal(media.parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(media.parseImageDataUrl("https://x/y.png"), null);
  const big = "data:image/png;base64," + Buffer.alloc(1024 * 1024 + 1).toString("base64");
  assert.equal(media.parseImageDataUrl(big), null);
});

test("imágenes: migración copia y verifica sin borrar; liberar solo si coincide", async () => {
  const db = seed();
  const st = fakeStorage();
  const before = await media.mediaStatus(db, U);
  assert.equal(before.pending, 2, "solo base64 de jugadores que administra (no URLs externas ni ajenos)");
  const r = await media.migrateLegacyImages(db, st, U);
  assert.equal(r.copied, 2);
  assert.equal(r.remaining, 0);
  const p1 = db.tables.players.find((p) => p.id === P1);
  assert.ok(p1.photo_path.startsWith(`${P1}/photo-`));
  assert.equal(p1.photo_url, PNG, "el base64 original sigue intacto");
  assert.equal(db.tables.players.find((p) => p.id === P3).photo_path, null, "jugador de otro admin no se toca");
  // Liberar: si la copia no coincide, se conserva.
  st.files.set(p1.photo_path, Buffer.from("alterado"));
  const rel = await media.releaseLegacyImages(db, st, U);
  assert.deepEqual(rel, { released: 1, kept: 1 });
  assert.equal(db.tables.players.find((p) => p.id === P1).photo_url, PNG);
  assert.equal(db.tables.players.find((p) => p.id === P1).club_shield_url, null);
});

test("imágenes: copia corrupta no se registra", async () => {
  const db = seed();
  const r = await media.migrateLegacyImages(db, fakeStorage({ corrupt: true }), U);
  assert.equal(r.copied, 0);
  assert.equal(r.failed, 2);
  assert.equal(db.tables.players.find((p) => p.id === P1).photo_path, null);
});

test("imágenes: subir requiere editor; el listado usa enlaces firmados y no trae base64 ya migrado", async () => {
  const db = seed();
  const st = fakeStorage();
  db.storage = st;
  await assert.rejects(media.uploadPlayerImage(db, st, U, P3, { kind: "photo", data_url: PNG }), /inexistente/);
  await assert.rejects(media.uploadPlayerImage(db, st, V, P1, { kind: "photo", data_url: "data:image/gif;base64,R0lG" }), /webp, jpeg o png/);
  const up = await media.uploadPlayerImage(db, st, V, P1, { kind: "photo", data_url: JPG });
  assert.match(up.url, /^https:\/\/signed\//);
  const roster = await core.loadRoster(db, U);
  const ana = roster.players.find((p) => p.id === P1);
  assert.equal(ana.photo_url, up.url);
  assert.equal(roster.players.find((p) => p.id === P2).photo_url, "https://externa/foto.jpg");
  const prof = await core.loadProfile(db, U, P1);
  assert.equal(prof.player.photo_url, up.url);
  // Quitar.
  await media.uploadPlayerImage(db, st, V, P1, { kind: "photo", remove: true });
  assert.equal(db.tables.players.find((p) => p.id === P1).photo_path, null);
  await assert.rejects(media.uploadPlayerImage(db, fakeStorage({ fail: true }), V, P1, { kind: "photo", data_url: JPG }), /No se pudo guardar/);
});

test("datos viejos: pendientes de decisión", async () => {
  const st = await media.legacyStatus(seed(), U);
  assert.equal(st.fundamentalsDefaultOnly, 0);
  assert.equal(st.textGoals, 1);
});
