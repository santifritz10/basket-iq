#!/usr/bin/env node
/*
 * Comprobación manual de videos y fuentes de Fundamentos.
 *
 *   node scripts/check-media-links.mjs            # informe en consola
 *   node scripts/check-media-links.mjs --json     # informe en JSON
 *
 * - Videos de YouTube: consulta el oEmbed público (sin clave ni servicio pago).
 *   200 = existe, es público y permite inserción; 401 = inserción desactivada por el
 *   propietario; 404 = eliminado o privado. No detecta restricciones por país o edad.
 * - Fuentes bibliográficas de las fichas: pide la URL y reporta el código HTTP.
 *
 * Se corre a mano (o en un job programado), nunca durante la visita de un usuario.
 * No modifica archivos: si algo falla, se actualiza a mano el estado en
 * js/video-catalog.js (availability / embed / check.date) o la fuente en la ficha.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Videos = require("../js/video-catalog.js");
const Cat = require("../js/fundamentos-catalog.js");
const fichas = ["crossover", "catch-shoot", "bandeja", "closeout"].map((f) => require(`../js/academy-content/fund-${f}.js`));

async function status(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", headers: { "user-agent": "BasketLab-link-check" } });
    return res.status;
  } catch (e) {
    return `error: ${e.cause?.code || e.message}`;
  }
}

function videoVerdict(code) {
  if (code === 200) return "ok (existe, público, permite inserción)";
  if (code === 401 || code === 403) return "INSERCIÓN BLOQUEADA → embed: \"blocked\" (se muestra solo el enlace)";
  if (code === 404) return "NO DISPONIBLE → availability: \"removed\"";
  return "sin respuesta clara: revisar a mano";
}

const report = { checkedAt: new Date().toISOString(), videos: [], sources: [] };

for (const v of Videos.VIDEOS) {
  if (v.platform !== "youtube") continue;
  const code = await status(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.externalId}`)}`);
  report.videos.push({ id: v.id, externalId: v.externalId, code, verdict: videoVerdict(code), catalog: { availability: v.availability, embed: v.embed, lastCheck: v.check.date } });
}

const seen = new Set();
for (const a of fichas) {
  for (const s of a.sources) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    report.sources.push({ url: s.url, title: s.title, code: await status(s.url) });
  }
}
for (const u of Object.values(Cat.UNAVAILABLE)) {
  if (seen.has(u.url)) continue;
  seen.add(u.url);
  report.sources.push({ url: u.url, title: u.title, code: await status(u.url), note: "fuente marcada como no consultada" });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Comprobación ${report.checkedAt}\n\nVideos:`);
  for (const v of report.videos) console.log(`  ${v.id} (${v.externalId}): ${v.code} → ${v.verdict}`);
  console.log("\nFuentes:");
  for (const s of report.sources) console.log(`  ${s.code}  ${s.title}\n        ${s.url}${s.note ? `  (${s.note})` : ""}`);
}
