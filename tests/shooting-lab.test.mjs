import { test } from "node:test";
import assert from "node:assert/strict";
import {
  colorBand,
  compareZoneMaps,
  legacyZonesToMap,
  longestMadeStreak,
  pct,
  sessionProvenance,
  suggestShootingPlan,
  summarizeEntries,
  summarizeSession,
  timelineByDate,
  toggleTag,
  validateEntryInput,
  zonesCacheFromEntries
} from "../lib/shooting/model.js";
import { CORNER_Y, ZONE_POLYGONS, classifyPoint, isBeyondArc } from "../lib/shooting/court.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
let n = 0;
const cid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

function shot(player, zone, made, seq) {
  return { entry_type: "shot", scope: "player", player_id: player, zone_id: zone, attempts: 1, made: made ? 1 : 0, seq, tags: [] };
}
function series(player, zone, made, attempts, tags = []) {
  return { entry_type: "series", scope: player ? "player" : "collective", player_id: player, zone_id: zone, attempts, made, tags };
}

test("serie válida: 7 de 10 desde triple de esquina", () => {
  const r = validateEntryInput({ entry_type: "series", player_id: A, zone_id: "t3_corner_l", attempts: "10", made: "7", tags: ["catch"], client_entry_id: cid() });
  assert.equal(r.ok, true, r.errors.join());
  assert.equal(r.value.attempts, 10);
  assert.equal(r.value.made, 7);
  assert.equal(r.value.seq, null, "las series no tienen orden");
});

test("serie inválida: conversiones > intentos, negativos, decimales", () => {
  const base = { entry_type: "series", player_id: A, zone_id: "paint", client_entry_id: cid() };
  assert.equal(validateEntryInput({ ...base, attempts: 5, made: 6 }).ok, false);
  assert.equal(validateEntryInput({ ...base, attempts: -1, made: 0 }).ok, false);
  assert.equal(validateEntryInput({ ...base, attempts: 4.5, made: 2 }).ok, false);
  assert.equal(validateEntryInput({ ...base, attempts: "abc", made: 2 }).ok, false);
  assert.equal(validateEntryInput({ ...base, attempts: 0, made: 0 }).ok, false);
});

test("características incompatibles y mano fuera de la zona de finalización", () => {
  const base = { entry_type: "shot", made: true, player_id: A, client_entry_id: cid() };
  assert.equal(validateEntryInput({ ...base, zone_id: "paint", tags: ["contested", "uncontested"] }).ok, false);
  assert.equal(validateEntryInput({ ...base, zone_id: "paint", tags: ["catch", "off_dribble"] }).ok, false);
  assert.equal(validateEntryInput({ ...base, zone_id: "t3_front", tags: ["left_hand"] }).ok, false);
  assert.equal(validateEntryInput({ ...base, zone_id: "rim", tags: ["left_hand", "contested", "moving"] }).ok, true);
  assert.deepEqual(toggleTag(["contested", "moving"], "uncontested"), ["moving", "uncontested"]);
});

test("registro sin jugador ni id de cliente se rechaza", () => {
  assert.equal(validateEntryInput({ entry_type: "shot", zone_id: "paint", made: true, client_entry_id: cid() }).ok, false);
  assert.equal(validateEntryInput({ entry_type: "shot", zone_id: "paint", made: true, player_id: A }).ok, false);
  assert.equal(validateEntryInput({ entry_type: "series", scope: "collective", zone_id: "ft", attempts: 10, made: 8, client_entry_id: cid() }).ok, true);
});

test("sesión de tres jugadores: individual, colectivo y grupal", () => {
  const entries = [
    shot(A, "t3_front", true, 1),
    shot(A, "t3_front", false, 2),
    series(A, "t3_corner_l", 7, 10),
    shot(B, "paint", true, 3),
    series(C, "mid_c", 3, 8),
    series(C, "ft", 8, 10),
    series(null, "ft", 15, 20),
    { ...shot(B, "paint", true, 4), voided_at: "2026-11-27T10:00:00Z" }
  ];
  const s = summarizeSession(entries, [A, B, C]);
  assert.deepEqual(s.perPlayer[A].fg, { attempts: 12, made: 8 });
  assert.deepEqual(s.perPlayer[B].fg, { attempts: 1, made: 1 }, "el registro anulado no cuenta");
  assert.deepEqual(s.perPlayer[C].fg, { attempts: 8, made: 3 });
  assert.deepEqual(s.perPlayer[C].ft, { attempts: 10, made: 8 }, "libres aparte");
  assert.deepEqual(s.collective.ft, { attempts: 20, made: 15 });
  assert.deepEqual(s.group.fg, { attempts: 21, made: 12 });
  assert.deepEqual(s.group.ft, { attempts: 30, made: 23 });
  assert.deepEqual(s.perPlayer[A].three, { attempts: 12, made: 8 });
});

test("porcentaje acumulado = aciertos totales / intentos totales", () => {
  const entries = [series(A, "paint", 1, 1), series(A, "paint", 0, 9)];
  const { byZone } = summarizeEntries(entries, { playerId: A });
  assert.equal(pct(byZone.paint.made, byZone.paint.attempts), 10);
});

test("sin datos ≠ 0%", () => {
  assert.equal(pct(0, 0), null);
  assert.equal(colorBand(0, 0), "none");
  assert.equal(colorBand(0, 5), "low");
  assert.equal(colorBand(5, 10, { low: 50, high: 70 }), "mid");
});

test("rachas solo con lanzamientos ordenados; nunca con series", () => {
  assert.equal(longestMadeStreak([series(A, "paint", 10, 10)], A), null);
  const e = [shot(A, "paint", true, 1), shot(A, "paint", true, 2), shot(A, "paint", false, 3), shot(A, "paint", true, 4)];
  assert.equal(longestMadeStreak(e, A), 2);
});

test("filtro por característica", () => {
  const e = [series(A, "t3_front", 4, 10, ["catch"]), series(A, "t3_front", 1, 10, ["off_dribble"])];
  assert.deepEqual(summarizeEntries(e, { tags: ["catch"] }).fg, { attempts: 10, made: 4 });
});

test("histórico: no se inventa reparto del triple frontal", () => {
  const map = legacyZonesToMap({ t3_front: { attempts: 50, made: 20 } });
  assert.deepEqual(map.t3_front, { attempts: 50, made: 20 });
  assert.deepEqual(map.t3_left45, { attempts: 0, made: 0 });
  assert.deepEqual(map.t3_right45, { attempts: 0, made: 0 });
});

test("procedencia de las sesiones", () => {
  assert.equal(sessionProvenance({ recording_mode: "entries", player_ids: [A, B] }), "entries");
  assert.equal(sessionProvenance({ recording_mode: "legacy_zones", player_ids: [A] }), "legacy_single");
  assert.equal(sessionProvenance({ player_ids: [A, B] }), "legacy_group");
  assert.equal(sessionProvenance({ player_ids: [] }), "legacy_empty");
});

test("resumen de compatibilidad: cerca del aro suma a pintura, libres fuera", () => {
  const cache = zonesCacheFromEntries([series(A, "rim", 4, 5), series(A, "paint", 1, 2), series(A, "ft", 5, 5)]);
  assert.deepEqual(cache.paint, { attempts: 7, made: 5 });
  assert.equal(cache.ft, undefined);
});

test("plan sugerido: muestra insuficiente nunca es «débil»", () => {
  const map = legacyZonesToMap({ t3_front: { attempts: 5, made: 0 }, paint: { attempts: 40, made: 10 }, mid_c: { attempts: 40, made: 30 } });
  const plan = suggestShootingPlan(map, { totalShots: 100, minSample: 20 });
  const by = Object.fromEntries(plan.items.map((i) => [i.zone.id, i]));
  assert.equal(by.t3_front.reason, "small_sample");
  assert.equal(by.paint.reason, "below");
  assert.equal(by.mid_c.reason, "above");
  assert.ok(by.paint.shots > by.mid_c.shots);
  assert.equal(plan.totalShots, 100);
});

test("plan sugerido: prioriza zonas de objetivos", () => {
  const map = legacyZonesToMap({});
  const plan = suggestShootingPlan(map, { totalShots: 60, goalZones: ["t3_corner_l"] });
  const corner = plan.items.find((i) => i.zone.id === "t3_corner_l");
  const other = plan.items.find((i) => i.zone.id === "t3_corner_r");
  assert.ok(corner.shots > other.shots);
  assert.ok(plan.notes.length > 0);
});

test("evolución por fecha y comparación entre períodos", () => {
  const t = timelineByDate([{ fecha: "2026-11-02", attempts: 10, made: 5 }, { fecha: "2026-11-01", attempts: 4, made: 1 }, { fecha: "2026-11-02", attempts: 10, made: 5 }]);
  assert.deepEqual(t.map((p) => [p.fecha, p.attempts, p.made]), [["2026-11-01", 4, 1], ["2026-11-02", 20, 10]]);
  const a = legacyZonesToMap({ paint: { attempts: 20, made: 8 } });
  const b = legacyZonesToMap({ paint: { attempts: 25, made: 15 }, mid_c: { attempts: 3, made: 3 } });
  const cmp = Object.fromEntries(compareZoneMaps(a, b, 20).map((r) => [r.zone.id, r]));
  assert.equal(Math.round(cmp.paint.deltaPct), 20);
  assert.equal(cmp.mid_c.deltaPct, null, "sin muestra no se compara");
});

test("cancha FIBA: clasificación de coordenadas", () => {
  assert.equal(classifyPoint(7.5, 1.9), "rim");
  assert.equal(classifyPoint(7.5, 4.5), "paint");
  assert.equal(classifyPoint(7.5, 7), "mid_c");
  assert.equal(classifyPoint(3, 2), "mid_l");
  assert.equal(classifyPoint(12, 2), "mid_r");
  assert.equal(classifyPoint(0.4, 1), "t3_corner_l");
  assert.equal(classifyPoint(14.6, 1), "t3_corner_r");
  assert.equal(classifyPoint(7.5, 9), "t3_front");
  assert.equal(classifyPoint(1.5, 6), "t3_left45");
  assert.equal(classifyPoint(13.5, 6), "t3_right45");
  assert.equal(classifyPoint(-1, 3), null);
  assert.ok(Math.abs(CORNER_Y - 2.99) < 0.01);
  // el triple frontal empieza en 6,75 m
  assert.equal(isBeyondArc(7.5, 1.575 + 6.7), false);
  assert.equal(isBeyondArc(7.5, 1.575 + 6.8), true);
});

test("cancha FIBA: los polígonos y la clasificación coinciden", () => {
  const inside = (x, y, poly) => {
    let r = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
    }
    return r;
  };
  let checked = 0;
  for (let x = 0.1; x < 15; x += 0.37) {
    for (let y = 0.1; y < 13.9; y += 0.41) {
      const z = classifyPoint(x, y);
      if (z === "rim") continue;
      const owners = Object.keys(ZONE_POLYGONS).filter((k) => inside(x, y, ZONE_POLYGONS[k]));
      // En los bordes curvos pueden quedar puntos en el límite; solo se exige coincidencia cuando hay un dueño.
      if (owners.length === 1) {
        assert.equal(owners[0], z, `(${x.toFixed(2)}, ${y.toFixed(2)})`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 1000);
});
