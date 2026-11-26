import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { blocksToText, buildAcademyContext, parseAcademyRef, summarizeCategory } from "../lib/assistant/academy-context.js";

const require = createRequire(import.meta.url);
const Ex = require("../js/exercises.js");
const Sim = require("../js/simulator.js");
const ARTICLES = ["zona-2-3", "zona-3-2", "zona-1-3-1", "pick-and-roll", "superioridades", "spacing", "presion"].map((f) =>
  require(`../js/academy-content/${f}.js`)
);
const zona23 = ARTICLES[0];

test("parseAcademyRef acepta solo identificadores y condiciones acotadas", () => {
  assert.deepEqual(parseAcademyRef(undefined), { ok: true, data: null });
  const ok = parseAcademyRef({ articleId: "zona-2-3", exerciseId: "ej-1", categoria: " U15 ", conditions: { players: "8", court: "half", hoops: 1, minutes: 60, materials: ["Conos"] } });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.categoria, "U15");
  assert.deepEqual(ok.data.conditions, { players: 8, hoops: 1, minutes: 60, court: "half", materials: ["Conos"] });
  assert.equal(parseAcademyRef({}).ok, false, "falta el artículo");
  assert.equal(parseAcademyRef({ articleId: "../etc" }).ok, false);
  assert.equal(parseAcademyRef({ articleId: "zona-2-3", text: "x", conditions: { court: "playa" } }).ok, false);
  assert.equal(parseAcademyRef({ articleId: "zona-2-3", conditions: { players: -1 } }).ok, false);
  assert.equal(parseAcademyRef({ articleId: "zona-2-3", categoria: "x".repeat(61) }).ok, false);
});

test("blocksToText convierte listas, tablas y preguntas", () => {
  const t = blocksToText([{ h: "Título" }, { list: ["a", "b"], ordered: true }, { table: { head: ["A", "B"], rows: [["1", "2"]] } }, { qa: "¿Q?", answer: ["R"] }]);
  assert.match(t, /Título:/);
  assert.match(t, /1\. a\n2\. b/);
  assert.match(t, /A: 1 \| B: 2/);
  assert.match(t, /P: ¿Q\? R: R/);
});

test("el contexto de cada guía incluye contenido con procedencia y solo fuentes verificadas", () => {
  for (const article of ARTICLES) {
    const { sections, label } = buildAcademyContext({ ref: { articleId: article.id }, articles: ARTICLES });
    const all = sections.map((s) => s.content).join("\n");
    assert.match(label, new RegExp(article.title.slice(0, 10)));
    assert.ok(all.includes("Fuente oficial") || all.includes("Interpretación técnica"), article.id);
    article.sources.forEach((s) => assert.ok(all.includes(`[${s.id}]`), `${article.id} ${s.id}`));
    article.unavailableSources.forEach((u) => assert.ok(all.includes(u.title), `${article.id} no disponible`));
    assert.ok(sections[0].content.length <= 9000, `${article.id} contexto demasiado largo`);
  }
});

test("ejercicio: se adjunta la revisión de compatibilidad real con las condiciones", () => {
  const ex = zona23.exercises[0];
  const ref = { articleId: "zona-2-3", exerciseId: ex.id, conditions: { players: ex.meta.minPlayers - 1, court: "half", hoops: 1, minutes: 30, materials: [] } };
  const { sections } = buildAcademyContext({ ref, articles: ARTICLES, exercisesApi: Ex });
  const exSection = sections.find((s) => s.title === "Ejercicio seleccionado");
  assert.ok(exSection);
  assert.match(exSection.content, new RegExp(ex.name.slice(0, 12)));
  assert.match(exSection.content, /Incompatible: Necesita al menos/);
  const expected = Ex.checkCompatibility(ex, { players: ex.meta.minPlayers - 1, court: "half", hoops: 1, materials: [] });
  expected.alternatives.forEach((a) => assert.ok(exSection.content.includes(a.label)));
});

test("simulador: se describe la variante y el momento elegidos", () => {
  const pnr = ARTICLES.find((a) => a.id === "pick-and-roll");
  const ref = { articleId: "pick-and-roll", variantId: "blitz", positionId: "lectura" };
  const { sections, label } = buildAcademyContext({ ref, articles: ARTICLES, simApi: Sim });
  const sim = sections.find((s) => s.title === "Escenario del simulador");
  const st = Sim.resolveState(pnr.simulator, "blitz", "lectura").state;
  assert.ok(sim.content.includes(st.title));
  st.optionsText.forEach((t) => assert.ok(sim.content.includes(t)));
  assert.match(label, /Blitz/);
  // Un momento inexistente no agrega la sección (no se inventa un escenario).
  const none = buildAcademyContext({ ref: { articleId: "pick-and-roll", variantId: "blitz", positionId: "nada" }, articles: ARTICLES, simApi: Sim });
  assert.ok(!none.sections.some((s) => s.title === "Escenario del simulador"));
});

test("contenido o ejercicio inexistente: error, no contexto vacío", () => {
  assert.throws(() => buildAcademyContext({ ref: { articleId: "no-existe" }, articles: ARTICLES }), /No encontramos/);
  assert.throws(() => buildAcademyContext({ ref: { articleId: "zona-2-3", exerciseId: "no-existe" }, articles: ARTICLES }), /No encontramos/);
});

test("resumen de categoría: plan, ciclo actual y entrenamientos sin notas ni jugadores", () => {
  const plans = [{ nombre: "Plan U15", categoria: "U15", temporada: 2026, ciclos: [{ nombre: "Noviembre-Diciembre", fecha_inicio: "2026-11-01", fecha_fin: "2026-12-31", objetivo_principal: "Defensa zonal", fundamentos_trabajados: "Desplazamientos" }] }];
  const trainings = [
    { nombre: "Miércoles", categoria: "u15", fecha: "2026-11-25", notas_generales: "Juan llegó tarde", condiciones: { jugadores: 9, espacio: "half", aros: 1, materiales: ["Conos"] }, bloques: [{ titulo: "Zona 2-3", duracion_minutos: 30 }, { titulo: "Tiro", duracion_minutos: 20 }] },
    { nombre: "Otra categoría", categoria: "U17", fecha: "2026-11-26", bloques: [] }
  ];
  const text = summarizeCategory({ categoria: "U15", trainings, plans, today: new Date("2026-11-26T12:00:00Z") });
  assert.match(text, /Plan U15/);
  assert.match(text, /Objetivo principal del ciclo: Defensa zonal/);
  assert.match(text, /2026-11-25 · Miércoles · 50 min · 9 jugadores, media cancha, 1 aro\(s\), material: Conos/);
  assert.ok(!text.includes("Juan"), "no se envían notas libres");
  assert.ok(!text.includes("Otra categoría"));
  assert.match(summarizeCategory({ categoria: "U13", trainings, plans }), /No hay planificación anual/);
  assert.equal(summarizeCategory({ categoria: "" }), "");
});

test("la categoría sin datos queda explícita para que el asistente no invente", () => {
  const { sections } = buildAcademyContext({ ref: { articleId: "spacing", categoria: "U13" }, articles: ARTICLES });
  assert.match(sections.at(-1).content, /No hay datos guardados/);
});

const Bridge = require("../js/assistant-bridge.js");

test("la ventana envía solo identificadores, categoría y condiciones", () => {
  const pnr = ARTICLES.find((a) => a.id === "pick-and-roll");
  const body = Bridge.buildPayload(
    { article: pnr, exercise: pnr.exercises[0], variantId: "ice", positionId: "uso" },
    { text: "  ¿Cómo lo enseño?  ", mode: "debate", categoria: "U15", players: "8", court: "half", hoops: "1", minutes: "", materials: ["Balones"] }
  );
  assert.deepEqual(body, {
    action: "send",
    mode: "debate",
    text: "¿Cómo lo enseño?",
    academy: {
      articleId: "pick-and-roll",
      exerciseId: pnr.exercises[0].id,
      variantId: "ice",
      positionId: "uso",
      categoria: "U15",
      conditions: { players: 8, court: "half", hoops: 1, minutes: null, materials: ["Balones"] }
    }
  });
  // Lo que arma la ventana es exactamente lo que acepta el servidor.
  assert.equal(parseAcademyRef(body.academy).ok, true);
  const plain = Bridge.buildPayload({ article: pnr }, { text: "x", conversationId: "c1" });
  assert.deepEqual(plain.academy, { articleId: "pick-and-roll" });
  assert.equal(plain.conversationId, "c1");
});

test("las respuestas se muestran con formato y sin HTML ejecutable", () => {
  const html = Bridge.renderMarkdown("## Plan\n**Clave**: <script>alert(1)</script>\n- uno\n- dos\n\n| A | B |\n|---|---|\n| 1 | 2 |");
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<h4>Plan<\/h4>/);
  assert.match(html, /<strong>Clave<\/strong>/);
  assert.match(html, /<ul><li>uno<\/li><li>dos<\/li><\/ul>/);
  assert.match(html, /<th>A<\/th>/);
  assert.match(html, /<td>2<\/td>/);
  assert.ok(!/---/.test(html));
});

test("las preguntas de ejemplo dependen de desde dónde se consulta", () => {
  assert.match(Bridge.suggestionsFor({ article: zona23, exercise: zona23.exercises[0] })[0], /Adaptá este ejercicio/);
  assert.match(Bridge.suggestionsFor({ article: zona23, variantId: "base" })[0], /defensor/);
  assert.match(Bridge.suggestionsFor({ article: zona23 })[0], /enseñar/);
});
