import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import * as core from "../lib/player-dev/core.js";
import * as goals from "../lib/player-dev/goals-core.js";
import * as plan from "../lib/player-dev/plan-core.js";
import * as reports from "../lib/player-dev/reports-core.js";
import * as media from "../lib/player-dev/media-core.js";

// Un mismo jugador con admin (A), editor (E), lector (L) y alguien sin acceso (X).
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const E = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const L = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const X = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const P = "11111111-1111-4111-8111-111111111111";

function seed() {
  return createFakeDb({
    players: [{ id: P, display_name: "Ana", status: "active" }],
    player_members: [
      { player_id: P, user_id: A, access_level: "admin", status: "active" },
      { player_id: P, user_id: E, access_level: "editor", status: "active" },
      { player_id: P, user_id: L, access_level: "viewer", status: "active" }
    ],
    player_goals: [], player_goal_checkins: [], player_assessments: [], player_stat_records: [], assessment_criteria: [],
    teams: [], team_players: [], player_notes: [], player_evolution_events: [], activity_events: [],
    shooting_sessions: [], shooting_session_players: [], shooting_entries: [],
    training_routines: [], player_plan_items: [], player_attendance: [], player_reports: [],
    user_app_data: [{ user_id: L, data_type: "trainings", payload: [{ id: 7, nombre: "Martes", fecha: "2026-11-10", bloques: [] }] }]
  });
}

const now = new Date("2026-11-27T12:00:00Z");

test("colaboración: el lector ve pero no escribe en ninguna sección", async () => {
  const db = seed();
  const prof = await core.loadProfile(db, L, P);
  assert.equal(prof.access_level, "viewer");
  assert.equal(prof.members, null, "solo el admin ve a los colaboradores");
  const writes = [
    () => core.createAssessment(db, L, P, { assessed_on: "2026-11-20", values: [] }),
    () => core.createStatRecord(db, L, P, { record_type: "match", played_on: "2026-11-20" }),
    () => goals.createGoal(db, L, P, { title: "x", goal_type: "technical" }),
    () => goals.createNote(db, L, P, { body: "x" }),
    () => plan.createPlanItem(db, L, P, { kind: "custom", title: "x" }, { articles: [] }),
    () => plan.saveAttendance(db, L, { training_ref: "7", entries: [{ player_id: P, status: "present" }] }),
    () => reports.createReport(db, L, P, { report_type: "monthly" }, { now }),
    () => media.uploadPlayerImage(db, null, L, P, { kind: "photo", remove: true })
  ];
  for (const w of writes) await assert.rejects(w(), (e) => e.status === 403, String(w));
  assert.equal(db.tables.player_goals.length + db.tables.player_notes.length + db.tables.player_plan_items.length + db.tables.player_reports.length, 0);
});

test("colaboración: sin acceso, un id válido responde como inexistente", async () => {
  const db = seed();
  const calls = [
    () => core.loadProfile(db, X, P),
    () => goals.createNote(db, X, P, { body: "x" }),
    () => reports.listReports(db, X, P),
    () => reports.loadInsights(db, X, P, {}),
    () => goals.loadCompare(db, X, [P, P])
  ];
  for (const c of calls) await assert.rejects(c(), (e) => e.status === 404 || e.status === 400, String(c));
});

test("colaboración: notas privadas e informes en borrador son solo de su autor", async () => {
  const db = seed();
  await goals.createNote(db, E, P, { body: "privada del editor", visibility: "private" });
  await goals.createNote(db, E, P, { body: "para todos" });
  const { report } = await reports.createReport(db, E, P, { report_type: "weekly" }, { now });
  const forAdmin = await core.loadProfile(db, A, P);
  assert.deepEqual(forAdmin.notes.map((n) => n.body), ["para todos"]);
  assert.equal((await reports.listReports(db, A, P)).reports.length, 0);
  assert.equal((await core.loadProfile(db, E, P)).notes.length, 2);
  // Ni siquiera el admin modifica el borrador ajeno.
  await assert.rejects(reports.updateReport(db, A, report.id, { title: "x" }), /inexistente/);
  const note = db.tables.player_notes.find((n) => n.visibility === "private");
  await assert.rejects(goals.updateNote(db, A, P, note.id, { body: "x" }), (e) => e.status === 404);
});
