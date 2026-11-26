/**
 * Contexto de Basket Lab Academy para el asistente.
 *
 * Funciones puras (sin servidor ni navegador) que arman el texto que recibe
 * Gemini cuando el entrenador usa "Analizar con mi Asistente IA":
 * - el concepto y su contenido educativo, con la procedencia de cada parte,
 * - el ejercicio elegido y su compatibilidad con las condiciones del entrenador,
 * - el momento del simulador, cuando corresponde,
 * - las fuentes verificadas (y las que no se pudieron consultar),
 * - un resumen de la categoría elegida, armado con datos guardados del entrenador.
 *
 * El navegador solo manda identificadores. El contenido sale de los módulos de
 * js/academy-content y los datos de la categoría se leen en el servidor, así que
 * no se puede inyectar texto haciéndolo pasar por contenido verificado.
 */

export const ACADEMY_CONTEXT_LIMITS = {
  articleChars: 9000,
  exerciseChars: 3500,
  simulatorChars: 2500,
  categoryChars: 2000,
  questionHintChars: 120
};

const KIND_LABELS = {
  official: "Fuente oficial",
  interpretation: "Interpretación técnica de BasketIQ",
  method: "Método BasketIQ",
  variant: "Variante de la app"
};

// Orden de prioridad de las secciones de Aprender cuando hay que recortar.
const SECTION_PRIORITY = [
  "definicion",
  "principios",
  "responsabilidades",
  "errores",
  "correcciones",
  "adaptaciones",
  "metodologia",
  "progresiones",
  "limitaciones",
  "objetivos",
  "aplicacion",
  "ventajas",
  "variantes",
  "explicacion",
  "introduccion"
];

const ID_RE = /^[a-z0-9][a-z0-9-]{0,60}$/i;
const COURTS = ["half", "full"];

function clean(text) {
  return String(text == null ? "" : text).replace(/\s+/g, " ").trim();
}

function cut(text, max) {
  const t = String(text || "");
  return t.length > max ? t.slice(0, Math.max(0, max - 1)).trimEnd() + "…" : t;
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] || KIND_LABELS.method;
}

/** Convierte los bloques de una sección del artículo en texto plano. */
export function blocksToText(blocks) {
  const out = [];
  for (const b of blocks || []) {
    if (!b) continue;
    if (b.h) out.push(clean(b.h) + ":");
    else if (b.p) out.push(clean(b.p));
    else if (b.callout) out.push((b.title ? clean(b.title) + ": " : "") + clean(b.callout));
    else if (Array.isArray(b.list)) b.list.forEach((x, i) => out.push((b.ordered ? i + 1 + ". " : "- ") + clean(x)));
    else if (Array.isArray(b.checklist)) b.checklist.forEach((x) => out.push("- " + clean(x)));
    else if (b.table) {
      const t = b.table;
      if (t.caption) out.push(clean(t.caption) + ":");
      const head = t.head || [];
      (t.rows || []).forEach((row) => {
        out.push("- " + row.map((cell, i) => (head[i] ? clean(head[i]) + ": " : "") + clean(cell)).join(" | "));
      });
    } else if (b.qa) out.push("P: " + clean(b.qa) + " R: " + (b.answer || []).map(clean).join(" "));
  }
  return out.join("\n");
}

/**
 * Valida el pedido de contexto que llega del navegador. Solo acepta
 * identificadores y condiciones acotadas; nunca texto de contenido.
 */
export function parseAcademyRef(raw) {
  if (raw == null) return { ok: true, data: null };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "El contexto de Academy no es válido." };
  const id = (v) => (v == null || v === "" ? null : typeof v === "string" && ID_RE.test(v) ? v : undefined);
  const data = {
    articleId: id(raw.articleId),
    exerciseId: id(raw.exerciseId),
    adaptationId: id(raw.adaptationId),
    variantId: id(raw.variantId),
    positionId: id(raw.positionId),
    categoria: null,
    conditions: null
  };
  if (Object.values(data).some((v) => v === undefined) || !data.articleId) {
    return { ok: false, error: "El contexto de Academy no es válido." };
  }
  if (raw.categoria != null && raw.categoria !== "") {
    const c = clean(raw.categoria);
    if (!c || c.length > 60) return { ok: false, error: "La categoría no es válida." };
    data.categoria = c;
  }
  if (raw.conditions != null) {
    const c = raw.conditions;
    if (typeof c !== "object" || Array.isArray(c)) return { ok: false, error: "Las condiciones no son válidas." };
    const num = (v, max) => (v == null || v === "" ? null : Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : undefined);
    const cond = {
      players: num(c.players, 60),
      hoops: num(c.hoops, 12),
      minutes: num(c.minutes, 300),
      court: c.court == null || c.court === "" ? null : COURTS.includes(c.court) ? c.court : undefined,
      materials: Array.isArray(c.materials) ? c.materials.slice(0, 12).map((m) => cut(clean(m), 40)).filter(Boolean) : []
    };
    if (Object.values(cond).some((v) => v === undefined)) return { ok: false, error: "Las condiciones no son válidas." };
    data.conditions = cond;
  }
  return { ok: true, data };
}

function sourcesText(article) {
  const used = (article.sources || []).map((s) =>
    `[${s.id}] ${clean(s.title)} — ${clean(s.publisher)}${s.locator ? ", " + clean(s.locator) : ""}. ${s.url || ""}`.trim()
  );
  const missing = (article.unavailableSources || []).map((s) => `- ${clean(s.title)}: ${clean(s.reason)}`);
  let text = "Fuentes verificadas de esta guía (las únicas que podés citar, con su identificador):\n" + (used.join("\n") || "(ninguna)");
  if (missing.length) text += "\nFuentes que BasketIQ no pudo consultar (no las cites ni digas que las leíste):\n" + missing.join("\n");
  return text;
}

function articleText(article, maxChars) {
  const sections = (article.tabs && article.tabs.aprender) || [];
  const ordered = sections
    .slice()
    .sort((a, b) => {
      const ia = SECTION_PRIORITY.indexOf(a.id);
      const ib = SECTION_PRIORITY.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  const parts = [];
  let used = 0;
  const omitted = [];
  // Se reserva lugar para la nota de secciones omitidas.
  maxChars -= 300;
  for (const s of ordered) {
    const body = blocksToText(s.blocks);
    const chunk = `## ${clean(s.title)} (${kindLabel(s.kind)}${s.refs && s.refs.length ? "; " + s.refs.join(", ") : ""})\n${body}`;
    if (used + chunk.length > maxChars) {
      const room = maxChars - used;
      if (room > 400) {
        parts.push(cut(chunk, room));
        used = maxChars;
      } else omitted.push(clean(s.title));
      continue;
    }
    parts.push(chunk);
    used += chunk.length + 2;
  }
  if (omitted.length) parts.push(`(Secciones no incluidas por espacio: ${omitted.join(", ")}.)`);
  return parts.join("\n\n");
}

const EXERCISE_FIELDS = [
  ["objective", "Objetivo"],
  ["secondary", "Objetivos secundarios"],
  ["category", "Categoría sugerida"],
  ["level", "Nivel"],
  ["players", "Jugadores"],
  ["duration", "Duración"],
  ["space", "Espacio"],
  ["hoops", "Aros"],
  ["materials", "Material"],
  ["organization", "Organización"],
  ["development", "Desarrollo"],
  ["rules", "Reglas"],
  ["cues", "Consignas"],
  ["errors", "Errores frecuentes"],
  ["corrections", "Correcciones"],
  ["variants", "Variantes"],
  ["progressions", "Progresiones"],
  ["regressions", "Regresiones"],
  ["evaluation", "Evaluación"],
  ["basis", "Fundamento"]
];

function exerciseText(ex) {
  const lines = [`Ejercicio: ${clean(ex.name)} (${kindLabel(ex.kind || "method")}${ex.refs && ex.refs.length ? "; " + ex.refs.join(", ") : ""})`];
  for (const [key, label] of EXERCISE_FIELDS) {
    const v = ex[key];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
    lines.push(`${label}: ${Array.isArray(v) ? v.map(clean).join("; ") : clean(v)}`);
  }
  (ex.adaptations || []).forEach((a) => lines.push(`Adaptación «${clean(a.label)}»: ${clean(a.text)}`));
  return lines.join("\n");
}

function conditionsText(cond) {
  if (!cond) return "";
  const parts = [];
  if (cond.players != null) parts.push(`${cond.players} jugadores`);
  if (cond.court) parts.push(cond.court === "half" ? "media cancha" : "cancha completa");
  if (cond.hoops != null) parts.push(`${cond.hoops} aro(s)`);
  if (cond.minutes != null) parts.push(`${cond.minutes} minutos`);
  if (cond.materials && cond.materials.length) parts.push(`material: ${cond.materials.join(", ")}`);
  return parts.join(", ");
}

/** Revisión local de compatibilidad (la misma de "Añadir al entrenamiento"). */
function compatibilityText(ex, cond, exercisesApi) {
  if (!cond || !exercisesApi || typeof exercisesApi.checkCompatibility !== "function") return "";
  const env = { players: cond.players, court: cond.court, hoops: cond.hoops, materials: cond.materials };
  const r = exercisesApi.checkCompatibility(ex, env);
  const lines = [`Revisión automática de BasketIQ con las condiciones del entrenador (${conditionsText(cond) || "sin datos"}):`];
  if (r.ok && !r.issues.length) lines.push("- Compatible.");
  r.issues.forEach((i) => lines.push(`- ${i.soft ? "Aviso" : "Incompatible"}: ${clean(i.text)}`));
  if (r.unknown.length) lines.push(`- Sin datos para revisar: ${r.unknown.join(", ")}.`);
  if (r.alternatives.length) lines.push(`- Adaptaciones de la guía que sí son compatibles: ${r.alternatives.map((a) => "«" + clean(a.label) + "»").join(", ")}.`);
  else if (!r.ok) lines.push("- Ninguna adaptación de la guía resuelve la incompatibilidad: hay que proponer una nueva y aclararlo.");
  if (cond.minutes != null && ex.meta && Array.isArray(ex.meta.minutes)) {
    const [a, b] = ex.meta.minutes;
    if (cond.minutes < a) lines.push(`- Aviso: el ejercicio está pensado para ${a} a ${b} minutos y hay ${cond.minutes}.`);
  }
  return lines.join("\n");
}

function simulatorText(sim, variantId, positionId, simApi) {
  if (!sim || !simApi || typeof simApi.resolveState !== "function") return "";
  const r = simApi.resolveState(sim, variantId, positionId);
  if (!r || !r.state) return "";
  const v = r.variant;
  const st = r.state;
  const ui = sim.ui || {};
  const pos = (sim.positions || []).find((p) => p.id === positionId);
  const lines = [
    `Simulador «${clean(sim.title)}». ${clean(ui.variants || "Variante")}: ${clean(v.label)} (${kindLabel(v.kind)}${v.refs && v.refs.length ? "; " + v.refs.join(", ") : ""}). ${clean(v.desc)}`,
    `${clean(ui.positions || "Situación")}: ${pos ? clean(pos.label) : positionId} — ${clean(st.title)}. ${clean(st.note)}`
  ];
  const resp = st.resp || {};
  Object.keys(resp).forEach((id) => {
    const p = sim.players && sim.players[id];
    lines.push(`- ${p && p.team === "defense" ? "X" : ""}${p ? p.label : id}: ${clean(resp[id])}`);
  });
  if (st.help) lines.push(`${clean(ui.help || "Fundamento")}: ${clean(st.help)}`);
  (st.optionsText || []).forEach((t) => lines.push(`- Opción: ${clean(t)}`));
  (st.vulnerable || []).forEach((z) => lines.push(`- Espacio vulnerable «${clean(z.label)}»: ${clean(z.text)}`));
  if (ui.disclaimer) lines.push(`Aclaración del simulador: ${clean(ui.disclaimer)}`);
  return lines.join("\n");
}

/**
 * Resumen de la categoría con datos guardados por el entrenador: planificación
 * anual y entrenamientos recientes. No incluye nombres de jugadores ni notas libres.
 */
export function summarizeCategory({ categoria, trainings = [], plans = [], today = new Date() } = {}) {
  if (!categoria) return "";
  const key = clean(categoria).toLowerCase();
  const same = (v) => clean(v).toLowerCase() === key;
  const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10));
  const now = iso(today);
  const lines = [`Categoría elegida por el entrenador: ${clean(categoria)}.`];

  const myPlans = (Array.isArray(plans) ? plans : []).filter((p) => p && same(p.categoria));
  if (myPlans.length) {
    const plan = myPlans.slice().sort((a, b) => Number(b.temporada || 0) - Number(a.temporada || 0))[0];
    lines.push(`Planificación anual: «${cut(clean(plan.nombre) || "sin nombre", 80)}», temporada ${clean(plan.temporada)}.`);
    const ciclo = (plan.ciclos || []).find((c) => c && c.fecha_inicio <= now && now <= c.fecha_fin);
    if (ciclo) {
      lines.push(`Ciclo actual: ${clean(ciclo.nombre)} (${ciclo.fecha_inicio} a ${ciclo.fecha_fin}).`);
      if (clean(ciclo.objetivo_principal)) lines.push(`Objetivo principal del ciclo: ${cut(clean(ciclo.objetivo_principal), 300)}`);
      if (clean(ciclo.fundamentos_trabajados)) lines.push(`Fundamentos del ciclo: ${cut(clean(ciclo.fundamentos_trabajados), 300)}`);
    }
  } else {
    lines.push("No hay planificación anual guardada para esta categoría.");
  }

  const myTrainings = (Array.isArray(trainings) ? trainings : [])
    .filter((t) => t && same(t.categoria))
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  if (myTrainings.length) {
    lines.push(`Entrenamientos guardados de esta categoría: ${myTrainings.length}. Los más recientes:`);
    myTrainings.slice(0, 3).forEach((t) => {
      const blocks = Array.isArray(t.bloques) ? t.bloques : [];
      const total = blocks.reduce((s, b) => s + (Number(b && b.duracion_minutos) || 0), 0);
      const names = blocks.map((b) => cut(clean(b && (b.titulo || b.nombre)), 50)).filter(Boolean).slice(0, 6);
      const cond = t.condiciones
        ? conditionsText({
            players: t.condiciones.jugadores ?? null,
            court: t.condiciones.espacio || null,
            hoops: t.condiciones.aros ?? null,
            minutes: null,
            materials: t.condiciones.materiales || []
          })
        : "";
      lines.push(`- ${clean(t.fecha) || "sin fecha"} · ${cut(clean(t.nombre) || "sin nombre", 60)} · ${total} min${cond ? " · " + cond : ""}${names.length ? " · bloques: " + names.join("; ") : ""}`);
    });
  } else {
    lines.push("No hay entrenamientos guardados de esta categoría.");
  }
  return cut(lines.join("\n"), ACADEMY_CONTEXT_LIMITS.categoryChars);
}

/**
 * Arma las secciones de contexto para el prompt. Devuelve
 * { sections: [{title, content}], label } o lanza un error si el contenido no existe.
 */
export function buildAcademyContext({ ref, articles, exercisesApi = null, simApi = null, categorySummary = "" }) {
  if (!ref) return { sections: [], label: "" };
  const article = (articles || []).find((a) => a && a.id === ref.articleId);
  if (!article) {
    const err = new Error("No encontramos ese contenido de Academy.");
    err.code = "academy_not_found";
    throw err;
  }
  const ex = ref.exerciseId ? (article.exercises || []).find((e) => e.id === ref.exerciseId) : null;
  if (ref.exerciseId && !ex) {
    const err = new Error("No encontramos ese ejercicio.");
    err.code = "academy_not_found";
    throw err;
  }
  const sim = article.simulator || null;
  const hasSim = Boolean(sim && ref.variantId && ref.positionId &&
    (sim.variants || []).some((v) => v.id === ref.variantId) &&
    (sim.positions || []).some((p) => p.id === ref.positionId));

  const intro = [
    `El entrenador está estudiando «${clean(article.title)}» (${clean(article.sectionLabel)}) en Basket Lab Academy y te consulta desde ahí.`,
    "Usá este contenido como base. Cada parte indica su procedencia: no presentes como oficial lo que es interpretación, método o variante de BasketIQ.",
    "Cuando te apoyes en una fuente, citala con su identificador entre corchetes, por ejemplo [S1], y solo si figura en la lista de fuentes verificadas. Si algo no está en el contenido, decilo y separá tu propia interpretación.",
    "Respetá la filosofía del entrenador, pero cuestioná con argumentos lo que no encaje con el contenido, la categoría o las condiciones."
  ].join("\n");

  const head = intro + "\n\n" + `${clean(article.title)}: ${clean(article.subtitle)}\n\n`;
  const sections = [
    { title: "Contexto de Basket Lab Academy", content: head + articleText(article, ACADEMY_CONTEXT_LIMITS.articleChars - head.length) },
    { title: "Fuentes", content: sourcesText(article) }
  ];
  if (ex) {
    let content = cut(exerciseText(ex), ACADEMY_CONTEXT_LIMITS.exerciseChars);
    const compat = compatibilityText(ex, ref.conditions, exercisesApi);
    if (compat) content += "\n\n" + compat;
    content += "\n\nSi adaptás el ejercicio, explicá qué cambia y por qué, y no modifiques el original: el entrenador decide si lo agrega a su planificación.";
    sections.push({ title: "Ejercicio seleccionado", content });
  }
  if (hasSim) {
    sections.push({ title: "Escenario del simulador", content: cut(simulatorText(sim, ref.variantId, ref.positionId, simApi), ACADEMY_CONTEXT_LIMITS.simulatorChars) });
  }
  if (ref.conditions && !ex) {
    sections.push({ title: "Condiciones de trabajo del entrenador", content: conditionsText(ref.conditions) });
  }
  if (categorySummary) {
    sections.push({
      title: "Datos guardados de la categoría",
      content: categorySummary + "\nSon los únicos datos del equipo que conocés: no supongas otros."
    });
  } else if (ref.categoria) {
    sections.push({ title: "Datos guardados de la categoría", content: `Categoría elegida: ${clean(ref.categoria)}. No hay datos guardados disponibles para esta categoría.` });
  }

  const labelParts = [clean(article.title)];
  if (ex) labelParts.push(clean(ex.name));
  if (hasSim) {
    const v = sim.variants.find((x) => x.id === ref.variantId);
    labelParts.push("Simulador: " + clean(v.label));
  }
  if (ref.categoria) labelParts.push(clean(ref.categoria));
  return { sections, label: labelParts.join(" · ") };
}
