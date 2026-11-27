import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import { buildDigest, digestToText, scrubName, validatePeriod, reportSections } from "../lib/player-dev/insights.js";
import * as rcore from "../lib/player-dev/reports-core.js";

const U = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const V = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const W = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const S1 = "44444444-4444-4444-8444-444444444444";
const S2 = "55555555-5555-4555-8555-555555555555";
const NOW = new Date("2026-11-27T12:00:00Z");

function seed(extra = {}) {
  return createFakeDb({
    players: [
      { id: P1, display_name: "Ana Pérez", status: "active", age: 15, position: "Base", category: "U15", birth_date: "2011-03-03", team: "Club Norte" },
      { id: P2, display_name: "Beto", status: "active" }
    ],
    player_members: [
      { player_id: P1, user_id: U, access_level: "admin", status: "active" },
      { player_id: P1, user_id: V, access_level: "editor", status: "active" },
      { player_id: P1, user_id: W, access_level: "viewer", status: "active" },
      { player_id: P2, user_id: V, access_level: "admin", status: "active" }
    ],
    player_goals: [], player_goal_checkins: [], player_assessments: [], player_stat_records: [
      { id: "m1", player_id: P1, record_type: "match", played_on: "2026-11-20", points: 10, fg2_made: 3, fg2_att: 10, fg3_made: 2, fg3_att: 12 }
    ],
    assessment_criteria: [], teams: [], team_players: [],
    player_notes: [
      { id: "n1", player_id: P1, body: "Ana Pérez muy concentrada", visibility: "collaborators", note_type: "general", created_at: "2026-11-20T10:00:00Z", created_by_user_id: V },
      { id: "n2", player_id: P1, body: "Privada de U", visibility: "private", created_at: "2026-11-21T10:00:00Z", created_by_user_id: U }
    ],
    player_evolution_events: [], activity_events: [],
    shooting_sessions: [
      { id: S1, fecha: "2026-11-10", status: "completed", recording_mode: "entries", nombre: "Individual" },
      { id: S2, fecha: "2026-11-12", status: "completed", recording_mode: "legacy_zones", nombre: "Grupal", zones: { t3_front: { attempts: 50, made: 40 } } }
    ],
    shooting_session_players: [{ session_id: S1, player_id: P1 }, { session_id: S2, player_id: P1 }, { session_id: S2, player_id: P2 }],
    shooting_entries: [{ id: "e1", session_id: S1, player_id: P1, zone_id: "paint", attempts: 30, made: 15, voided_at: null }],
    player_plan_items: [], player_attendance: [],
    player_reports: [],
    ...extra
  });
}

const profileOf = async (db, uid = U) => (await import("../lib/player-dev/core.js")).loadProfile(db, uid, P1);

test("resumen: sin nombre, sin notas privadas, sesiones grupales no atribuidas", async () => {
  const db = seed();
  const profile = await profileOf(db);
  const d = buildDigest(profile, { from: "2026-08-30", to: "2026-11-27", today: "2026-11-27", includeNotes: true, viewerId: U });
  const text = digestToText(d);
  assert.ok(!/Ana|Pérez|Norte|2011/.test(text), "no debe incluir nombre, equipo ni nacimiento");
  assert.match(text, /el jugador muy concentrada/);
  assert.ok(!text.includes("Privada"), "las notas privadas no se envían");
  // Solo la sesión individual cuenta (la grupal histórica no se atribuye).
  assert.equal(d.shooting.attempts, 30);
  assert.equal(d.shooting.fg.made, 15);
  assert.equal(d.stats.matches, 1);
  // Sin notas cuando no se piden.
  const d2 = buildDigest(profile, { from: "2026-08-30", to: "2026-11-27", today: "2026-11-27", viewerId: U });
  assert.equal(d2.notes, null);
  assert.ok(!digestToText(d2).includes("concentrada"));
  assert.ok(d.gaps.some((g) => /evaluaciones/.test(g)));
});

test("resumen: separa volumen de efectividad solo con muestra suficiente", () => {
  const sessions = [];
  const entries = [];
  ["2026-09-05", "2026-09-20", "2026-10-25", "2026-11-10", "2026-11-20"].forEach((f, i) => {
    sessions.push({ id: `s${i}`, fecha: f, status: "completed", recording_mode: "entries" });
    entries.push({ session_id: `s${i}`, zone_id: "paint", attempts: i < 2 ? 25 : 30, made: i < 2 ? 10 : 12 });
  });
  const d = buildDigest({ player: {}, sessions, entries }, { from: "2026-08-30", to: "2026-11-27", today: "2026-11-27" });
  const s = d.signals.find((x) => x.id === "volume_vs_pct");
  assert.match(s.text, /Subió el volumen pero la efectividad se mantiene estable/);
  const small = buildDigest({ player: {}, sessions: sessions.slice(0, 1), entries: entries.slice(0, 1) }, { from: "2026-08-30", to: "2026-11-27", today: "2026-11-27" });
  assert.ok(small.signals.find((x) => x.id === "volume_vs_pct").insufficient);
});

test("utilidades: período y nombre", () => {
  assert.equal(validatePeriod("2026-11-01", "2026-11-27", "2026-11-27"), null);
  assert.ok(validatePeriod("2026-11-28", "2026-11-27", "2026-11-27"));
  assert.ok(validatePeriod("2026-11-01", "2026-12-01", "2026-11-27"));
  assert.equal(scrubName("ANA hizo 3 de 5, ana pérez bien", { display_name: "Ana Pérez" }), "el jugador hizo 3 de 5, el jugador bien");
});

test("informes: nacen en borrador, solo el autor los ve hasta compartirlos", async () => {
  const db = seed();
  const { report } = await rcore.createReport(db, V, P1, { report_type: "monthly" }, { now: NOW });
  assert.equal(report.status, "draft");
  assert.equal(report.period_from, "2026-10-29");
  assert.equal(report.period_to, "2026-11-27");
  assert.ok(report.texts.summary.includes("Período"));
  assert.ok(!report.sections.includes("notes"), "las observaciones no se incluyen salvo pedido");
  assert.equal((await rcore.listReports(db, U, P1)).reports.length, 0);
  await assert.rejects(rcore.getReport(db, U, report.id), /inexistente/);
  await assert.rejects(rcore.updateReport(db, U, report.id, { title: "x" }), /inexistente/);
  // Viewer no crea.
  await assert.rejects(rcore.createReport(db, W, P1, { report_type: "monthly" }, { now: NOW }), /permiso/);
  // El autor edita y comparte.
  const ed = await rcore.updateReport(db, V, report.id, { texts: { recommendations: "Trabajar mano débil", hack: "x" }, ai_assisted: true }, { now: NOW });
  assert.equal(ed.report.texts.recommendations, "Trabajar mano débil");
  assert.equal(ed.report.texts.hack, undefined);
  assert.ok(ed.report.ai_assisted);
  const events = [];
  const sh = await rcore.updateReport(db, V, report.id, { status: "shared" }, { now: NOW, onActivity: async (e) => events.push(e) });
  assert.equal(sh.report.status, "shared");
  assert.equal(events[0].eventType, "report.shared");
  assert.equal((await rcore.listReports(db, W, P1)).reports.length, 1);
  // Compartido: no se edita, no vuelve a borrador; se archiva.
  await assert.rejects(rcore.updateReport(db, V, report.id, { title: "otro" }), /no se edita/);
  await assert.rejects(rcore.updateReport(db, V, report.id, { status: "draft" }), /no está permitido/);
  const ar = await rcore.updateReport(db, U, report.id, { status: "archived" }, { now: NOW });
  assert.equal(ar.report.status, "archived");
});

test("informes: los existentes (sin estado) siguen visibles; jugador ajeno no", async () => {
  const db = seed({ player_reports: [{ id: "99999999-9999-4999-8999-999999999999", player_id: P1, title: "Viejo", body: "texto", created_by_user_id: U, metadata: {} }] });
  const list = await rcore.listReports(db, W, P1);
  assert.equal(list.reports[0].status, "shared");
  assert.ok(list.reports[0].legacy);
  await assert.rejects(rcore.listReports(db, U, P2), /inexistente/);
  await assert.rejects(rcore.createReport(db, V, P1, { report_type: "monthly", period_from: "2026-11-01", period_to: "2027-01-01" }, { now: NOW }), /futuro/);
});

test("Asistente: envía el resumen anonimizado, respeta el límite y no inventa respuesta", async () => {
  const db = seed();
  const calls = [];
  const generate = async (req) => {
    calls.push(req);
    return { text: "### Datos observados\n15/30 en pintura.", model: "m", truncated: false };
  };
  const opts = { now: NOW, generate, rateLimit: () => ({ allowed: true }), buildInstruction: (s) => s.map((x) => `${x.title}:\n${x.content}`).join("\n\n") };
  const r = await rcore.askAboutPlayer(db, W, P1, { preset: "volume", days: 90 }, opts);
  assert.match(r.answer, /15\/30/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].messages[0].text, "¿Está mejorando realmente su efectividad o solamente aumentó el volumen?");
  assert.ok(!/Ana|Pérez/.test(calls[0].systemInstruction));
  assert.match(calls[0].systemInstruction, /Información insuficiente/);
  await assert.rejects(rcore.askAboutPlayer(db, U, P2, { question: "hola" }, opts), /inexistente/);
  await assert.rejects(rcore.askAboutPlayer(db, W, P1, { question: "" }, opts), /Escribí/);
  await assert.rejects(rcore.askAboutPlayer(db, W, P1, { question: "hola" }, { ...opts, rateLimit: () => ({ allowed: false, scope: "minute" }) }), /muchas consultas/);
  assert.equal(calls.length, 1, "si no hay permiso o cupo, no se llama a Gemini");
  const err = { httpStatus: 503, code: "unavailable", message: "Gemini ocupado" };
  await assert.rejects(rcore.askAboutPlayer(db, W, P1, { question: "hola" }, { ...opts, generate: async () => { throw err; } }), (e) => e.status === 502 && /ocupado/.test(e.message));
});

test("informe: textos iniciales salen solo de datos registrados", async () => {
  const db = seed();
  const profile = await profileOf(db);
  const d = buildDigest(profile, { from: "2026-10-29", to: "2026-11-27", today: "2026-11-27", viewerId: U });
  const t = reportSections(d);
  assert.match(t.training, /15\/30/);
  assert.match(t.stats, /5\/22/);
  assert.match(t.goals, /Sin objetivos/);
});
