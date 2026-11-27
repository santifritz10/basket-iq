import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, buildDashboard, deltaLabel, goalZones, periodRange } from "../lib/shooting/dashboard.js";
import { backoffMs, enqueue, isRetryable, mergeEntries, nextSeq, readQueue, removeConfirmed, writeQueue } from "../lib/shooting/offline-queue.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const sessions = [
  { id: "s1", fecha: "2026-11-20", status: "completed", recording_mode: "entries", player_ids: [A, B], provenance: "entries" },
  { id: "s2", fecha: "2026-11-10", status: "completed", recording_mode: "legacy_zones", player_ids: [A, B], provenance: "legacy_group", legacy_zones: { t3_front: { attempts: 50, made: 20 } } },
  { id: "s3", fecha: "2026-11-05", status: "completed", recording_mode: "legacy_zones", player_ids: [A], provenance: "legacy_single", legacy_zones: { mid_c: { attempts: 10, made: 5 } } },
  { id: "s4", fecha: "2026-11-21", status: "archived", recording_mode: "entries", player_ids: [A], provenance: "entries" },
  { id: "s5", fecha: "2026-06-01", status: "completed", recording_mode: "entries", player_ids: [A], provenance: "entries" }
];
const entries = [
  { session_id: "s1", player_id: A, zone_id: "t3_front", entry_type: "series", attempts: 10, made: 4, tags: ["catch"] },
  { session_id: "s1", player_id: B, zone_id: "t3_front", entry_type: "series", attempts: 10, made: 7, tags: [] },
  { session_id: "s1", player_id: A, zone_id: "ft", entry_type: "series", attempts: 10, made: 8, tags: [] },
  { session_id: "s1", player_id: A, zone_id: "rim", entry_type: "shot", attempts: 1, made: 1, tags: [], voided_at: "2026-11-20T10:00:00Z" },
  { session_id: "s4", player_id: A, zone_id: "paint", entry_type: "series", attempts: 30, made: 30, tags: [] },
  { session_id: "s5", player_id: A, zone_id: "paint", entry_type: "series", attempts: 20, made: 10, tags: [] }
];
const range90 = periodRange("90", "2026-11-27");

test("por jugador: no se le atribuye la sesión grupal histórica y se informa", () => {
  const r = aggregate({ sessions, entries, playerId: A, range: range90 });
  assert.equal(r.excluded.groupLegacy, 1);
  assert.equal(r.byZone.t3_front.attempts, 10, "solo sus propios registros");
  assert.equal(r.byZone.mid_c.attempts, 10, "histórico de un solo jugador sí cuenta");
  assert.equal(r.totals.ft.attempts, 10, "libres aparte");
  assert.equal(r.totals.fg.attempts, 20, "libres fuera del % de campo");
  assert.equal(r.byZone.rim.attempts, 0, "lo deshecho no cuenta");
});

test("equipo: el histórico grupal cuenta como total del grupo", () => {
  const r = aggregate({ sessions, entries, range: range90 });
  assert.equal(r.byZone.t3_front.attempts, 70);
  assert.equal(r.excluded.groupLegacy, 0);
});

test("archivadas y fuera de período no entran", () => {
  const r = aggregate({ sessions, entries, playerId: A, range: range90 });
  assert.equal(r.byZone.paint.attempts, 0);
  const all = aggregate({ sessions, entries, playerId: A, range: periodRange("all", "2026-11-27") });
  assert.equal(all.byZone.paint.attempts, 20);
});

test("filtros de características excluyen el histórico y lo informan", () => {
  const r = aggregate({ sessions, entries, playerId: A, range: range90, tags: ["catch"] });
  assert.equal(r.byZone.t3_front.attempts, 10);
  assert.equal(r.byZone.mid_c.attempts, 0);
  assert.equal(r.excluded.tagLegacy, 1);
});

test("fuente: solo registros nuevos o solo histórico", () => {
  assert.equal(aggregate({ sessions, entries, playerId: A, range: range90, source: "entries" }).byZone.mid_c.attempts, 0);
  assert.equal(aggregate({ sessions, entries, playerId: A, range: range90, source: "legacy" }).byZone.t3_front.attempts, 0);
});

test("panel: período anterior y evolución por fecha", () => {
  const d = buildDashboard({ sessions, entries, playerId: A, periodId: "30", today: "2026-11-27" });
  assert.equal(d.range.from, "2026-10-29");
  assert.deepEqual(d.timeline.map((p) => p.fecha), ["2026-11-05", "2026-11-20"]);
  assert.equal(d.previous.totals.fg.attempts, 0);
  assert.equal(d.legacyUsed, 1);
});

test("comparación solo con muestra suficiente", () => {
  assert.equal(deltaLabel({ attempts: 5, made: 2 }, { attempts: 50, made: 10 }, 20), "Muestra insuficiente para comparar");
  assert.match(deltaLabel({ attempts: 40, made: 20 }, { attempts: 40, made: 10 }, 20), /^\+25/);
});

test("objetivos de texto libre vinculados a zonas", () => {
  const g = goalZones([{ body: "Mejorar tiros libres" }, { body: "Triples desde la esquina" }, { body: "Liderazgo" }]);
  assert.ok(g.zones.includes("ft"));
  assert.ok(g.zones.includes("t3_corner_l"));
  assert.equal(g.matched.length, 2);
});

test("cola offline: sin duplicados, confirmación y orden", () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  let q = enqueue([], { client_entry_id: "x", seq: 0 });
  q = enqueue(q, { client_entry_id: "x", seq: 0 });
  q = enqueue(q, { client_entry_id: "y", seq: 1 });
  assert.equal(q.length, 2);
  writeQueue(storage, "s1", q);
  assert.equal(readQueue(storage, "s1").length, 2);
  q = removeConfirmed(q, ["x"]);
  writeQueue(storage, "s1", q);
  assert.deepEqual(readQueue(storage, "s1").map((e) => e.client_entry_id), ["y"]);
  writeQueue(storage, "s1", []);
  assert.equal(store.size, 0);
  const broken = { getItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(readQueue(broken, "s1"), []);
  const merged = mergeEntries([{ client_entry_id: "y", seq: 1 }], [{ client_entry_id: "y", seq: 1 }, { client_entry_id: "z", seq: 2 }]);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].pending, true);
  assert.equal(nextSeq(merged), 3);
  assert.equal(nextSeq([]), 0);
  assert.equal(backoffMs(0), 2000);
  assert.equal(backoffMs(10), 60000);
  assert.ok(isRetryable(0) && isRetryable(503) && !isRetryable(400) && !isRetryable(409));
});
