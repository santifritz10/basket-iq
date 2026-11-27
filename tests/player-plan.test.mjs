import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import {
  attendanceSummary,
  libraryFind,
  libraryList,
  planByGoal,
  plannerTrainings,
  shootingPlanContent,
  splitPlan,
  validateAttendanceEntries,
  validateRoutineInput
} from "../lib/player-dev/plan.js";
import { measureGoal } from "../lib/player-dev/goals.js";
import { emptyZoneMap } from "../lib/shooting/model.js";
import * as core from "../lib/player-dev/core.js";
import * as pcore from "../lib/player-dev/plan-core.js";

const require = createRequire(import.meta.url);
const ARTICLES = [require("../js/academy-content/zona-2-3.js"), require("../js/academy-content/spacing.js")];

const U = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const V = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";
const G1 = "99999999-9999-4999-8999-999999999999";
const S1 = "44444444-4444-4444-8444-444444444444";
const S2 = "55555555-5555-4555-8555-555555555555";

function seed() {
  return createFakeDb({
    players: [
      { id: P1, display_name: "Ana", status: "active" },
      { id: P2, display_name: "Beto", status: "active" },
      { id: P3, display_name: "Ciro", status: "active" }
    ],
    player_members: [
      { player_id: P1, user_id: U, access_level: "admin", status: "active" },
      { player_id: P2, user_id: U, access_level: "viewer", status: "active" },
      { player_id: P3, user_id: V, access_level: "admin", status: "active" }
    ],
    player_goals: [{ id: G1, player_id: P1, status: "active", title: "Triples de esquina", metric_key: "shoot.zone_pct:t3_corner_l", target_value: 40, start_on: "2026-01-01", min_sample: 10, body: "x" }],
    player_goal_checkins: [],
    player_assessments: [],
    player_stat_records: [],
    assessment_criteria: [],
    teams: [],
    team_players: [],
    player_notes: [],
    player_evolution_events: [],
    activity_events: [],
    shooting_sessions: [
      { id: S1, fecha: "2026-11-10", status: "completed", recording_mode: "entries", nombre: "Tiro" },
      { id: S2, fecha: "2026-11-11", status: "completed", recording_mode: "entries", nombre: "Ajena" }
    ],
    shooting_session_players: [{ session_id: S1, player_id: P1 }, { session_id: S2, player_id: P3 }],
    shooting_entries: [],
    training_routines: [],
    player_plan_items: [],
    player_attendance: [],
    user_app_data: [
      { user_id: U, data_type: "trainings", payload: [
        { id: 1700000000001, nombre: "Martes", fecha: "2026-11-10", categoria: "U15", bloques: [{ duracion_minutos: 20 }, { duracion_minutos: 30 }] },
        { id: 1700000000002, nombre: "Futuro", fecha: "2999-01-01", bloques: [] },
        { id: 1700000000003, nombre: "Sin fecha", bloques: [] }
      ] },
      { user_id: V, data_type: "trainings", payload: [{ id: 42, nombre: "De otro", fecha: "2026-11-01", bloques: [] }] }
    ]
  });
}

test("planificador: se lee sin modificar y la biblioteca usa claves estables", () => {
  const list = plannerTrainings([{ id: 5, nombre: "A", fecha: "2026-11-01", bloques: [{ duracion_minutos: 15 }] }, { foo: 1 }, null]);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0], { ref: "5", name: "A", date: "2026-11-01", category: null, blocks: 1, minutes: 15 });
  const lib = libraryList(ARTICLES);
  assert.ok(lib.length >= 3);
  assert.ok(lib.every((x) => x.key.includes(":")));
  assert.equal(libraryFind(ARTICLES, lib[0].key).name, lib[0].name);
  assert.equal(libraryFind(ARTICLES, "inventado:x"), null);
});

test("rutinas: ejercicios propios o de la biblioteca, con validación", () => {
  const key = libraryList(ARTICLES)[0].key;
  const ok = validateRoutineInput({ name: "Tiro diario", items: [{ title: "Triples de esquina", zone_id: "t3_corner_l", attempts: 50, minutes: 10 }, { exercise_key: key }] }, ARTICLES);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.items[1].type, "exercise");
  assert.ok(ok.value.items[1].title, "toma el nombre real del ejercicio");
  assert.equal(validateRoutineInput({ name: "x", items: [] }, ARTICLES).ok, false);
  assert.equal(validateRoutineInput({ name: "x", items: [{ exercise_key: "nope:nope" }] }, ARTICLES).ok, false);
  assert.equal(validateRoutineInput({ name: "x", items: [{ title: "a", zone_id: "zona_marte" }] }, ARTICLES).ok, false);
  assert.equal(validateRoutineInput({ name: "x", items: [{ title: "a", attempts: 0 }] }, ARTICLES).ok, false);
});

test("plan de tiro sugerido: prioriza la zona de un objetivo activo", () => {
  const byZone = emptyZoneMap();
  const c = shootingPlanContent(byZone, [{ status: "active", metric_key: "shoot.zone_pct:t3_corner_l" }], { totalShots: 100 });
  assert.equal(c.totalShots, 100);
  const corner = c.zones.find((z) => z.zone_id === "t3_corner_l");
  const other = c.zones.find((z) => z.zone_id === "t3_front");
  assert.ok(corner.shots > other.shots);
  assert.deepEqual(c.goalZones, ["t3_corner_l"]);
});

test("planificado ≠ realizado: el objetivo no cambia por trabajo planificado", () => {
  const items = [
    { id: 1, goal_id: G1, status: "planned", planned_on: "2026-11-01" },
    { id: 2, goal_id: G1, status: "done", done_on: "2026-11-02" },
    { id: 3, goal_id: G1, status: "cancelled" },
    { id: 4, goal_id: null, status: "planned", planned_on: "2026-12-01" }
  ];
  const by = planByGoal(items);
  assert.deepEqual([by[G1].planned, by[G1].done], [1, 1]);
  const sp = splitPlan(items, "2026-11-20");
  assert.equal(sp.overdue.length, 1);
  assert.equal(sp.upcoming.length, 2);
  const profile = { sessions: [], entries: [], stats: [], assessments: [], checkins: [], planItems: items };
  const m = measureGoal({ id: G1, metric_key: "shoot.zone_pct:t3_corner_l", target_value: 40, status: "active" }, profile, { today: "2026-11-20" });
  assert.equal(m.value, null, "sin tiros realizados no hay valor, aunque haya trabajo planificado o marcado hecho");
  assert.equal(m.sample, 0);
});

test("asistencia: validación y resumen (justificados no cuentan en contra)", () => {
  assert.equal(validateAttendanceEntries([{ player_id: P1, status: "present" }, { player_id: P1, status: "absent" }]).ok, false);
  assert.equal(validateAttendanceEntries([{ player_id: P1, status: "tarde" }]).ok, false);
  const s = attendanceSummary([{ trained_on: "2026-11-01", status: "present" }, { trained_on: "2026-11-02", status: "absent" }, { trained_on: "2026-11-03", status: "excused" }, { trained_on: "2026-11-04", status: "partial" }]);
  assert.equal(s.rate, 50);
  assert.equal(s.total, 4);
});

test("servidor: asignar trabajo valida objetivo, entrenamiento, rutina propia y biblioteca", async () => {
  const db = seed();
  const log = [];
  const deps = { articles: ARTICLES, onActivity: async (e) => log.push(e) };
  const key = libraryList(ARTICLES)[0].key;
  const ex = await pcore.createPlanItem(db, U, P1, { kind: "exercise", exercise_key: key, goal_id: G1, training_ref: "1700000000001", title: "texto del navegador" }, deps);
  assert.equal(ex.item.title, libraryFind(ARTICLES, key).name, "el título sale de la biblioteca");
  assert.equal(ex.item.planned_on, "2026-11-10", "toma la fecha del entrenamiento");
  assert.match(ex.item.training_label, /Martes/);
  assert.equal(ex.item.status, "planned");
  await assert.rejects(pcore.createPlanItem(db, U, P1, { kind: "custom", title: "x", training_ref: "42" }, deps), /planificador/, "entrenamiento de otro usuario");
  await assert.rejects(pcore.createPlanItem(db, U, P1, { kind: "custom", title: "x", goal_id: "77777777-7777-4777-8777-777777777777" }, deps), /objetivo/);
  await assert.rejects(pcore.createPlanItem(db, U, P2, { kind: "custom", title: "x" }, deps), /permiso/, "lector");
  await assert.rejects(pcore.createPlanItem(db, U, P3, { kind: "custom", title: "x" }, deps), /inexistente/);
  const { routine } = await pcore.createRoutine(db, U, { name: "Tiro diario", items: [{ title: "Esquinas", zone_id: "t3_corner_l", attempts: 50 }] }, deps);
  await assert.rejects(pcore.createPlanItem(db, V, P3, { kind: "routine", routine_id: routine.id }, deps), /Rutina inexistente/, "rutina ajena");
  const r = await pcore.createPlanItem(db, U, P1, { kind: "routine", routine_id: routine.id, client_item_id: "c1" }, deps);
  assert.equal(r.item.content.items.length, 1);
  const again = await pcore.createPlanItem(db, U, P1, { kind: "routine", routine_id: routine.id, client_item_id: "c1" }, deps);
  assert.equal(again.duplicate, true);
  assert.equal(log.filter((e) => e.eventType === "plan.routine_assigned").length, 1);
  const sp = await pcore.createPlanItem(db, U, P1, { kind: "shooting_plan", total_shots: 80 }, deps);
  assert.equal(sp.item.content.totalShots, 80);
  assert.deepEqual(sp.item.content.goalZones, ["t3_corner_l"]);
  const prof = await core.loadProfile(db, U, P1);
  assert.equal(prof.planItems.length, 3);
  assert.equal(prof.schema.plan, true);
  assert.equal(db.tables.player_goals[0].status, "active", "el objetivo no se tocó");
});

test("servidor: realizado con fecha y sesión propia; cancelar en lugar de borrar", async () => {
  const db = seed();
  const deps = { articles: ARTICLES, onActivity: async () => {} };
  const { item } = await pcore.createPlanItem(db, U, P1, { kind: "custom", title: "Libres 50" }, deps);
  await assert.rejects(pcore.updatePlanItem(db, U, P1, item.id, { shooting_session_id: S1 }), /realizado/);
  await assert.rejects(pcore.updatePlanItem(db, U, P1, item.id, { status: "done", done_on: "2999-01-01" }), /futura/);
  await assert.rejects(pcore.updatePlanItem(db, U, P1, item.id, { status: "done", shooting_session_id: S2 }), /no es de este jugador/);
  const done = await pcore.updatePlanItem(db, U, P1, item.id, { status: "done", shooting_session_id: S1, result_notes: "Bien" });
  assert.equal(done.item.status, "done");
  assert.ok(done.item.done_on);
  assert.equal(done.item.shooting_session_id, S1);
  const back = await pcore.updatePlanItem(db, U, P1, item.id, { status: "planned" });
  assert.equal(back.item.done_on, null);
  assert.equal(back.item.shooting_session_id, null);
  const c = await pcore.updatePlanItem(db, U, P1, item.id, { status: "cancelled" });
  assert.equal(c.item.status, "cancelled");
  await assert.rejects(pcore.updatePlanItem(db, U, P1, item.id, { status: "done" }), /cancelado/);
  assert.equal(db.tables.player_plan_items.length, 1, "nada se borra");
});

test("servidor: asistencia por entrenamiento del planificador propio", async () => {
  const db = seed();
  await assert.rejects(pcore.saveAttendance(db, U, { training_ref: "1700000000002", entries: [{ player_id: P1, status: "present" }] }), /futuro/);
  await assert.rejects(pcore.saveAttendance(db, U, { training_ref: "1700000000003", entries: [{ player_id: P1, status: "present" }] }), /fecha/);
  await assert.rejects(pcore.saveAttendance(db, U, { training_ref: "1700000000001", entries: [{ player_id: P2, status: "present" }] }), /permiso/);
  await assert.rejects(pcore.saveAttendance(db, U, { training_ref: "1700000000001", entries: [{ player_id: P3, status: "present" }] }), /permiso/);
  const a = await pcore.saveAttendance(db, U, { training_ref: "1700000000001", entries: [{ player_id: P1, status: "present" }] });
  assert.equal(a.attendance[0].trained_on, "2026-11-10");
  await pcore.saveAttendance(db, U, { training_ref: "1700000000001", entries: [{ player_id: P1, status: "partial", notes: "Se fue antes" }] });
  assert.equal(db.tables.player_attendance.length, 1, "corrige, no duplica");
  assert.equal(db.tables.player_attendance[0].status, "partial");
  const ov = await pcore.loadTrainingOverview(db, U, "1700000000001");
  assert.equal(ov.attendance.length, 1);
  assert.ok(ov.players.every((p) => p.id !== P3), "no muestra jugadores ajenos");
  const planning = await pcore.loadPlanning(db, U, { articles: ARTICLES });
  assert.equal(planning.trainings.length, 3);
  assert.ok(planning.library.length > 0);
});

test("servidor: aviso claro si falta la migración 014", async () => {
  const db = seed();
  db.dropTable("player_plan_items");
  db.dropTable("player_attendance");
  db.dropTable("training_routines");
  const prof = await core.loadProfile(db, U, P1);
  assert.equal(prof.schema.plan, false);
  assert.deepEqual(prof.planItems, []);
  await assert.rejects(pcore.createPlanItem(db, U, P1, { kind: "custom", title: "x" }, { articles: ARTICLES }), /014/);
  const planning = await pcore.loadPlanning(db, U, { articles: ARTICLES });
  assert.equal(planning.schema.plan, false);
});
