import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Board = require("../js/tactical-board.js");
const Academy = require("../js/academy.js");
const zona23 = require("../js/academy-content/zona-2-3.js");

test("el contenido de la zona 2-3 es válido y cita solo fuentes listadas", () => {
  assert.deepEqual(Academy.validateArticle(zona23), []);
});

test("el contenido cubre los 18 apartados pedidos", () => {
  const ids = zona23.tabs.aprender.map((s) => s.id);
  for (const id of ["introduccion", "definicion", "objetivos", "principios", "explicacion", "responsabilidades", "aplicacion", "ventajas", "limitaciones", "errores", "correcciones", "metodologia", "progresiones", "adaptaciones"]) {
    assert.ok(ids.includes(id), id);
  }
  assert.ok(zona23.exercises.length >= 3);
  assert.ok(zona23.tabs.evaluar.length >= 1);
  assert.ok(zona23.boards.length >= 5);
  assert.ok(zona23.sources.length >= 3);
});

test("cada pizarra educativa genera un documento animable válido", () => {
  for (const b of zona23.boards) {
    const doc = Academy.boardFromSpec(b.spec, Board);
    assert.ok(doc.phases.length >= 2, b.id);
    for (let pos = 0; pos <= doc.phases.length - 1; pos += 0.2) {
      const f = Board.sampleFrame(doc, pos);
      f.objects.forEach((o) => assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), `${b.id} @${pos}`));
    }
    doc.phases.forEach((ph) => {
      ph.objects.filter((o) => o.kind === "player").forEach((p) => {
        assert.ok(p.x >= 0 && p.x <= 14 && p.y >= 0 && p.y <= 15, `${b.id} ${p.id} fuera de media cancha`);
      });
    });
  }
});

test("los trazos de una fase definen la posición de la siguiente y el pase cambia el poseedor", () => {
  const doc = Academy.boardFromSpec({
    players: { a: { team: "offense", label: "1", x: 9, y: 7.5 }, b: { team: "offense", label: "2", x: 6, y: 2 } },
    phases: [{ ball: "a", strokes: [["pass", "a", "b"], ["move", "a", [8, 5]]] }, {}]
  }, Board);
  const p2 = doc.phases[1];
  assert.equal(p2.objects.find((o) => o.kind === "ball").holder, "b");
  const a = p2.objects.find((o) => o.id === "a");
  assert.deepEqual([a.x, a.y], [8, 5]);
});

test("el texto se escapa y las citas se enlazan", () => {
  const html = Academy.fmt("<b>x</b> **ok** [S2]");
  assert.ok(!html.includes("<b>"));
  assert.ok(html.includes("<strong>ok</strong>"));
  assert.ok(html.includes('data-cite="S2"'));
});

test("FIBA 2024: semicírculo de no carga de 1,30 m", () => {
  assert.equal(Board.FIBA.noChargeRadius, 1.3);
});

const Sim = require("../js/simulator.js");

test("el escenario del simulador de la zona 2-3 es coherente", () => {
  assert.deepEqual(Sim.validateScenario(zona23.simulator), []);
});

test("las situaciones espejadas intercambian defensores y textos", () => {
  const sc = zona23.simulator;
  const r = Sim.resolveState(sc, "base", "wingR").state;
  const l = Sim.resolveState(sc, "base", "wingL").state;
  assert.deepEqual(l.pos.x2, [r.pos.x1[0], 15 - r.pos.x1[1]]);
  assert.equal(l.ball, "o3");
  assert.match(l.title, /izquierda/);
  assert.equal(l.resp.x2, r.resp.x1);
});

test("las variantes heredan de la base y solo cambian sus situaciones", () => {
  const sc = zona23.simulator;
  const baseTop = Sim.resolveState(sc, "base", "top");
  const varTop = Sim.resolveState(sc, "esquinaBase", "top");
  assert.equal(varTop.state, baseTop.state);
  assert.equal(varTop.own, false);
  const varCorner = Sim.resolveState(sc, "esquinaBase", "cornerL").state;
  const baseCorner = Sim.resolveState(sc, "base", "cornerL").state;
  assert.notDeepEqual(varCorner.pos.x2, baseCorner.pos.x2);
});

test("la transición dibuja rotaciones, pase y la secuencia se puede animar y guardar", () => {
  const sc = zona23.simulator;
  const a = Sim.resolveState(sc, "base", "top").state;
  const b = Sim.resolveState(sc, "base", "wingR").state;
  const st = Sim.transitionStrokes(sc, a, b);
  assert.ok(st.some((s) => s.type === "pass" && s.from === "o1" && s.to === "o2"));
  assert.ok(st.some((s) => s.type === "rotation" && s.from === "x1"));
  const doc = Sim.sequenceDoc(sc, "base", sc.tour, Board);
  assert.equal(doc.phases.length, sc.tour.length);
  for (let pos = 0; pos <= doc.phases.length - 1; pos += 0.25) {
    Board.sampleFrame(doc, pos).objects.forEach((o) => assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y)));
  }
  assert.equal(Board.isBoardPlay({ board: doc }), true);
});
