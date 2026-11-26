import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Board = require("../js/tactical-board.js");

function near(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

test("las medidas de la cancha siguen el reglamento FIBA", () => {
  const F = Board.FIBA;
  assert.equal(F.length, 28);
  assert.equal(F.width, 15);
  assert.equal(F.threeRadius, 6.75);
  assert.equal(F.laneHalfWidth * 2, 4.9);
  assert.equal(F.laneLength, 5.8);
  assert.equal(F.basketX, 1.575);
  // Las rectas del triple (a 0,90 m de la banda) cortan el arco a ~2,99 m de la línea de fondo
  const dy = F.width / 2 - F.threeSideDist;
  const xMeet = F.basketX + Math.sqrt(F.threeRadius ** 2 - dy ** 2);
  assert.ok(near(xMeet, 2.99, 0.01));
});

test("la vista convierte metros a píxeles y vuelve sin error en las cuatro orientaciones", () => {
  for (const rotation of [0, 90, 180, 270]) {
    for (const court of ["half", "full"]) {
      const vp = Board.computeViewport({ court, rotation }, 800, 600, 6);
      const p = { x: 3.2, y: 11.4 };
      const s = Board.toScreen(vp, p);
      const back = Board.toWorld(vp, s);
      assert.ok(near(back.x, p.x) && near(back.y, p.y), `${court} ${rotation}`);
      // La cancha entra completa en el lienzo
      const corners = [
        { x: 0, y: 0 },
        { x: court === "full" ? 28 : 14, y: 15 }
      ].map((c) => Board.toScreen(vp, c));
      corners.forEach((c) => {
        assert.ok(c.x >= 0 && c.x <= 800 && c.y >= 0 && c.y <= 600, `${court} ${rotation} fuera de lienzo`);
      });
    }
  }
});

test("con rotación de 90° el aro de media cancha queda arriba", () => {
  const vp = Board.computeViewport({ court: "half", rotation: 90 }, 600, 600, 6);
  const rim = Board.toScreen(vp, { x: Board.FIBA.basketX, y: 7.5 });
  const center = Board.toScreen(vp, { x: 14, y: 7.5 });
  assert.ok(rim.y < center.y);
});

test("normalizeDoc tolera datos rotos sin lanzar", () => {
  const doc = Board.normalizeDoc({
    phases: [
      { objects: [{ kind: "player", x: "3", y: 4 }, { kind: "desconocido" }, null], strokes: [{ type: "nope" }, { type: "pass", a: { x: 1, y: 1 }, b: { x: 2, y: 2 } }] }
    ]
  });
  assert.equal(doc.version, 2);
  assert.equal(doc.phases.length, 1);
  assert.equal(doc.phases[0].objects.length, 1);
  assert.equal(doc.phases[0].objects[0].x, 3);
  assert.equal(doc.phases[0].strokes.length, 1);
  assert.deepEqual(Board.normalizeDoc(null).phases.length, 1);
});

test("isBoardPlay distingue jugadas nuevas de las guardadas como imagen", () => {
  assert.equal(Board.isBoardPlay({ id: 1, name: "Vieja", steps: ["data:image/png;base64,AAA"] }), false);
  assert.equal(Board.isBoardPlay({ id: 2, board: Board.createEmptyDoc() }), true);
});

test("fitStroke deja recto un trazo casi recto y curva uno curvo", () => {
  const straight = Board.fitStroke("move", [{ x: 0, y: 0 }, { x: 2, y: 0.05 }, { x: 4, y: 0 }]);
  assert.equal(straight.c, null);
  const curved = Board.fitStroke("move", [{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 4, y: 0 }]);
  assert.ok(curved.c);
  // La curva pasa por el punto medio dibujado
  const mid = Board.strokeSamples({ type: "move", a: curved.a, b: curved.b, c: curved.c }, 2)[1];
  assert.ok(near(mid.x, 2, 0.01) && near(mid.y, 2, 0.01));
});

function basicPhase() {
  const p1 = { id: "p1", kind: "player", team: "offense", label: "1", name: "", color: "#000", x: 9, y: 7.5 };
  const p2 = { id: "p2", kind: "player", team: "offense", label: "2", name: "", color: "#000", x: 6.7, y: 2 };
  const ball = { id: "b", kind: "ball", x: 9, y: 7.5, holder: "p1" };
  return { id: "f1", name: "Fase 1", note: "", objects: [p1, p2, ball], strokes: [] };
}

test("la fase siguiente aplica desplazamientos y pases conservando la identidad", () => {
  const ph = basicPhase();
  ph.strokes = [
    { id: "s1", type: "cut", a: { x: 6.7, y: 2 }, b: { x: 3, y: 4 }, c: null, from: "p2", to: null },
    { id: "s2", type: "pass", a: { x: 9, y: 7.5 }, b: { x: 3.2, y: 4.1 }, c: null, from: "p1", to: null }
  ];
  const next = Board.deriveNextPhase(ph, 0);
  assert.equal(next.name, "Fase 2");
  assert.equal(next.strokes.length, 0);
  const p2 = next.objects.find((o) => o.id === "p2");
  assert.deepEqual([p2.x, p2.y], [3, 4]);
  const ball = next.objects.find((o) => o.id === "b");
  assert.equal(ball.holder, "p2", "el balón pasa al receptor más cercano al final del pase");
  // La fase original no se modifica
  assert.equal(ph.objects.find((o) => o.id === "p2").x, 6.7);
});

test("el dribbling mueve al jugador y el balón lo acompaña", () => {
  const ph = basicPhase();
  ph.strokes = [{ id: "d", type: "dribble", a: { x: 9, y: 7.5 }, b: { x: 5, y: 10 }, c: null, from: "p1", to: null }];
  const next = Board.deriveNextPhase(ph, 0);
  const p1 = next.objects.find((o) => o.id === "p1");
  assert.deepEqual([p1.x, p1.y], [5, 10]);
  assert.equal(next.objects.find((o) => o.id === "b").holder, "p1");
});

test("la animación sigue el trazo dibujado y el balón viaja en el pase", () => {
  const ph = basicPhase();
  ph.strokes = [
    { id: "m", type: "move", a: { x: 6.7, y: 2 }, b: { x: 3, y: 2 }, c: { x: 4.85, y: -1 }, from: "p2", to: null },
    { id: "s2", type: "pass", a: { x: 9, y: 7.5 }, b: { x: 3, y: 2 }, c: null, from: "p1", to: "p2" }
  ];
  const doc = { version: 2, view: { court: "half", rotation: 90 }, phases: [ph, Board.deriveNextPhase(ph, 0)] };

  const start = Board.sampleFrame(doc, 0);
  assert.equal(start.objects.find((o) => o.id === "p2").x, 6.7);

  const mid = Board.sampleFrame(doc, 0.5);
  const p2mid = mid.objects.find((o) => o.id === "p2");
  assert.ok(p2mid.y < 1.5, "a mitad de camino el jugador está sobre la curva, no sobre la recta");

  const end = Board.sampleFrame(doc, 1);
  const p2end = end.objects.find((o) => o.id === "p2");
  assert.deepEqual([p2end.x, p2end.y], [3, 2]);
  const ballEnd = end.objects.find((o) => o.id === "b");
  assert.equal(ballEnd.holder, "p2");

  const late = Board.sampleFrame(doc, 0.8);
  const ballLate = late.objects.find((o) => o.id === "b");
  assert.equal(ballLate.attach, 0, "durante el pase el balón vuela suelto");
});

test("todas las plantillas generan documentos válidos", () => {
  for (const t of Board.TEMPLATES) {
    const doc = Board.buildTemplate(t.id);
    assert.ok(doc && doc.phases.length >= 1, t.id);
    for (let pos = 0; pos <= doc.phases.length - 1; pos += 0.25) {
      const frame = Board.sampleFrame(doc, pos);
      frame.objects.forEach((o) => {
        assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), `${t.id} @${pos}`);
      });
    }
  }
  const pnr = Board.buildTemplate("pick_and_roll");
  assert.equal(pnr.phases.length, 4);
  const lastBall = pnr.phases[2].objects.find((o) => o.kind === "ball");
  const screener = pnr.phases[2].objects.find((o) => o.kind === "player" && o.label === "5");
  assert.equal(pnr.phases[3].objects.find((o) => o.kind === "ball").holder, screener.id);
  assert.notEqual(lastBall.holder, screener.id);
});
