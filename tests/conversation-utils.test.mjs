import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGeminiHistory,
  escapeLikePattern,
  groupConversationsByActivity,
  makeConversationTitle,
  normalizeTitle
} from "../lib/assistant/conversation-utils.js";

test("título automático: primera oración, sin saludo", () => {
  assert.equal(
    makeConversationTitle("Hola, necesito organizar un entrenamiento de 90 minutos para U15. Tengo 12 jugadores."),
    "Necesito organizar un entrenamiento de 90 minutos para U15"
  );
  assert.equal(makeConversationTitle("¿Qué ventajas tiene defender el pick and roll con cambios?"), "Qué ventajas tiene defender el pick and roll con cambios");
});

test("título automático: corta en palabra y agrega …", () => {
  const t = makeConversationTitle("quiero implementar una defensa zonal dos tres con mi equipo de primera división este fin de semana largo");
  assert.ok(t.length <= 61, t);
  assert.ok(t.endsWith("…"));
  assert.match(t, /^Quiero implementar/);
  assert.doesNotMatch(t, /\s…$/);
});

test("título automático: texto vacío o solo símbolos", () => {
  assert.equal(makeConversationTitle(""), "Nueva conversación");
  assert.equal(makeConversationTitle("   ***   "), "Nueva conversación");
  assert.equal(makeConversationTitle("hola"), "Hola");
});

test("normalizeTitle recorta y limpia espacios", () => {
  assert.equal(normalizeTitle("  U13   temporada  "), "U13 temporada");
  assert.equal(normalizeTitle("   "), "");
  assert.equal(normalizeTitle("x".repeat(300)).length, 120);
});

test("historial: arranca con el entrenador y respeta límites", () => {
  const msgs = [
    { role: "model", text: "a" },
    { role: "user", text: "b" },
    { role: "model", text: "c" },
    { role: "user", text: "d" }
  ];
  assert.deepEqual(buildGeminiHistory(msgs).map((m) => m.text), ["b", "c", "d"]);
  const long = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "model" : "user", text: `m${i}` }));
  const h = buildGeminiHistory(long, { maxMessages: 20 });
  assert.ok(h.length <= 20);
  assert.equal(h[0].role, "user");
  const big = [
    { role: "user", text: "x".repeat(10) },
    { role: "model", text: "y".repeat(30000) },
    { role: "user", text: "z" }
  ];
  assert.deepEqual(buildGeminiHistory(big, { maxChars: 24000 }).map((m) => m.text), ["z"]);
});

test("escapeLikePattern escapa comodines", () => {
  assert.equal(escapeLikePattern("50%_a\\b"), "50\\%\\_a\\\\b");
});

test("agrupa por actividad reciente", () => {
  const now = new Date("2026-11-25T15:00:00");
  const groups = groupConversationsByActivity(
    [
      { id: "1", lastMessageAt: "2026-11-25T10:00:00" },
      { id: "2", lastMessageAt: "2026-11-24T10:00:00" },
      { id: "3", lastMessageAt: "2026-11-20T10:00:00" },
      { id: "4", lastMessageAt: "2026-10-01T10:00:00" }
    ],
    now
  );
  assert.deepEqual(groups.map((g) => [g.id, g.items.map((i) => i.id)]), [
    ["today", ["1"]],
    ["yesterday", ["2"]],
    ["week", ["3"]],
    ["older", ["4"]]
  ]);
});
