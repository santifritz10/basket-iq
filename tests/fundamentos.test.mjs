import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const Board = require("../js/tactical-board.js");
const Academy = require("../js/academy.js");
const Cat = require("../js/fundamentos-catalog.js");
const Videos = require("../js/video-catalog.js");
const Figures = require("../js/fundamentos-figures.js");
const fichas = ["crossover", "catch-shoot", "bandeja", "closeout"].map((f) => require(`../js/academy-content/fund-${f}.js`));
fichas.forEach((a) => Academy.register(a));

const legacy = (() => {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(new URL("../js/fundamentos-data.js", import.meta.url), "utf8"), ctx);
  return ctx.window.FUNDAMENTOS_CONTENIDO;
})();

test("el modelo de conceptos es válido y cubre todo el contenido anterior", () => {
  assert.deepEqual(Cat.validate(legacy), []);
  assert.equal(Cat.AREAS.length, 8);
  assert.ok(Cat.CONCEPTS.length < Object.keys(legacy).length, "se eliminaron duplicaciones");
});

test("cada id antiguo (fund_*) sigue resolviendo a un concepto", () => {
  for (const id of Object.keys(legacy)) {
    const r = Cat.resolve(id);
    assert.ok(r && r.type === "concept", id);
  }
});

test("los ids antiguos del menú (fund_cat_*) resuelven a un área", () => {
  for (const a of Cat.AREAS) assert.deepEqual(Cat.resolve(a.legacy).area, a.id);
  for (const id of Object.keys(Cat.LEGACY_GROUPS)) assert.equal(Cat.resolve(id).type, "area", id);
  assert.equal(Cat.resolve("fundamentos").type, "home");
  assert.equal(Cat.resolve("algo_que_no_es"), null);
});

test("duplicaciones conocidas: una sola ficha principal", () => {
  assert.equal(Cat.resolve("fund_pocket_pass").concept, "pocket");
  assert.equal(Cat.resolve("fund_floater").concept, Cat.resolve("fund_floater_finish").concept);
  assert.equal(Cat.resolve("fund_tear_drop").concept, "floater");
  assert.equal(Cat.resolve("fund_up_under").concept, Cat.resolve("fund_up_under_post").concept);
  assert.equal(Cat.resolve("fund_fadeaway").concept, Cat.resolve("fund_fadeaway_post").concept);
  assert.equal(Cat.resolve("fund_one_dribble_pull_up").concept, "pull-up");
  assert.equal(Cat.resolve("fund_reverse_layup").concept, Cat.resolve("fund_reverse_finish").concept);
  // Spin: mismo nombre, movimientos distintos (con dribbling y en el poste).
  assert.notEqual(Cat.resolve("fund_spin_move").concept, Cat.resolve("fund_spin_move_post").concept);
  // Variantes conservan su id antiguo.
  assert.deepEqual([Cat.resolve("fund_runner").concept, Cat.resolve("fund_runner").variant], ["floater", "runner"]);
});

test("un concepto aparece en varias áreas sin duplicarse", () => {
  const inLanz = Cat.conceptsInArea("lanzamiento").map((c) => c.id);
  const inFin = Cat.conceptsInArea("finalizaciones").map((c) => c.id);
  assert.ok(inLanz.includes("floater") && inFin.includes("floater"));
  assert.equal(Cat.CONCEPTS.filter((c) => c.id === "floater").length, 1);
});

test("buscador: español, inglés, alias y sin acentos", () => {
  assert.equal(Cat.search({ q: "tear drop" })[0].id, "floater");
  assert.equal(Cat.search({ q: "Close-out" })[0].id, "closeout");
  assert.equal(Cat.search({ q: "cierre" })[0].id, "closeout");
  assert.equal(Cat.search({ q: "LAYUP" })[0].id, "bandeja");
  assert.ok(Cat.search({ q: "recepcion" }).some((c) => c.id === "catch-shoot"));
  assert.equal(Cat.search({ q: "zzzz" }).length, 0);
  const avanzados = Cat.search({ level: "Avanzado" });
  assert.ok(avanzados.length > 0 && avanzados.every((c) => c.level === "Avanzado"));
  const conVideo = Cat.search({ video: true }, { hasVideo: (c) => Videos.hasVideo(c.id) });
  assert.ok(conVideo.some((c) => c.id === "crossover"));
  assert.ok(!conVideo.some((c) => c.id === "closeout"), "Closeout no tiene video verificado");
});

test("las cuatro fichas modelo son válidas y están enlazadas a su concepto", () => {
  for (const a of fichas) {
    assert.deepEqual(Academy.validateArticle(a), [], a.id);
    const c = Cat.getConcept(a.conceptId);
    assert.equal(c.article, a.id);
    assert.deepEqual(Cat.resolve(a.sectionId), { type: "concept", concept: a.conceptId, variant: null });
    for (const tab of ["aprender", "entrenar", "evaluar"]) assert.ok(a.tabs[tab].length >= 3, `${a.id} ${tab}`);
    assert.ok(a.exercises.length >= 2, a.id);
    assert.ok(a.tabs.aprender.some((s) => s.audience === "player"), `${a.id} sin contenido de jugador`);
    assert.ok(a.tabs.entrenar.some((s) => s.audience === "coach"), `${a.id} sin contenido de entrenador`);
    for (const f of Academy.EXERCISE_FIELDS) for (const ex of a.exercises) assert.ok(ex[f[0]] != null && ex[f[0]] !== "", `${a.id}/${ex.id} sin ${f[0]}`);
    for (const ex of a.exercises) for (const id of ex.meta.fundamentos) assert.ok(Cat.getConcept(id), `${ex.id}: ${id}`);
  }
});

test("los ejercicios compartidos existen y no se duplican", () => {
  const all = fichas.flatMap((a) => a.exercises.map((e) => e.name));
  assert.equal(new Set(all).size, all.length);
  for (const a of fichas) {
    for (const sec of a.tabs.entrenar) {
      for (const bl of sec.blocks || []) {
        if (!bl.exerciseLink) continue;
        const other = Academy.get(bl.exerciseLink.article);
        assert.ok(other && other.exercises.some((e) => e.id === bl.exerciseLink.id), JSON.stringify(bl.exerciseLink));
      }
    }
  }
});

test("las pizarras de las fichas son animables y quedan en media cancha", () => {
  for (const a of fichas) {
    for (const b of a.boards) {
      const doc = Academy.boardFromSpec(b.spec, Board);
      assert.ok(doc.phases.length >= 2, b.id);
      doc.phases.forEach((ph) => ph.objects.filter((o) => o.kind === "player").forEach((p) => {
        assert.ok(p.x >= 0 && p.x <= 14 && p.y >= 0 && p.y <= 15, `${a.id}/${b.id}`);
      }));
    }
  }
});

test("catálogo de videos: válido, sin duplicados y sin marcas de tiempo no revisadas", () => {
  assert.deepEqual(Videos.validate(), []);
  for (const v of Videos.VIDEOS) {
    for (const rel of v.concepts) {
      // "tl:<id>" relaciona el video con un contenido del laboratorio táctico.
      const ok = rel.id.startsWith("tl:") ? require("../js/tactical-catalog.js").getEntry(rel.id.slice(3)) : Cat.getConcept(rel.id);
      assert.ok(ok, `${v.id} → ${rel.id}`);
    }
  }
  const used = fichas.flatMap((a) => JSON.stringify(a.tabs.visualizar).match(/"video":"([^"]+)"/g) || []).map((m) => m.split('"')[3]);
  for (const id of used) assert.ok(Videos.get(id), id);
});

test("el reproductor usa privacidad mejorada y nunca reproducción automática", () => {
  const v = Videos.get("fiba-cdp-finishing");
  const url = Videos.embedUrl(v, 30);
  assert.ok(url.startsWith("https://www.youtube-nocookie.com/embed/jA_y9F3zz_A?"));
  assert.ok(!/autoplay/.test(url));
  assert.ok(url.includes("start=30"));
  const html = Videos.renderCard("fiba-cdp-finishing", { conceptId: "bandeja" });
  assert.ok(!html.includes("<iframe"), "el iframe se carga recién al pedirlo");
  assert.ok(html.includes("data-video-load"));
  const missing = Videos.renderCard("no-existe", {});
  assert.ok(missing.includes("Video no disponible"));
});

test("un video bloqueado o eliminado no muestra reproductor vacío", () => {
  const blocked = { ...Videos.get("fiba-cdp-shooter"), embed: "blocked" };
  assert.equal(Videos.canEmbed(blocked), false);
  const removed = { ...Videos.get("fiba-cdp-shooter"), availability: "removed" };
  assert.equal(Videos.isListed(removed), false);
});

test("las ilustraciones son SVG propios con texto alternativo", () => {
  for (const id of Figures.ids) {
    const svg = Figures.render(id);
    assert.ok(svg.startsWith("<svg") && /role="img"/.test(svg) && /<title>/.test(svg), id);
    assert.ok(!/<image|href="http/.test(svg), `${id} no usa imágenes externas`);
  }
  for (const a of Cat.AREAS) assert.ok(Figures.render(a.figure), a.id);
});

test("modo jugador / entrenador filtra secciones sin duplicar contenido", () => {
  const a = Academy.get("fund-crossover");
  const player = Academy.forMode(a.tabs.entrenar, "player").map((s) => s.id);
  const coach = Academy.forMode(a.tabs.entrenar, "coach").map((s) => s.id);
  assert.ok(player.includes("solo") && !player.includes("consignas"));
  assert.ok(coach.includes("consignas") && !coach.includes("solo"));
  assert.ok(player.includes("progresion") && coach.includes("progresion"));
  assert.deepEqual(Academy.tabsFor(a).map((t) => t.id), ["aprender", "visualizar", "entrenar", "evaluar", "fuentes"]);
});

test("fotos de la academia: WebP optimizados, una por área y sin pasarse del presupuesto", async () => {
  const Media = require("../js/fundamentos-media.js");
  const { statSync, existsSync } = await import("node:fs");
  for (const a of Cat.AREAS) {
    const key = Media.areaPhoto(a.id);
    assert.ok(key, `${a.id} sin foto`);
    assert.ok(Media.PHOTOS[key].alt.length > 20, `${key} sin texto alternativo`);
  }
  assert.ok(Media.has("portada"), "falta la portada general");
  let total = 0;
  for (const [key, entry] of Object.entries(Media.MANIFEST)) {
    for (const [size, [name, bytes]] of Object.entries(entry.files)) {
      const file = new URL(`../public/images/academy/fundamentals/${name}`, import.meta.url);
      assert.ok(existsSync(file), name);
      assert.equal(statSync(file).size, bytes, name);
      assert.ok(name.endsWith(".webp"), name);
      const limit = { "480": 40e3, "800": 100e3, "960": 120e3, "1440": 200e3 }[size];
      assert.ok(bytes <= limit, `${name}: ${bytes} bytes`);
      total += bytes;
    }
  }
  assert.ok(total <= 1.5e6, `paquete total ${total} bytes`);
  // Las fichas reutilizan la foto de su área (sin archivos duplicados).
  assert.equal(Media.conceptPhoto(Cat.getConcept("closeout")), "defensa");
  const img = Media.img("pase", { variant: "card" });
  assert.ok(/loading="lazy"/.test(img) && /width="800"/.test(img) && /height="450"/.test(img) && /srcset=/.test(img));
  assert.ok(!/base64|data:/.test(img));
});

test("buscador: pocket pass y pase al roll llegan a la misma ficha", () => {
  assert.equal(Cat.search({ q: "Pocket pass" })[0].id, "pocket");
  assert.equal(Cat.search({ q: "pase al roll" })[0].id, "pocket");
});

test("las tarjetas de video no piden la miniatura de YouTube", () => {
  for (const v of Videos.VIDEOS) {
    const html = Videos.renderCard(v.id, { conceptId: v.concepts[0].id, poster: true });
    assert.ok(!/ytimg|img\.youtube|<iframe/.test(html), v.id);
  }
});
