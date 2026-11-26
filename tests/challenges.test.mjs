import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../js/challenges.js");
const Sim = require("../js/simulator.js");
const CHALLENGES = require("../js/academy-content/desafios.js");
const ARTICLES = ["zona-2-3", "zona-3-2", "zona-1-3-1", "pick-and-roll", "superioridades", "spacing", "presion"].map((f) =>
  require(`../js/academy-content/${f}.js`)
);
const byId = Object.fromEntries(ARTICLES.map((a) => [a.id, a]));
CHALLENGES.forEach((c) => C.register(c));

test("cada desafío se apoya en una guía real, con fuentes, situación y pizarras válidas", () => {
  assert.ok(CHALLENGES.length >= 5);
  for (const ch of CHALLENGES) {
    const errors = C.validateChallenge(ch, { article: byId[ch.articleId], Sim });
    assert.deepEqual(errors, [], ch.id);
  }
});

test("los desafíos no se reducen a una respuesta binaria", () => {
  for (const ch of CHALLENGES) {
    const verdicts = new Set(ch.options.map((o) => o.verdict));
    assert.ok(ch.options.length >= 3, ch.id);
    assert.ok(verdicts.size >= 2, `${ch.id}: necesita evaluaciones distintas`);
    const acceptable = ch.options.filter((o) => C.VERDICTS[o.verdict].ok);
    const wrong = ch.options.filter((o) => !C.VERDICTS[o.verdict].ok);
    assert.ok(acceptable.length >= 1 && wrong.length >= 1, ch.id);
  }
  // Al menos un desafío con dos respuestas recomendadas y otro con una «válida».
  assert.ok(CHALLENGES.some((c) => c.options.filter((o) => o.verdict === "best").length > 1));
  assert.ok(CHALLENGES.some((c) => c.options.some((o) => o.verdict === "valid")));
});

test("la validación detecta fuentes inventadas, situaciones inexistentes y secciones rotas", () => {
  const base = CHALLENGES[0];
  const art = byId[base.articleId];
  const bad = JSON.parse(JSON.stringify(base));
  bad.refs = ["S99"];
  bad.options[0].analysis += " [S42]";
  bad.situation.position = "nada";
  bad.related.section = "no-existe";
  bad.boards.push({ board: "fantasma" });
  const errors = C.validateChallenge(bad, { article: art, Sim }).join("\n");
  assert.match(errors, /fuente inexistente S99/);
  assert.match(errors, /cita S42 sin fuente/);
  assert.match(errors, /situación no existe/);
  assert.match(errors, /sección relacionada no existe/);
  assert.match(errors, /pizarra 3 no se puede construir/);
  const binary = JSON.parse(JSON.stringify(base));
  binary.options.forEach((o) => { o.verdict = "best"; });
  assert.match(C.validateChallenge(binary, { article: art, Sim }).join("\n"), /no hay decisión/);
  assert.match(C.validateChallenge({ ...base, articleId: "otra" }, { article: art, Sim }).join("\n"), /no existe/);
});

test("la situación no muestra la respuesta: usa el estado previo con los ajustes del desafío", () => {
  const ch = C.get("zona23-poste-alto");
  const st = C.situationState(ch, byId["zona-2-3"], Sim);
  assert.deepEqual(st.pos.o5, [5.4, 7.5]);
  // Los defensores siguen en la alineación con el balón arriba, no en el ajuste al poste alto.
  const top = Sim.resolveState(byId["zona-2-3"].simulator, "base", "top").state;
  assert.deepEqual(st.pos.x5, top.pos.x5);
  const doc = C.situationDoc(ch, { article: byId["zona-2-3"], Sim });
  assert.equal(doc.phases.length, 1);
  assert.equal(doc.phases[0].note, "");
  assert.deepEqual(doc.phases[0].strokes.map((s) => s.type), ["cut", "pass"]);
  // El estado original del simulador no se modifica.
  assert.notDeepEqual(Sim.resolveState(byId["zona-2-3"].simulator, "base", "top").state.pos.o5, [5.4, 7.5]);
});

test("las pizarras explicativas salen de la guía o del simulador", () => {
  const ch = C.get("pick-and-roll-drop");
  const def = C.boardDefFor(ch, ch.boards[0], { article: byId["pick-and-roll"], Sim });
  assert.equal(def.doc.phases.length, 3);
  const z = C.get("zona23-poste-alto");
  const a = C.boardDefFor(z, z.boards[0], { article: byId["zona-2-3"], Sim });
  assert.equal(a.id, "poste-alto-a");
  assert.ok(a.spec);
});

test("grade y nextRecord: varias respuestas recomendadas, intentos y primer resultado", () => {
  const ch = C.get("zona23-poste-alto");
  const g = C.grade(ch, "b");
  assert.equal(g.verdict, "best");
  assert.equal(g.ok, true);
  assert.equal(g.recommended.length, 2);
  assert.equal(C.grade(ch, "zz"), null);
  const r1 = C.nextRecord(null, ch, "d", "2026-11-26T10:00:00.000Z");
  assert.deepEqual(r1, {
    kind: "challenge", articleId: "zona-2-3", choice: "d", verdict: "poor", attempts: 1,
    firstChoice: "d", firstVerdict: "poor", completedAt: "2026-11-26T10:00:00.000Z", lastAt: "2026-11-26T10:00:00.000Z"
  });
  const r2 = C.nextRecord(r1, ch, "a", "2026-11-26T11:00:00.000Z");
  assert.equal(r2.attempts, 2);
  assert.equal(r2.verdict, "best");
  assert.equal(r2.firstVerdict, "poor");
  assert.equal(r2.completedAt, "2026-11-26T10:00:00.000Z");
  assert.equal(r2.lastAt, "2026-11-26T11:00:00.000Z");
});

test("summarizeProgress: estudiados, desafíos, favoritos, resultados y temas pendientes", () => {
  const items = [
    { id: "zona-2-3", studied: true, studiedAt: "2026-11-20T00:00:00Z", favorite: true, tab: "aprender", updated_at: "2026-11-20T00:00:00Z" },
    { id: "spacing", tab: "simular", section: "simulador", updated_at: "2026-11-25T00:00:00Z" },
    { id: "ex:zona-2-3:" + byId["zona-2-3"].exercises[0].id, favorite: true },
    { id: "ex:zona-2-3:no-existe", favorite: true },
    { id: "ch:zona23-poste-alto", kind: "challenge", verdict: "best", firstVerdict: "poor", attempts: 2, lastAt: "2026-11-26T00:00:00Z" },
    { id: "ch:presion-rotacion", kind: "challenge", verdict: "risky", firstVerdict: "risky", attempts: 1 },
    { id: "ch:spacing-receptor", kind: "challenge", verdict: "valid", firstVerdict: "valid", attempts: 1 },
    { id: "ch:borrado", kind: "challenge", verdict: "best" }
  ];
  const s = C.summarizeProgress({ articles: ARTICLES, challenges: CHALLENGES, items });
  assert.deepEqual(s.articles.studied.map((a) => a.id), ["zona-2-3"]);
  assert.deepEqual(s.articles.inProgress.map((a) => a.id), ["spacing"]);
  assert.equal(s.articles.notStarted.length, ARTICLES.length - 2);
  assert.deepEqual(s.favorites.articles.map((a) => a.id), ["zona-2-3"]);
  assert.equal(s.favorites.exercises.length, 1, "los favoritos de ejercicios inexistentes se ignoran");
  assert.equal(s.challenges.total, CHALLENGES.length);
  assert.equal(s.challenges.done, 3);
  assert.equal(s.challenges.ok, 2);
  assert.equal(s.challenges.firstTryOk, 1);
  assert.deepEqual(s.results, { best: 1, valid: 1, risky: 1, poor: 0 });
  // Orden de pendientes: repasar, guías empezadas, desafíos sin responder, guías nuevas.
  const types = s.pending.map((p) => p.type);
  assert.equal(types[0], "review");
  assert.equal(s.pending[0].id, "presion-rotacion");
  assert.deepEqual(s.pending[0].related, C.get("presion-rotacion").related);
  assert.equal(types[1], "article");
  assert.ok(types.indexOf("challenge") > types.lastIndexOf("article"));
  assert.ok(types.indexOf("article-new") > types.lastIndexOf("challenge"));
  assert.ok(!s.pending.some((p) => p.id === "zona-2-3"), "lo estudiado no queda pendiente");
});

test("summarizeProgress sin datos no inventa avances", () => {
  const s = C.summarizeProgress({ articles: ARTICLES, challenges: CHALLENGES, items: [] });
  assert.equal(s.articles.studied.length, 0);
  assert.equal(s.challenges.done, 0);
  assert.deepEqual(s.results, { best: 0, valid: 0, risky: 0, poor: 0 });
  assert.equal(s.pending.length, ARTICLES.length + CHALLENGES.length);
});
