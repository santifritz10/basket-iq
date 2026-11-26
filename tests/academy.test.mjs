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
