import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import {
  aggregateStats,
  assessmentBatches,
  compareBatches,
  criteriaCatalog,
  dimensionSummary,
  filterRoster,
  groupRoster,
  latestByCriterion,
  legacyFundamentalsView,
  suggestTeams,
  validateAssessmentInput,
  validateStatRecord
} from "../lib/player-dev/model.js";
import * as core from "../lib/player-dev/core.js";

const U = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const V = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";
const uid = () => crypto.randomUUID();

function seed() {
  return createFakeDb({
    players: [
      { id: P1, display_name: "Ana", team: "U17 Club", category: "U17", status: "active", fundamentals: { drib_control: 3, shot_mechanics: 3 }, game_stats: {} },
      { id: P2, display_name: "Beto", team: "u17  club", category: "U17", status: "active", fundamentals: {}, game_stats: {} },
      { id: P3, display_name: "Ciro", team: "Otro", category: "U15", status: "active", fundamentals: {}, game_stats: {} }
    ],
    player_members: [
      { player_id: P1, user_id: U, access_level: "admin", status: "active" },
      { player_id: P2, user_id: U, access_level: "viewer", status: "active" },
      { player_id: P3, user_id: V, access_level: "admin", status: "active" }
    ],
    player_goals: [{ player_id: P1, status: "active", body: "Triples" }],
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

test("evaluación: no evaluado ≠ valor intermedio, y valida escala", () => {
  const cat = criteriaCatalog([]);
  const ok = validateAssessmentInput({ batch_id: uid(), assessed_on: "2026-11-20", items: [{ criterion_key: "drib_control", value: 4 }, { criterion_key: "def_on_ball", value: "" }] }, cat);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.rows.length, 1, "el criterio vacío queda sin evaluar");
  const bad = validateAssessmentInput({ batch_id: uid(), assessed_on: "2026-11-20", items: [{ criterion_key: "drib_control", value: 6 }] }, cat);
  assert.equal(bad.ok, false);
  const none = validateAssessmentInput({ batch_id: uid(), assessed_on: "2026-11-20", items: [] }, cat);
  assert.equal(none.ok, false);
  const legacyBad = validateAssessmentInput({ batch_id: uid(), assessed_on: "2026-11-20", source: "legacy_confirmed", items: [{ criterion_key: "def_on_ball", value: 3 }] }, cat);
  assert.equal(legacyBad.ok, false, "solo se confirman criterios del sistema anterior");
});

test("estrellas viejas: todo en 3 se informa como valor por defecto", () => {
  assert.equal(legacyFundamentalsView({ drib_control: 3, shot_mechanics: 3 }).status, "default_only");
  assert.equal(legacyFundamentalsView({ drib_control: 4, shot_mechanics: 3 }).status, "values");
  assert.equal(legacyFundamentalsView({}).status, "empty");
});

test("historial: último valor, lotes, comparación y resumen por fundamento", () => {
  const a = [
    { batch_id: "b1", assessed_on: "2026-10-01", criterion_key: "drib_control", criterion_label: "Control", dimension: "dribbling", value: 2, scale_max: 5, created_at: "1" },
    { batch_id: "b2", assessed_on: "2026-11-01", criterion_key: "drib_control", criterion_label: "Control", dimension: "dribbling", value: 4, scale_max: 5, created_at: "2" },
    { batch_id: "b2", assessed_on: "2026-11-01", criterion_key: "drib_weak_hand", criterion_label: "Mano débil", dimension: "dribbling", value: 3, scale_max: 5, created_at: "2" },
    { batch_id: "b3", assessed_on: "2026-11-05", criterion_key: "shot_mechanics", criterion_label: "Mecánica", dimension: "shooting", value: 5, scale_max: 5, created_at: "3", voided_at: "x" }
  ];
  assert.equal(latestByCriterion(a).drib_control.value, 4);
  assert.equal(latestByCriterion(a).shot_mechanics, undefined, "lo anulado no cuenta");
  const batches = assessmentBatches(a);
  assert.deepEqual(batches.map((b) => b.batch_id), ["b2", "b1"]);
  const cmp = compareBatches(batches[1], batches[0]);
  assert.equal(cmp.find((r) => r.criterion_key === "drib_control").delta, 2);
  assert.equal(cmp.find((r) => r.criterion_key === "drib_weak_hand").a, null);
  const dims = dimensionSummary(a, criteriaCatalog([]));
  assert.equal(dims.find((d) => d.dimension.id === "dribbling").score, 70);
  assert.equal(dims.find((d) => d.dimension.id === "shooting").evaluated, false);
});

test("estadísticas: validación y % con totales, sin mezclar tipos", () => {
  assert.equal(validateStatRecord({ record_type: "match", played_on: "2026-11-01", fg3_made: 3, fg3_att: 2 }).ok, false);
  assert.equal(validateStatRecord({ record_type: "match", played_on: "2026-11-01", fg3_made: 3 }).ok, false);
  assert.equal(validateStatRecord({ record_type: "match", played_on: "2026-11-01", points: -1 }).ok, false);
  const recs = [
    { record_type: "match", fg3_made: 1, fg3_att: 10, points: 10 },
    { record_type: "match", fg3_made: 4, fg3_att: 5, points: 20 },
    { record_type: "training", fg3_made: 50, fg3_att: 60 },
    { record_type: "match", fg3_made: 9, fg3_att: 9, voided_at: "x" }
  ];
  const m = aggregateStats(recs, "match");
  assert.equal(m.fg3.made, 5);
  assert.equal(m.fg3.att, 15, "1/10 y 4/5 = 5/15, no el promedio de porcentajes");
  assert.equal(m.averages.points, 15);
  assert.equal(aggregateStats(recs, "training").fg3.att, 60);
});

test("equipos: propuestas sin fusionar automáticamente y con variantes marcadas", () => {
  const s = suggestTeams([
    { id: "a", team: "U17 Club", category: "U17" },
    { id: "b", team: "u17  club", category: "U17" },
    { id: "c", team: "Otro", category: "" },
    { id: "d", team: "", category: "U13" }
  ]);
  assert.equal(s.length, 2);
  assert.equal(s[0].players.length, 2);
  assert.equal(s[0].ambiguous, true);
  assert.equal(suggestTeams([{ id: "a", team: "X" }], new Set(["a"])).length, 0, "quien ya tiene equipo no se propone");
});

test("listado: búsqueda, orden y agrupación", () => {
  const items = [
    { display_name: "Beto", team: "B", last_session_on: "2026-11-01", active_goals: 0 },
    { display_name: "Ana", team: "A", last_session_on: "2026-11-10", active_goals: 2 },
    { display_name: "Ciro", team: "", last_session_on: null, active_goals: 1 }
  ];
  assert.deepEqual(filterRoster(items, {}, "name").map((p) => p.display_name), ["Ana", "Beto", "Ciro"]);
  assert.deepEqual(filterRoster(items, {}, "last_session").map((p) => p.display_name), ["Ana", "Beto", "Ciro"]);
  assert.deepEqual(filterRoster(items, { q: "bet" }).map((p) => p.display_name), ["Beto"]);
  const g = groupRoster(items);
  assert.equal(g[g.length - 1].label, "Sin equipo");
});

test("servidor: evaluaciones con permisos, idempotentes y anulables", async () => {
  const db = seed();
  const events = [];
  const batch = uid();
  const body = { batch_id: batch, assessed_on: "2026-11-20", context: "training", items: [{ criterion_key: "drib_control", value: 4 }] };
  const r = await core.createAssessment(db, U, P1, body, { onActivity: (e) => events.push(e) });
  assert.equal(r.assessments.length, 1);
  await core.createAssessment(db, U, P1, body, { onActivity: (e) => events.push(e) });
  assert.equal(db.tables.player_assessments.length, 1, "reenviar no duplica");
  assert.equal(events.length, 1, "ni duplica el evento");
  await assert.rejects(core.createAssessment(db, U, P2, { ...body, batch_id: uid() }), /permiso/);
  await assert.rejects(core.createAssessment(db, U, P3, { ...body, batch_id: uid() }), /inexistente/);
  await assert.rejects(core.createAssessment(db, U, P1, { ...body, batch_id: uid(), assessed_on: "2999-01-01" }), /futura/);
  await core.voidAssessment(db, U, P1, batch);
  assert.ok(db.tables.player_assessments[0].voided_at);
  assert.equal(db.tables.players[0].fundamentals.drib_control, 3, "no toca las estrellas viejas");
});

test("servidor: estadísticas sin duplicar y el histórico manual es de solo lectura", async () => {
  const db = seed();
  const id = uid();
  const body = { client_record_id: id, record_type: "match", played_on: "2026-11-01", opponent: "Rival", ft_made: 3, ft_att: 4 };
  const a = await core.createStatRecord(db, U, P1, body);
  const b = await core.createStatRecord(db, U, P1, body);
  assert.equal(a.record.id, b.record.id);
  assert.equal(db.tables.player_stat_records.length, 1);
  db.tables.player_stat_records.push({ id: uid(), player_id: P1, record_type: "manual_legacy", legacy_values: { ft_pct: "45" }, voided_at: null });
  const legacyId = db.tables.player_stat_records[1].id;
  await assert.rejects(core.updateStatRecord(db, U, P1, legacyId, { points: 3 }), /conservan/);
  await assert.rejects(core.voidStatRecord(db, U, P1, legacyId), /conservan/);
  await assert.rejects(core.createStatRecord(db, U, P2, { ...body, client_record_id: uid() }), /permiso/);
});

test("servidor: equipos de cada entrenador e historial de pertenencia", async () => {
  const db = seed();
  const { team, added, skipped } = await core.createTeam(db, U, { name: "U17 Club", category: "U17", player_ids: [P1, P2, P3] });
  assert.deepEqual(added, [P1]);
  assert.deepEqual(skipped.sort(), [P2, P3].sort(), "sin edición o sin acceso no se suma");
  assert.equal(db.tables.team_players[0].original_team, "U17 Club");
  await assert.rejects(core.addTeamMember(db, U, team.id, { player_id: P1 }), /ya está/);
  await assert.rejects(core.addTeamMember(db, V, team.id, { player_id: P3 }), /inexistente/, "otro entrenador no ve el equipo");
  const m = db.tables.team_players[0];
  await core.endTeamMember(db, U, m.id, { left_on: m.joined_on });
  assert.ok(db.tables.team_players[0].left_on);
  const again = await core.addTeamMember(db, U, team.id, { player_id: P1 });
  assert.ok(again.membership.id, "puede volver y queda el historial");
  assert.equal(db.tables.team_players.length, 2);
});

test("servidor: listado y perfil respetan accesos", async () => {
  const db = seed();
  const roster = await core.loadRoster(db, U);
  assert.deepEqual(roster.players.map((p) => p.display_name).sort(), ["Ana", "Beto"]);
  assert.equal(roster.players.find((p) => p.id === P1).active_goals, 1);
  assert.equal(roster.suggestions.length, 1, "solo jugadores editables");
  await assert.rejects(core.loadProfile(db, U, P3), /inexistente/);
  const prof = await core.loadProfile(db, U, P2);
  assert.equal(prof.members, null, "un lector no ve colaboradores");
  const own = await core.loadProfile(db, U, P1);
  assert.ok(Array.isArray(own.members));
});

test("servidor: aviso claro si falta la migración 012", async () => {
  const db = seed();
  db.dropTable("player_assessments");
  db.dropTable("teams");
  db.dropTable("team_players");
  const roster = await core.loadRoster(db, U);
  assert.equal(roster.schema.installed, false);
  await assert.rejects(core.createAssessment(db, U, P1, { batch_id: uid(), assessed_on: "2026-11-20", items: [{ criterion_key: "drib_control", value: 4 }] }), /012/);
});
