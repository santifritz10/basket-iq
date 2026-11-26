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

const Ex = require("../js/exercises.js");

test("los ejercicios tienen requisitos estructurados coherentes con la ficha", () => {
  for (const ex of zona23.exercises) {
    const m = ex.meta;
    assert.ok(m && m.minPlayers > 0 && (!m.maxPlayers || m.maxPlayers >= m.minPlayers), ex.id);
    assert.ok(["half", "full"].includes(m.court), ex.id);
    assert.ok(m.minutes[0] <= m.minutes[1], ex.id);
    (ex.adaptations || []).forEach((a) => assert.ok(a.id && a.label && a.text && a.req, ex.id + "/" + a.id));
  }
});

test("la compatibilidad avisa cancha y jugadores y propone una variante compatible", () => {
  const reb = zona23.exercises.find((e) => e.id === "ej-rebote");
  const r = Ex.checkCompatibility(reb, { players: 10, court: "half", hoops: 1, materials: ["Balones"] });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === "court"));
  assert.deepEqual(r.alternatives.map((a) => a.id), ["media-cancha", "tres-contra-tres"]);
  assert.equal(Ex.checkCompatibility(reb, { players: 10, court: "half", hoops: 1, materials: ["Balones"] }, "media-cancha").ok, true);

  const linea = zona23.exercises.find((e) => e.id === "ej-linea");
  const few = Ex.checkCompatibility(linea, { players: 8, court: "half", hoops: 1, materials: ["Balones", "Conos"] });
  assert.equal(few.ok, false);
  assert.ok(few.issues[0].text.includes("al menos 9") && few.issues[0].text.includes("hay 8"));
  assert.deepEqual(few.alternatives.map((a) => a.id), ["tres-contra-cuatro"]);

  const unknown = Ex.checkCompatibility(linea, {});
  assert.equal(unknown.ok, true);
  assert.ok(unknown.unknown.length >= 3);
});

test("los filtros combinan jugadores, cancha y materiales", () => {
  const list = Ex.collect([zona23]);
  assert.equal(list.length, 3);
  assert.equal(Ex.filterList(list, { cancha: "full" }).length, 1);
  assert.equal(Ex.filterList(list, { cancha: "half" }).length, 3, "el de rebote entra por su versión de media cancha");
  assert.deepEqual(Ex.filterList(list, { materiales: ["Balones"] }).map((i) => i.ex.id).sort(), ["ej-espejo", "ej-rebote"]);
  assert.equal(Ex.filterList(list, { jugadores: 5 }).length, 0);
  assert.equal(Ex.filterList(list, { jugadores: 7 }).length, 2);
  assert.equal(Ex.filterList(list, { duracion: 9 }).length, 1);
  assert.equal(Ex.filterList(list, { q: "rebote" }).length, 1);
});

test("el bloque del planificador es una copia con referencia al original", () => {
  const list = Ex.collect([zona23]);
  const it = list.find((i) => i.ex.id === "ej-rebote");
  const before = JSON.stringify(it.ex);
  const b = Ex.buildBlock(it, { adaptationId: "media-cancha", minutes: 12, notes: "Ojo con el 4", blockType: "tactica" });
  assert.equal(b.duracion_minutos, 12);
  assert.match(b.titulo, /Versión media cancha/);
  assert.match(b.descripcion, /ORGANIZACIÓN/);
  assert.match(b.descripcion, /ADAPTACIÓN ELEGIDA/);
  assert.match(b.descripcion, /Ojo con el 4/);
  assert.ok(!/\[S\d\]/.test(b.descripcion));
  assert.deepEqual(b.academy_ref, { article_id: "zona-2-3", exercise_id: "ej-rebote", adaptation_id: "media-cancha", variant: null, section_id: "zone23_defense" });
  b.descripcion = "editado";
  assert.equal(JSON.stringify(it.ex), before, "el ejercicio original no cambia");
});

// ---------------------------------------------------------------
// Etapa 5: zonas 3-2 y 1-3-1
// ---------------------------------------------------------------
const zona32 = require("../js/academy-content/zona-3-2.js");
const zona131 = require("../js/academy-content/zona-1-3-1.js");
const SECTION_IDS = ["introduccion", "definicion", "objetivos", "principios", "explicacion", "responsabilidades", "aplicacion", "ventajas", "limitaciones", "errores", "correcciones", "metodologia", "progresiones", "adaptaciones"];

for (const art of [zona32, zona131]) {
  test(`${art.id}: contenido válido, completo y con citas a fuentes listadas`, () => {
    assert.deepEqual(Academy.validateArticle(art), []);
    const ids = art.tabs.aprender.map((s) => s.id);
    SECTION_IDS.forEach((id) => assert.ok(ids.includes(id), id));
    assert.ok(art.exercises.length >= 3);
    assert.ok(art.sources.length >= 5);
    assert.ok(art.unavailableSources.length >= 1, "debe declarar las fuentes que no se pudieron leer");
    art.tabs.visualizar.forEach((id) => assert.ok(art.boards.some((b) => b.id === id), id));
  });

  test(`${art.id}: pizarras animables, dentro de media cancha y sin jugadores superpuestos`, () => {
    for (const b of art.boards) {
      const doc = Academy.boardFromSpec(b.spec, Board);
      assert.ok(doc.phases.length >= 2, b.id);
      for (let pos = 0; pos <= doc.phases.length - 1; pos += 0.25) {
        Board.sampleFrame(doc, pos).objects.forEach((o) => assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), `${b.id} @${pos}`));
      }
      doc.phases.forEach((ph, i) => {
        const ps = ph.objects.filter((o) => o.kind === "player" && !o.hidden);
        ps.forEach((p) => assert.ok(p.x >= 0 && p.x <= 14 && p.y >= 0 && p.y <= 15, `${b.id} ${p.id}`));
        for (let a = 0; a < ps.length; a++) for (let c = a + 1; c < ps.length; c++) {
          assert.ok(Math.hypot(ps[a].x - ps[c].x, ps[a].y - ps[c].y) >= 0.55, `${b.id} fase ${i}: ${ps[a].id}/${ps[c].id}`);
        }
      });
    }
  });

  test(`${art.id}: simulador coherente, con variantes y secuencia animable`, () => {
    const sc = art.simulator;
    assert.deepEqual(Sim.validateScenario(sc), []);
    assert.ok(sc.variants.length >= 3, "más de un criterio defensivo");
    const doc = Sim.sequenceDoc(sc, sc.variants[1].id, sc.tour, Board);
    assert.equal(doc.phases.length, sc.tour.length);
    const r = Sim.resolveState(sc, "base", "cornerR").state;
    const l = Sim.resolveState(sc, "base", "cornerL").state;
    assert.equal(l.ball, "o5");
    assert.match(l.title, /izquierda/);
    Object.keys(sc.mirrorSwap).filter((k) => k[0] === "x").forEach((k) => {
      assert.deepEqual(l.pos[sc.mirrorSwap[k]], [r.pos[k][0], 15 - r.pos[k][1]]);
    });
  });

  test(`${art.id}: ejercicios con requisitos y adaptaciones compatibles`, () => {
    for (const ex of art.exercises) {
      const m = ex.meta;
      assert.ok(m.minPlayers > 0 && m.maxPlayers >= m.minPlayers, ex.id);
      const few = Ex.checkCompatibility(ex, { players: m.minPlayers - 1, court: "half", hoops: 1, materials: ["Balones", "Conos"] });
      assert.equal(few.ok, false, ex.id);
      assert.ok(few.alternatives.length >= 1, ex.id + " sin adaptación para menos jugadores");
      const alt = few.alternatives[0].id;
      assert.equal(Ex.checkCompatibility(ex, { players: m.minPlayers - 1, court: "half", hoops: 1, materials: ["Balones", "Conos"] }, alt).ok, true, ex.id + "/" + alt);
    }
  });
}

test("la biblioteca reúne los ejercicios de las tres zonas sin claves repetidas", () => {
  const list = Ex.collect([zona23, zona32, zona131]);
  assert.equal(list.length, 9);
  assert.equal(new Set(list.map((i) => i.key)).size, 9);
  assert.ok(Ex.filterList(list, { fundamento: "Ataque contra zona" }).length >= 2);
});

// ---------------------------------------------------------------
// Etapa 5B: pick and roll, superioridades y spacing
// ---------------------------------------------------------------
const pnr = require("../js/academy-content/pick-and-roll.js");
const superioridades = require("../js/academy-content/superioridades.js");
const spacing = require("../js/academy-content/spacing.js");
const presion = require("../js/academy-content/presion.js");

for (const art of [pnr, superioridades, spacing, presion]) {
  test(`${art.id}: contenido válido, completo y con fuentes`, () => {
    assert.deepEqual(Academy.validateArticle(art), []);
    const ids = art.tabs.aprender.map((s) => s.id);
    SECTION_IDS.forEach((id) => assert.ok(ids.includes(id), id));
    assert.ok(art.exercises.length >= 3);
    assert.ok(art.sources.length >= 3);
    assert.ok(art.unavailableSources.length >= 1);
    art.tabs.visualizar.forEach((id) => assert.ok(art.boards.some((b) => b.id === id), id));
  });

  test(`${art.id}: pizarras animables, dentro de la cancha y sin superposiciones`, () => {
    for (const b of art.boards) {
      const doc = Academy.boardFromSpec(b.spec, Board);
      assert.ok(doc.phases.length >= 2, b.id);
      const maxX = b.spec.view.court === "full" ? 28 : 14;
      doc.phases.forEach((ph, i) => {
        const ps = ph.objects.filter((o) => o.kind === "player" && !o.hidden);
        ps.forEach((p) => assert.ok(p.x >= 0 && p.x <= maxX && p.y >= 0 && p.y <= 15, `${b.id} ${p.id}`));
        for (let a = 0; a < ps.length; a++) for (let c = a + 1; c < ps.length; c++) {
          assert.ok(Math.hypot(ps[a].x - ps[c].x, ps[a].y - ps[c].y) >= 0.55, `${b.id} fase ${i}: ${ps[a].id}/${ps[c].id}`);
        }
      });
    }
  });

  test(`${art.id}: simulador válido, con variantes, opciones y secuencia`, () => {
    const sc = art.simulator;
    assert.deepEqual(Sim.validateScenario(sc), []);
    assert.ok(sc.variants.length >= 3);
    sc.variants.forEach((v) => {
      const doc = Sim.sequenceDoc(sc, v.id, sc.tour, Board);
      assert.equal(doc.phases.length, sc.tour.length, v.id);
    });
    assert.ok(sc.ui && sc.ui.disclaimer, "aclara que no es un resultado garantizado");
  });

  test(`${art.id}: ejercicios con adaptación para menos jugadores`, () => {
    for (const ex of art.exercises) {
      const m = ex.meta;
      const env = { players: m.minPlayers - 1, court: "half", hoops: 1, materials: ["Balones", "Conos"] };
      const few = Ex.checkCompatibility(ex, env);
      assert.equal(few.ok, false, ex.id);
      assert.ok(few.alternatives.length >= 1, ex.id);
      assert.equal(Ex.checkCompatibility(ex, env, few.alternatives[0].id).ok, true, ex.id);
    }
  });
}

test("pick and roll: las cinco coberturas pedidas", () => {
  const ids = pnr.simulator.variants.map((v) => v.id);
  ["drop", "switch", "hedge", "blitz", "ice"].forEach((id) => assert.ok(ids.includes(id), id));
  const lectura = Sim.resolveState(pnr.simulator, "blitz", "lectura").state;
  assert.ok(lectura.options.length >= 1 && lectura.options.length === lectura.optionsText.length);
});

test("superioridades: cada situación usa solo sus jugadores y ofrece decisiones", () => {
  const sc = superioridades.simulator;
  const dos = Sim.resolveState(sc, "dos-cierra", "inicio").state;
  assert.deepEqual(Object.keys(dos.pos).sort(), ["o1", "o2", "x1"]);
  const cuatro = Sim.resolveState(sc, "cuatro", "inicio").state;
  assert.equal(Object.keys(cuatro.pos).length, 7);
  ["pasar", "penetrar", "finalizar", "spacing", "fijar"].forEach((p) => {
    assert.ok(sc.positions.some((x) => x.id === p), p);
    assert.ok(Sim.resolveState(sc, "tres-espera", p).state.help, p);
  });
  // El 3c2 en el que el primer defensor no sale muestra el pase de vuelta al base.
  const pasar = Sim.resolveState(sc, "tres-espera", "pasar").state;
  assert.deepEqual(pasar.options[0], ["pass", "o2", "o1"]);
});

test("spacing: el buen espacio deja una esquina libre en la penetración y el malo no", () => {
  const sc = spacing.simulator;
  const buena = Sim.resolveState(sc, "base", "penetracion").state;
  const mala = Sim.resolveState(sc, "agrupados", "penetracion").state;
  const d = (s, a, b) => Math.hypot(s.pos[a][0] - s.pos[b][0], s.pos[a][1] - s.pos[b][1]);
  assert.ok(d(buena, "o5", "x5") > d(mala, "o4", "x4"));
  assert.ok(d(buena, "o5", "x5") > 4);
});

test("presión: simulador a toda la cancha con los cinco momentos y la 2-2-1 marcada como interpretación", () => {
  const sc = presion.simulator;
  assert.equal(sc.view.court, "full");
  assert.deepEqual(sc.tour, ["saque", "recepcion", "trampa", "rotacion", "salida"]);
  assert.equal(sc.variants.find((v) => v.id === "zona221").kind, "interpretation");
  assert.ok(presion.unavailableSources.some((u) => /2-2-1/.test(u.title)));
  // La validación usa el largo de la cancha completa.
  const bad = JSON.parse(JSON.stringify(sc));
  bad.variants[0].states.saque.pos.o4 = [29, 9.5];
  assert.ok(Sim.validateScenario(bad).some((e) => /fuera de la cancha/.test(e)));
});

test("la biblioteca reúne los ejercicios de las siete guías sin claves repetidas", () => {
  const list = Ex.collect([zona23, zona32, zona131, pnr, superioridades, spacing, presion]);
  assert.equal(list.length, 21);
  assert.equal(new Set(list.map((i) => i.key)).size, 21);
  assert.ok(Ex.filterList(list, { fundamento: "Spacing" }).length === 3);
});
