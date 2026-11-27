import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDb } from "./helpers/fake-supabase.mjs";
import {
  addEntries,
  createSession,
  deleteSession,
  duplicateSession,
  loadOverview,
  loadSession,
  schemaStatus,
  updateSession,
  voidEntry
} from "../lib/shooting/lab-core.js";
import { summarizeSession } from "../lib/shooting/model.js";

const COACH = "aaaaaaaa-0000-4000-8000-000000000001";
const OTHER = "bbbbbbbb-0000-4000-8000-000000000002";
const VIEWER = "cccccccc-0000-4000-8000-000000000003";
const P1 = "10000000-0000-4000-8000-000000000001";
const P2 = "10000000-0000-4000-8000-000000000002";
const P3 = "10000000-0000-4000-8000-000000000003";
const PX = "10000000-0000-4000-8000-000000000009"; // jugador de otro entrenador
let n = 0;
const cid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

function member(player_id, user_id, access_level) {
  return { id: `m-${player_id}-${user_id}`, player_id, user_id, access_level, status: "active" };
}

function seed() {
  return createFakeDb({
    players: [P1, P2, P3, PX].map((id, i) => ({ id, display_name: `Jugador ${i + 1}`, status: "active" })),
    player_members: [
      member(P1, COACH, "admin"),
      member(P2, COACH, "admin"),
      member(P3, COACH, "admin"),
      member(PX, OTHER, "admin"),
      member(P1, OTHER, "editor"),
      member(P1, VIEWER, "viewer")
    ],
    shooting_sessions: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        nombre: "Grupal vieja",
        fecha: "2026-10-01",
        zones: { t3_front: { attempts: 30, made: 12 } },
        status: "completed",
        recording_mode: "legacy_zones"
      }
    ],
    shooting_session_players: [
      { session_id: "20000000-0000-4000-8000-000000000001", player_id: P1 },
      { session_id: "20000000-0000-4000-8000-000000000001", player_id: P2 }
    ]
  });
}

test("flujo completo: sesión con 3 jugadores, tiros, series, colectivo y cierre", async () => {
  const db = seed();
  const activity = [];
  const onActivity = async (e) => activity.push(e);
  const { session } = await createSession(db, COACH, { nombre: "Martes", fecha: "2026-11-25", player_ids: [P1, P2, P3] }, { onActivity });
  assert.equal(session.status, "in_progress");
  assert.equal(session.recording_mode, "entries");
  assert.equal(session.player_ids.length, 3);

  await addEntries(db, COACH, session.id, [
    { entry_type: "shot", player_id: P1, zone_id: "t3_corner_l", made: true, seq: 1, client_entry_id: cid() },
    { entry_type: "shot", player_id: P1, zone_id: "t3_corner_l", made: false, seq: 2, client_entry_id: cid() },
    { entry_type: "shot", player_id: P2, zone_id: "rim", made: true, tags: ["left_hand"], seq: 3, client_entry_id: cid() },
    { entry_type: "series", player_id: P3, zone_id: "t3_corner_r", attempts: 10, made: 7, tags: ["catch"], client_entry_id: cid() },
    { entry_type: "series", scope: "collective", zone_id: "ft", attempts: 20, made: 14, client_entry_id: cid() }
  ]);

  const { entries } = await loadSession(db, COACH, session.id);
  const s = summarizeSession(entries, [P1, P2, P3]);
  assert.deepEqual(s.perPlayer[P1].fg, { attempts: 2, made: 1 });
  assert.deepEqual(s.perPlayer[P2].fg, { attempts: 1, made: 1 });
  assert.deepEqual(s.perPlayer[P3].fg, { attempts: 10, made: 7 });
  assert.deepEqual(s.group.fg, { attempts: 13, made: 9 });
  assert.deepEqual(s.group.ft, { attempts: 20, made: 14 });

  // resumen de compatibilidad para pantallas viejas
  const row = db.tables.shooting_sessions.find((x) => x.id === session.id);
  assert.deepEqual(row.zones.t3_corner_r, { attempts: 10, made: 7 });
  assert.deepEqual(row.zones.paint, { attempts: 1, made: 1 }, "cerca del aro suma en pintura");

  const done = await updateSession(db, COACH, session.id, { action: "finish" }, { onActivity });
  assert.equal(done.session.status, "completed");
  const completed = activity.filter((a) => a.eventType === "shooting_session.completed");
  assert.equal(completed.length, 3);
  assert.deepEqual(completed.find((a) => a.playerId === P3).metadata.fg, { attempts: 10, made: 7 }, "cada jugador ve SUS números");

  await assert.rejects(
    addEntries(db, COACH, session.id, [{ entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() }]),
    (e) => e.code === "session_closed"
  );
  await updateSession(db, COACH, session.id, { action: "resume" });
  await addEntries(db, COACH, session.id, [{ entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() }]);
});

test("reintentos con el mismo id no duplican", async () => {
  const db = seed();
  const { session } = await createSession(db, COACH, { player_ids: [P1] });
  const item = { entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() };
  await addEntries(db, COACH, session.id, [item]);
  await addEntries(db, COACH, session.id, [item]);
  const again = await addEntries(db, COACH, session.id, [item]);
  assert.equal(db.tables.shooting_entries.length, 1);
  assert.equal(again.entries.length, 1);
});

test("deshacer anula sin borrar y deja de contar", async () => {
  const db = seed();
  const { session } = await createSession(db, COACH, { player_ids: [P1] });
  const r = await addEntries(db, COACH, session.id, [{ entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() }]);
  await voidEntry(db, COACH, session.id, r.entries[0].id);
  assert.equal(db.tables.shooting_entries.length, 1, "el registro sigue en la base");
  assert.ok(db.tables.shooting_entries[0].voided_at);
  const row = db.tables.shooting_sessions.find((x) => x.id === session.id);
  assert.deepEqual(row.zones.paint, { attempts: 0, made: 0 });
});

test("permisos: un lector no registra ni crea sesiones", async () => {
  const db = seed();
  const { session } = await createSession(db, COACH, { player_ids: [P1] });
  await assert.rejects(createSession(db, VIEWER, { player_ids: [P1] }), (e) => e.status === 403);
  await assert.rejects(
    addEntries(db, VIEWER, session.id, [{ entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() }]),
    (e) => e.status === 400 && /permiso/.test(e.message)
  );
  // pero puede leerla
  const read = await loadSession(db, VIEWER, session.id);
  assert.equal(read.session.can_edit, false);
});

test("permisos: no se pueden sumar jugadores ajenos (ni al crear ni al editar)", async () => {
  const db = seed();
  await assert.rejects(createSession(db, COACH, { player_ids: [P1, PX] }), (e) => e.status === 403);
  const { session } = await createSession(db, COACH, { player_ids: [P1] });
  await assert.rejects(updateSession(db, COACH, session.id, { add_player_ids: [PX] }), (e) => e.status === 403);
  assert.equal(db.tables.shooting_session_players.filter((p) => p.session_id === session.id).length, 1);
});

test("permisos: no se registran tiros de un jugador que no participa", async () => {
  const db = seed();
  const { session } = await createSession(db, COACH, { player_ids: [P1, P2] });
  await assert.rejects(
    addEntries(db, COACH, session.id, [{ entry_type: "shot", player_id: P3, zone_id: "paint", made: true, client_entry_id: cid() }]),
    (e) => /no participa/.test(e.message)
  );
});

test("privacidad: un colaborador de un solo jugador ve solo sus registros y los colectivos", async () => {
  const db = seed();
  // OTHER es editor de P1 y admin de PX. Crea una sesión con P1 y PX.
  const { session } = await createSession(db, OTHER, { player_ids: [P1, PX] });
  await addEntries(db, OTHER, session.id, [
    { entry_type: "series", player_id: P1, zone_id: "paint", attempts: 5, made: 3, client_entry_id: cid() },
    { entry_type: "series", player_id: PX, zone_id: "paint", attempts: 9, made: 9, client_entry_id: cid() }
  ]);
  const seen = await loadSession(db, COACH, session.id);
  assert.deepEqual(seen.session.player_ids, [P1]);
  assert.equal(seen.session.hidden_participants, 1);
  assert.equal(seen.entries.length, 1);
  assert.equal(seen.entries[0].player_id, P1);
  assert.equal(seen.session.legacy_zones, null, "no se expone el resumen con datos del jugador ajeno");
  assert.equal(seen.session.can_edit, false, "no puede editar una sesión con un jugador ajeno");

  // y alguien sin acceso a ningún participante no la ve
  await assert.rejects(loadSession(db, VIEWER, session.id).then(() => loadSession(db, "dddddddd-0000-4000-8000-000000000004", session.id)), (e) => e.status === 404);
  const overview = await loadOverview(db, COACH);
  assert.ok(overview.entries.every((e) => e.player_id !== PX));
});

test("colectivos: requieren permiso sobre todos los participantes", async () => {
  const db = seed();
  const { session } = await createSession(db, OTHER, { player_ids: [P1, PX] });
  // COACH no tiene acceso a PX: no puede cargar colectivos
  await assert.rejects(
    addEntries(db, COACH, session.id, [{ entry_type: "series", scope: "collective", zone_id: "ft", attempts: 4, made: 2, client_entry_id: cid() }]),
    (e) => e.status === 400
  );
});

test("eliminar exige admin de todos y el nombre exacto; archivar no borra", async () => {
  const db = seed();
  const { session } = await createSession(db, COACH, { nombre: "Jueves", player_ids: [P1] });
  await addEntries(db, COACH, session.id, [{ entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() }]);
  await assert.rejects(deleteSession(db, OTHER, session.id, { confirm_name: "Jueves" }), (e) => e.status === 403);
  await assert.rejects(deleteSession(db, COACH, session.id, { confirm_name: "jueves " }), (e) => e.code === "confirmation_required");
  const archived = await updateSession(db, COACH, session.id, { action: "archive" });
  assert.equal(archived.session.status, "archived");
  assert.equal(db.tables.shooting_entries.length, 1);
  await updateSession(db, COACH, session.id, { action: "unarchive" });
  await deleteSession(db, COACH, session.id, { confirm_name: "Jueves" });
  assert.equal(db.tables.shooting_entries.length, 0);
  assert.equal(db.tables.shooting_sessions.filter((s) => s.id === session.id).length, 0);
});

test("histórico: no admite registros, reanudar ni cambiar participantes", async () => {
  const db = seed();
  const legacyId = "20000000-0000-4000-8000-000000000001";
  await assert.rejects(
    addEntries(db, COACH, legacyId, [{ entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() }]),
    (e) => e.code === "legacy_readonly"
  );
  await assert.rejects(updateSession(db, COACH, legacyId, { action: "resume" }), (e) => e.status === 409);
  await assert.rejects(updateSession(db, COACH, legacyId, { add_player_ids: [P3] }), (e) => e.code === "legacy_readonly");
  const { session } = await loadSession(db, COACH, legacyId);
  assert.equal(session.provenance, "legacy_group");
  assert.deepEqual(session.legacy_zones, { t3_front: { attempts: 30, made: 12 } });
  // archivar sí (no cambia datos)
  const a = await updateSession(db, COACH, legacyId, { action: "archive" });
  assert.equal(a.session.status, "archived");
});

test("duplicar copia jugadores y nombre, nunca registros", async () => {
  const db = seed();
  const { session } = await createSession(db, COACH, { nombre: "Base", player_ids: [P1, P2] });
  await addEntries(db, COACH, session.id, [{ entry_type: "shot", player_id: P1, zone_id: "paint", made: true, client_entry_id: cid() }]);
  const copy = await duplicateSession(db, COACH, session.id);
  assert.equal(copy.session.nombre, "Base (copia)");
  assert.equal(copy.session.status, "draft");
  assert.equal(copy.entries.length, 0);
  assert.deepEqual([...copy.session.player_ids].sort(), [P1, P2].sort());
});

test("no se puede quitar un jugador con registros", async () => {
  const db = seed();
  const { session } = await createSession(db, COACH, { player_ids: [P1, P2] });
  await addEntries(db, COACH, session.id, [{ entry_type: "shot", player_id: P2, zone_id: "paint", made: true, client_entry_id: cid() }]);
  await assert.rejects(updateSession(db, COACH, session.id, { remove_player_ids: [P2] }), (e) => e.code === "player_has_entries");
  const ok = await updateSession(db, COACH, session.id, { remove_player_ids: [P1] });
  assert.deepEqual(ok.session.player_ids, [P2]);
});

test("aviso claro si falta la migración 011", async () => {
  const db = seed();
  db.dropTable("shooting_entries");
  assert.deepEqual(await schemaStatus(db), { installed: false });
  await assert.rejects(loadOverview(db, COACH).then(() => createSession(db, COACH, { player_ids: [P1] })), (e) => e.code === "shooting_lab_not_installed" && e.status === 503);
});
