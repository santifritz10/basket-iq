import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import {
  comparePlayers,
  filterNotes,
  measureGoal,
  metricByKey,
  periodSummary,
  shootingDays,
  validateCheckin,
  validateGoalInput,
  validateNoteInput,
  visibleNotes,
  weeklyVolume
} from "../lib/player-dev/goals.js";
import * as core from "../lib/player-dev/core.js";
import * as gcore from "../lib/player-dev/goals-core.js";

const U = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const V = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const W = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";
const S1 = "44444444-4444-4444-8444-444444444444";
const S2 = "55555555-5555-4555-8555-555555555555";
const S3 = "66666666-6666-4666-8666-666666666666";

function seed() {
  return createFakeDb({
    players: [
      { id: P1, display_name: "Ana", status: "active" },
      { id: P2, display_name: "Beto", status: "active" },
      { id: P3, display_name: "Ciro", status: "active" }
    ],
    player_members: [
      { player_id: P1, user_id: U, access_level: "admin", status: "active" },
      { player_id: P1, user_id: V, access_level: "editor", status: "active" },
      { player_id: P2, user_id: U, access_level: "viewer", status: "active" },
      { player_id: P3, user_id: W, access_level: "admin", status: "active" }
    ],
    player_goals: [{ id: "99999999-9999-4999-8999-999999999999", player_id: P1, status: "active", body: "Triples (texto viejo)", created_at: "2026-01-01T00:00:00Z" }],
    player_goal_checkins: [],
    player_assessments: [],
    player_stat_records: [],
    assessment_criteria: [],
    teams: [],
    team_players: [],
    player_notes: [],
    player_evolution_events: [],
    activity_events: []
  });
}

/** Perfil mínimo: sesión 1 con registros propios, sesión 2 histórica individual, sesión 3 histórica grupal. */
function profile() {
  return {
    player: { id: P1 },
    sessions: [
      { id: S1, fecha: "2026-11-10", status: "completed", recording_mode: "entries", provenance: "entries" },
      { id: S2, fecha: "2026-11-01", status: "completed", recording_mode: "legacy_zones", provenance: "legacy_single", legacy_zones: { t3_front: { attempts: 10, made: 4 } } },
      { id: S3, fecha: "2026-11-05", status: "completed", recording_mode: "legacy_zones", provenance: "legacy_group", legacy_zones: null }
    ],
    entries: [
      { session_id: S1, player_id: P1, zone_id: "t3_corner_l", attempts: 20, made: 9 },
      { session_id: S1, player_id: P1, zone_id: "ft", attempts: 10, made: 8 }
    ],
    stats: [
      { record_type: "match", played_on: "2026-11-02", turnovers: 4, points: 10, fg3_made: 1, fg3_att: 5 },
      { record_type: "match", played_on: "2026-11-09", turnovers: 2, points: 14, fg3_made: 2, fg3_att: 4 },
      { record_type: "training", played_on: "2026-11-09", turnovers: 0, points: 30 },
      { record_type: "match", played_on: "2026-11-16", turnovers: 3, points: 8 }
    ],
    assessments: [],
    checkins: [],
    goals: []
  };
}

test("objetivo de %: muestra insuficiente no cuenta como cumplido", () => {
  const p = profile();
  const goal = { id: "g", metric_key: "shoot.three_pct", target_value: 40, start_on: "2026-10-01", status: "active", min_sample: 50 };
  const m = measureGoal(goal, p, { today: "2026-11-20" });
  // 9/20 + 4/10 = 13/30 = 43,3%: la grupal no suma nada.
  assert.equal(m.value, 43.3);
  assert.equal(m.sample, 30);
  assert.equal(m.meets, true);
  assert.equal(m.reached, false, "30 intentos < 50 de muestra mínima");
  const enough = measureGoal({ ...goal, min_sample: 30 }, p, { today: "2026-11-20" });
  assert.equal(enough.reached, true);
  assert.equal(shootingDays(p).length, 2, "la sesión grupal histórica se excluye");
});

test("objetivo de partidos: menos es mejor y entrenamiento no se mezcla", () => {
  const goal = { id: "g", metric_key: "match.turnovers_avg", target_value: 3, baseline_value: 4, start_on: "2026-11-01", status: "active", comparison: "lte", min_sample: 3 };
  const m = measureGoal(goal, profile(), { today: "2026-11-20" });
  assert.equal(m.value, 3, "(4+2+3)/3; el registro de entrenamiento no cuenta");
  assert.equal(m.sample, 3);
  assert.equal(m.reached, true);
  assert.equal(m.progress, 1);
  const pts = measureGoal({ ...goal, metric_key: "match.points_avg", comparison: "gte", target_value: 12, baseline_value: 8 }, profile(), { today: "2026-11-20" });
  assert.equal(pts.value, 10.7);
  assert.ok(pts.progress > 0.6 && pts.progress < 0.7);
  const three = measureGoal({ ...goal, metric_key: "match.three_pct", comparison: "gte", target_value: 30, min_sample: 20 }, profile(), { today: "2026-11-20" });
  assert.equal(three.sample, 9, "solo partidos con intentos cargados");
  assert.equal(three.reached, false);
});

test("objetivo de volumen y período: solo cuenta lo realizado dentro de las fechas", () => {
  const p = profile();
  const goal = { id: "g", metric_key: "shoot.sessions", target_value: 2, start_on: "2026-11-05", due_on: "2026-11-30", status: "active" };
  const m = measureGoal(goal, p, { today: "2026-11-20" });
  assert.equal(m.value, 1, "la sesión del 1/11 queda fuera del período");
  assert.equal(m.reached, false);
  assert.equal(m.overdue, false);
  const late = measureGoal({ ...goal, due_on: "2026-11-15" }, p, { today: "2026-11-20" });
  assert.equal(late.overdue, true);
  assert.equal(weeklyVolume(shootingDays(p)).reduce((a, w) => a + w.attempts, 0), 40);
});

test("objetivo cualitativo: se mide a mano con mediciones", () => {
  const p = { ...profile(), checkins: [
    { goal_id: "g", measured_on: "2026-11-02", value: 2, voided_at: null },
    { goal_id: "g", measured_on: "2026-11-12", value: 4, voided_at: null },
    { goal_id: "g", measured_on: "2026-11-13", value: 5, voided_at: "2026-11-14T00:00:00Z" },
    { goal_id: "otro", measured_on: "2026-11-12", value: 9, voided_at: null }
  ] };
  const m = measureGoal({ id: "g", metric_key: "manual", target_value: 4, status: "active" }, p, { today: "2026-11-20" });
  assert.equal(m.value, 4, "la medición anulada no cuenta");
  assert.equal(m.series.length, 2);
  assert.equal(m.reached, true);
  const noMetric = measureGoal({ id: "x", status: "active" }, p, { today: "2026-11-20" });
  assert.equal(noMetric.value, null);
  assert.equal(noMetric.reached, false);
});

test("validaciones de objetivo, medición y nota", () => {
  assert.equal(validateGoalInput({ title: "Triples", goal_type: "statistical", metric_key: "shoot.three_pct" }).ok, false, "falta la meta");
  assert.equal(validateGoalInput({ title: "x", metric_key: "nada" }).ok, false);
  assert.equal(validateGoalInput({ title: "x", start_on: "2026-11-10", due_on: "2026-11-01" }).ok, false);
  const ok = validateGoalInput({ title: "Mano débil", goal_type: "technical" });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.body, "Mano débil", "la descripción por defecto es el título (pantallas viejas)");
  const auto = validateGoalInput({ title: "Pérdidas", metric_key: "match.turnovers_avg", target_value: "2" });
  assert.equal(auto.value.comparison, "lte");
  assert.equal(auto.value.min_sample, 3);
  assert.equal(auto.value.data_source, "auto");
  assert.ok(metricByKey("shoot.zone_pct:t3_corner_l"));
  assert.equal(validateCheckin({ measured_on: "2026-12-01", value: 3 }, "2026-11-20").ok, false);
  assert.equal(validateCheckin({ measured_on: "2026-11-01" }, "2026-11-20").ok, false);
  assert.equal(validateNoteInput({ body: "hola", visibility: "secreta" }).ok, false);
  assert.equal(validateNoteInput({ body: "hola", linked_type: "goal" }).ok, false, "vínculo sin id");
  const notes = [
    { id: 1, body: "Defensa ok", note_type: "tactical", visibility: "collaborators", created_by_user_id: V },
    { id: 2, body: "privada", note_type: "general", visibility: "private", created_by_user_id: V },
    { id: 3, body: "Mano débil", note_type: "technical", visibility: "private", created_by_user_id: U }
  ];
  assert.deepEqual(visibleNotes(notes, U).map((n) => n.id), [1, 3]);
  assert.deepEqual(filterNotes(notes, { type: "technical" }).map((n) => n.id), [3]);
  assert.deepEqual(filterNotes(notes, { q: "DEFENSA" }).map((n) => n.id), [1]);
});

test("servidor: nota privada solo para su autor, sin rastro en la actividad", async () => {
  const db = seed();
  const log = [];
  const deps = { onActivity: async (e) => log.push(e) };
  const { note } = await gcore.createNote(db, V, P1, { body: "Observación privada", note_type: "attitude", visibility: "private" }, deps);
  assert.equal(log.length, 0);
  const asU = await core.loadProfile(db, U, P1);
  assert.equal(asU.notes.length, 0, "el admin no ve la nota privada de otro");
  const asV = await core.loadProfile(db, V, P1);
  assert.equal(asV.notes.length, 1);
  await assert.rejects(gcore.updateNote(db, U, P1, note.id, { body: "editada" }), /inexistente/);
  await assert.rejects(gcore.deleteNote(db, U, P1, note.id), /inexistente/);
  const shared = await gcore.createNote(db, U, P1, { body: "Compartida" }, deps);
  assert.equal(shared.note.visibility, "collaborators");
  assert.equal(shared.note.note_type, "general");
  await assert.rejects(gcore.updateNote(db, V, P1, shared.note.id, { visibility: "private" }), /Solo quien escribió/);
  await assert.rejects(gcore.createNote(db, U, P2, { body: "x" }), /permiso/, "lector no escribe");
});

test("servidor: objetivo medible, medición y cumplimiento confirmado", async () => {
  const db = seed();
  const log = [];
  const deps = { onActivity: async (e) => log.push(e) };
  const { goal } = await gcore.createGoal(db, U, P1, { title: "Libres 75%", goal_type: "statistical", metric_key: "shoot.ft_pct", target_value: 75, due_on: "2027-03-01" }, deps);
  assert.equal(goal.status, "active");
  assert.equal(goal.min_sample, 30);
  assert.ok(goal.start_on);
  assert.equal(log[0].eventType, "player_goal.created");
  await assert.rejects(gcore.createGoal(db, U, P3, { title: "x" }), /inexistente/, "jugador ajeno");
  await assert.rejects(gcore.addCheckin(db, U, P1, goal.id, { measured_on: "2999-01-01", value: 3 }), /futura/);
  const { checkin } = await gcore.addCheckin(db, V, P1, goal.id, { value: 70, note: "Control" }, deps);
  await assert.rejects(gcore.addCheckin(db, U, P2, goal.id, { value: 1 }), /permiso|inexistente/);
  await gcore.voidCheckin(db, U, P1, checkin.id);
  const prof = await core.loadProfile(db, U, P1);
  assert.equal(prof.checkins.length, 0, "anulada, no borrada");
  assert.equal(db.tables.player_goal_checkins.length, 1);
  const done = await gcore.updateGoal(db, U, P1, goal.id, { status: "completed", achieved_value: 77 }, deps);
  assert.equal(done.goal.status, "completed");
  assert.equal(done.goal.achieved_value, 77);
  assert.ok(done.goal.achieved_at);
  assert.equal(log.at(-1).eventType, "player_goal.achieved");
  const back = await gcore.updateGoal(db, U, P1, goal.id, { status: "active" }, deps);
  assert.equal(back.goal.achieved_at, null);
  // Objetivo de texto viejo: editar el estado no toca su texto.
  const old = await gcore.updateGoal(db, U, P1, "99999999-9999-4999-8999-999999999999", { status: "archived" }, deps);
  assert.equal(old.goal.body, "Triples (texto viejo)");
  assert.equal(old.goal.title, undefined);
});

test("servidor: comparar exige acceso a todos y entre 2 y 4 jugadores", async () => {
  const db = seed();
  await assert.rejects(gcore.loadCompare(db, U, [P1]), /al menos dos/);
  await assert.rejects(gcore.loadCompare(db, U, [P1, P3]), /inexistente/, "Ciro es de otro entrenador");
  const res = await gcore.loadCompare(db, U, [P1, P2]);
  assert.equal(res.players.length, 2);
  assert.equal(res.players[0].members, undefined);
  assert.equal(res.players[0].notes, undefined, "la comparación no expone notas");
  const rows = comparePlayers([profile(), { ...profile(), player: { id: P2 }, entries: [], sessions: [] }], { from: "2026-11-01", to: "2026-11-30" });
  assert.equal(rows[0].metrics["shoot.attempts"].value, 40);
  assert.equal(rows[1].metrics["shoot.fg_pct"].value, null);
  assert.equal(rows[0].metrics["shoot.fg_pct"].enough, false, "30 tiros de campo < 50");
  assert.equal(rows[0].records.matches, 3);
  const sum = periodSummary(profile(), { from: "2026-11-08", to: "2026-11-30" });
  assert.equal(sum.sessions, 1);
  assert.equal(sum.matches, 2);
  assert.equal(sum.matchAvg.points, 11);
});

test("servidor: aviso claro si falta la migración 013", async () => {
  const db = seed();
  db.dropTable("player_goal_checkins");
  const prof = await core.loadProfile(db, U, P1);
  assert.equal(prof.schema.goals, false);
  await assert.rejects(gcore.addCheckin(db, U, P1, "99999999-9999-4999-8999-999999999999", { value: 1 }), /013/);
});
