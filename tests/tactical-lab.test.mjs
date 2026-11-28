import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";

const require = createRequire(import.meta.url);
const Academy = require("../js/academy.js");
const Sim = require("../js/simulator.js");
const Cat = require("../js/tactical-catalog.js");
const Lab = require("../js/tactical-lab.js");
const Media = require("../js/tactical-media.js");
const FundCat = require("../js/fundamentos-catalog.js");

const articles = ["spacing", "pick-and-roll", "zona-2-3", "zona-3-2", "zona-1-3-1", "presion", "superioridades",
  "tl-ventajas", "tl-5-out", "tl-ataque-zona-2-3", "tl-drop", "tl-balance-defensivo"]
  .map((f) => require(`../js/academy-content/${f}.js`));
articles.forEach((a) => Academy.register(a));

const mainJs = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const pageJs = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");

const NEW_FICHAS = ["spacing", "ventajas", "pick-and-roll", "cinco-abiertos", "ataque-zona-2-3", "zona-2-3", "drop", "balance-defensivo"];

test("cinco áreas educativas y herramientas reales", () => {
  assert.deepEqual(Cat.AREAS.map((a) => a.id), ["principios", "ataque", "defensa", "transicion", "especiales"]);
  for (const t of Cat.TOOLS) assert.match(mainJs + indexHtml, new RegExp(t.go), t.id);
});

test("las 8 fichas pedidas existen, son fichas y validan", () => {
  for (const id of NEW_FICHAS) {
    const e = Cat.getEntry(id);
    assert.ok(e, id);
    assert.equal(e.status, "ficha", id);
    const a = Academy.get(e.article);
    assert.ok(a, `${id} → ${e.article}`);
    assert.deepEqual(Academy.validateArticle(a), [], id);
  }
});

test("cada contenido con artículo valida, y los simuladores también", () => {
  for (const e of Cat.ENTRIES.filter((x) => x.article)) {
    const a = Academy.get(e.article);
    assert.ok(a, e.id);
    assert.deepEqual(Academy.validateArticle(a), [], e.id);
    if (a.simulator) assert.deepEqual(Sim.validateScenario(a.simulator), [], `${e.id} simulador`);
  }
});

test("simulador de ataque contra zona 2-3: acciones y variantes defensivas", () => {
  const a = Academy.get("tl-ataque-zona-2-3");
  assert.ok(a.simulator);
  assert.ok(Object.keys(a.simulator.states || a.simulator.positions).length >= 7);
  assert.ok(Object.keys(a.simulator.variants).length >= 3);
  assert.ok(Lab.simulatorEntries().some((e) => e.id === "ataque-zona-2-3"));
});

test("las páginas anteriores siguen existiendo en main.js", () => {
  for (const e of Cat.ENTRIES) {
    const legacy = e.legacy || e.section;
    if (legacy) assert.match(mainJs, new RegExp(`case ['"]${legacy}['"]`), `${e.id}: ${legacy}`);
  }
});

test("ids anteriores de los hubs redirigen a un área", () => {
  for (const id of Object.keys(Cat.LEGACY_HUBS)) {
    const r = Cat.resolve(id);
    assert.equal(r.type, "area", id);
    assert.ok(Cat.getArea(r.area), id);
  }
  assert.equal(Cat.resolve("tactical_lab").type, "home");
  assert.deepEqual(Cat.resolve("tl_area_defensa__zonas"), { type: "area", area: "defensa", family: "zonas" });
  assert.deepEqual(Cat.resolve("tl_drop"), { type: "entry", entry: "drop" });
  // Las hojas anteriores no se interceptan: se muestran como siempre con un aviso.
  assert.equal(Cat.resolve("vs23"), null);
  assert.equal(Cat.resolve("algo_que_no_es"), null);
});

test("el buscador local encuentra conceptos sin tildes ni mayúsculas", () => {
  const ids = (q) => Cat.search(q).map((x) => x.id || (x.entry && x.entry.id));
  assert.equal(ids("pick and roll")[0], "pick-and-roll");
  assert.equal(ids("DROP")[0], "drop");
  assert.equal(ids("short corner")[0], "ataque-zona-2-3");
  assert.ok(ids("transicion").includes("balance-defensivo"));
  assert.deepEqual(Cat.search(""), []);
});

test("las fuentes citadas existen en el catálogo y las no consultadas no se citan", () => {
  for (const a of articles) {
    for (const s of a.sources || []) {
      assert.ok(s.title && s.url !== undefined, `${a.id}: ${s.id}`);
      assert.notEqual(s.consulted, false, `${a.id}: ${s.id}`);
    }
  }
  for (const k of ["wabc-l1-2-1-2", "wabc-l2-2-4-4", "wabc-l2-1-2-1"]) assert.ok(FundCat.SOURCES[k], k);
});

test("pestañas: Variantes solo cuando la ficha la tiene y etiquetas nuevas", () => {
  const tabs = (id) => (Academy.tabsFor ? Academy.tabsFor(Academy.get(id), Lab.TAB_LABELS) : null);
  if (!tabs("tl-5-out")) return;
  assert.ok(tabs("tl-5-out").some((t) => t.id === "variantes"));
  assert.equal(tabs("tl-5-out").find((t) => t.id === "aprender").label, "Comprender");
  assert.equal(tabs("tl-5-out").find((t) => t.id === "entrenar").label, "Enseñar");
});

test("fotos: 6 claves, WebP livianas, sin base64", () => {
  const dir = new URL("../public/images/academy/tactical/", import.meta.url);
  const files = readdirSync(dir);
  assert.ok(files.every((f) => f.endsWith(".webp")));
  const total = files.reduce((n, f) => n + statSync(new URL(f, dir)).size, 0);
  assert.ok(total < 1024 * 1024, `total ${total}`);
  assert.equal(Object.keys(Media.PHOTOS).length, 6);
  for (const k of Object.values(Media.AREA_PHOTO)) assert.ok(Media.has(k), k);
  assert.doesNotMatch(readFileSync(new URL("../js/tactical-media.js", import.meta.url), "utf8"), /data:image/);
});

test("scripts nuevos cargados en index.html y en app/page.js", () => {
  for (const f of ["tactical-media.js", "tactical-catalog.js", "tactical-lab.js", "academy-content/tl-drop.js"]) {
    assert.ok(indexHtml.includes(f), `index.html ${f}`);
    assert.ok(pageJs.includes(f), `page.js ${f}`);
  }
});
