import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import * as inv from "../lib/player-dev/invitations-core.js";
import * as core from "../lib/player-dev/core.js";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // admin que invita
const E = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"; // editor
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // cuenta invitada
const X = "ffffffff-ffff-4fff-8fff-ffffffffffff"; // otra cuenta
const P = "11111111-1111-4111-8111-111111111111";
const I1 = "22222222-2222-4222-8222-222222222222";
const I2 = "33333333-3333-4333-8333-333333333333";
const I3 = "44444444-4444-4444-8444-444444444444";
const now = new Date("2026-11-27T12:00:00Z");
const future = "2026-12-04T12:00:00Z";

function seed() {
  return createFakeDb({
    players: [{ id: P, display_name: "Ana", status: "active" }],
    player_members: [
      { id: "m1", player_id: P, user_id: A, access_level: "admin", relationship_type: "coach", status: "active" },
      { id: "m2", player_id: P, user_id: E, access_level: "editor", relationship_type: "assistant", status: "active" }
    ],
    player_invitations: [
      { id: I1, player_id: P, email: "b@x.com", relationship_type: "parent", access_level: "viewer", token_hash: inv.hashToken("tok1"), invited_by_user_id: A, expires_at: future, status: "pending", created_at: "2026-11-27T10:00:00Z" },
      { id: I2, player_id: P, email: "b@x.com", relationship_type: "coach", access_level: "editor", token_hash: inv.hashToken("tok2"), invited_by_user_id: A, expires_at: "2026-11-20T00:00:00Z", status: "pending", created_at: "2026-11-13T10:00:00Z" },
      { id: I3, player_id: P, email: "otra@x.com", relationship_type: "coach", access_level: "editor", token_hash: inv.hashToken("tok3"), invited_by_user_id: A, expires_at: future, status: "pending", created_at: "2026-11-27T11:00:00Z" }
    ],
    player_goals: [], player_goal_checkins: [], player_assessments: [], player_stat_records: [], assessment_criteria: [],
    teams: [], team_players: [], player_notes: [], player_evolution_events: [], activity_events: [],
    shooting_sessions: [], shooting_session_players: [], shooting_entries: [],
    training_routines: [], player_plan_items: [], player_attendance: [], player_reports: [], user_app_data: []
  });
}

test("invitaciones: la cuenta invitada ve solo las suyas, vigentes y con el nombre del jugador", async () => {
  const db = seed();
  const { invitations } = await inv.listMyInvitations(db, " B@X.com ", { now });
  assert.deepEqual(invitations.map((i) => i.id), [I1]);
  assert.equal(invitations[0].player_name, "Ana");
  assert.equal(invitations[0].token_hash, undefined, "el hash no sale");
  assert.equal((await inv.listMyInvitations(db, "nadie@x.com", { now })).invitations.length, 0);
});

test("invitaciones: aceptar desde la lista da acceso con el permiso elegido", async () => {
  const db = seed();
  const events = [];
  const r = await inv.acceptInvitation(db, B, "b@x.com", { invitationId: I1 }, { now, onActivity: (e) => events.push(e) });
  assert.equal(r.player_id, P);
  const m = db.tables.player_members.find((x) => x.user_id === B);
  assert.equal(m.access_level, "viewer");
  assert.equal(m.status, "active");
  assert.equal(db.tables.player_invitations.find((x) => x.id === I1).status, "accepted");
  assert.equal(events[0].eventType, "member.joined");
  const prof = await core.loadProfile(db, B, P);
  assert.equal(prof.access_level, "viewer");
  // No se acepta dos veces.
  await assert.rejects(inv.acceptInvitation(db, B, "b@x.com", { invitationId: I1 }, { now }), (e) => e.status === 404);
});

test("invitaciones: por enlace, con otra cuenta no se acepta y se explica", async () => {
  const db = seed();
  await assert.rejects(inv.acceptInvitation(db, X, "x@x.com", { token: "tok1" }, { now }), (e) => e.status === 403 && /b@x\.com/.test(e.message));
  // Por id, una invitación ajena responde como inexistente.
  await assert.rejects(inv.acceptInvitation(db, X, "x@x.com", { invitationId: I1 }, { now }), (e) => e.status === 404);
  assert.equal(db.tables.player_members.some((m) => m.user_id === X), false);
  const r = await inv.acceptInvitation(db, B, "b@x.com", { token: " tok1 " }, { now });
  assert.equal(r.player_id, P);
});

test("invitaciones: vencida no se acepta y queda marcada; código falso no sirve", async () => {
  const db = seed();
  await assert.rejects(inv.acceptInvitation(db, B, "b@x.com", { token: "tok2" }, { now }), (e) => e.status === 410);
  assert.equal(db.tables.player_invitations.find((x) => x.id === I2).status, "expired");
  await assert.rejects(inv.acceptInvitation(db, B, "b@x.com", { token: "inventado" }, { now }), (e) => e.status === 404);
  await assert.rejects(inv.acceptInvitation(db, B, "b@x.com", {}, { now }), (e) => e.status === 400);
});

test("invitaciones: aceptar una invitación menor no baja un permiso mayor", async () => {
  const db = seed();
  db.tables.player_invitations.push({ id: "55555555-5555-4555-8555-555555555555", player_id: P, email: "e@x.com", relationship_type: "parent", access_level: "viewer", token_hash: inv.hashToken("t5"), invited_by_user_id: A, expires_at: future, status: "pending" });
  await inv.acceptInvitation(db, E, "e@x.com", { token: "t5" }, { now });
  const m = db.tables.player_members.find((x) => x.user_id === E);
  assert.equal(m.access_level, "editor");
  assert.equal(db.tables.player_members.filter((x) => x.user_id === E).length, 1);
});

test("invitaciones: rechazar y anular no borran; permisos de quien gestiona", async () => {
  const db = seed();
  await inv.declineInvitation(db, "b@x.com", I1, { now });
  assert.equal(db.tables.player_invitations.find((x) => x.id === I1).status, "revoked");
  assert.equal(db.tables.player_invitations.length, 3);
  // El editor ve las pendientes pero solo anula las suyas; el admin anula cualquiera.
  const { invitations } = await inv.listPlayerInvitations(db, E, P, { now });
  assert.deepEqual(invitations.map((i) => i.id).sort(), [I2, I3].sort());
  assert.equal(invitations.find((i) => i.id === I2).expired, true);
  await assert.rejects(inv.revokeInvitation(db, E, P, I3), (e) => e.status === 403);
  await inv.revokeInvitation(db, A, P, I3);
  assert.equal(db.tables.player_invitations.find((x) => x.id === I3).status, "revoked");
  // Sin acceso al jugador: inexistente.
  await assert.rejects(inv.listPlayerInvitations(db, X, P, { now }), (e) => e.status === 404);
});
