/**
 * Inteligencia e informes: resumen del jugador a partir de datos REALIZADOS y registrados.
 * Funciones puras. Nada se inventa: cada número sale de un registro y cada señal dice en qué se basa.
 * El resumen NO incluye nombre, fecha de nacimiento, equipo ni datos de contacto (se comparte
 * con Gemini solo a pedido del entrenador).
 */
import { DIMENSIONS } from "./catalog.js";
import { criteriaCatalog, aggregateStats, dimensionSummary } from "./model.js";
import { formatValue, inPeriod, isStructured, labelOf, measureGoal, periodSummary, shootingDays, visibleNotes, NOTE_TYPES } from "./goals.js";
import { PLAN_KINDS, attendanceSummary } from "./plan.js";
import { zoneById } from "../shooting/model.js";

export const REPORT_TYPES = [
  { id: "weekly", label: "Semanal", days: 7 },
  { id: "monthly", label: "Mensual", days: 30 },
  { id: "quarterly", label: "Trimestral", days: 90 },
  { id: "season", label: "Final de temporada", days: 300 },
  { id: "followup", label: "Seguimiento individual", days: 60 }
];

export const REPORT_SECTIONS = [
  { id: "summary", label: "Resumen" },
  { id: "assessments", label: "Evaluaciones" },
  { id: "stats", label: "Estadísticas" },
  { id: "training", label: "Entrenamientos" },
  { id: "evolution", label: "Evolución" },
  { id: "goals", label: "Objetivos" },
  { id: "notes", label: "Observaciones" },
  { id: "recommendations", label: "Recomendaciones" }
];

export const REPORT_STATUS = [
  { id: "draft", label: "Borrador" },
  { id: "shared", label: "Compartido" },
  { id: "archived", label: "Archivado" }
];

/** Preguntas sugeridas para el Asistente (las del pedido original). */
export const ASK_PRESETS = [
  { id: "evolution", text: "¿Cómo evolucionó este jugador en el período?" },
  { id: "priorities", text: "¿Qué aspectos conviene priorizar?" },
  { id: "exercises", text: "¿Qué ejercicios puedo utilizar para trabajar sus objetivos?" },
  { id: "volume", text: "¿Está mejorando realmente su efectividad o solamente aumentó el volumen?" },
  { id: "training_vs_match", text: "¿Qué diferencias hay entre su rendimiento entrenando y compitiendo?" },
  { id: "missing", text: "¿Qué información me falta para realizar una evaluación más confiable?" }
];

const GOAL_STATUS = { active: "activo", completed: "cumplido", archived: "archivado" };
const MIN_SHOTS = 20; // muestra mínima por zona / período (la misma de Shooting Lab)
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const n1 = (v) => (v == null ? "—" : Number(v).toLocaleString("es-AR", { maximumFractionDigits: 1 }));
const p1 = (v) => (v == null ? "—" : `${n1(v)}%`);

export function shiftDate(iso, deltaDays) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
}

const pct = (made, att) => (att ? Math.round((made / att) * 1000) / 10 : null);
const line = (l) => ({ made: l.made, attempts: l.attempts ?? l.att ?? 0, pct: pct(l.made, l.attempts ?? l.att ?? 0) });

/** Valida un período { from, to } (fechas ISO, from <= to <= hoy, hasta 2 años). */
export function validatePeriod(from, to, today) {
  if (!ISO.test(String(from || "")) || !ISO.test(String(to || ""))) return "Fechas inválidas.";
  if (from > to) return "La fecha de inicio es posterior a la de fin.";
  if (to > today) return "El período no puede terminar en el futuro.";
  if (daysBetween(from, to) > 731) return "El período puede ser de hasta dos años.";
  return null;
}

export function defaultPeriod(type, today) {
  const t = REPORT_TYPES.find((r) => r.id === type) || REPORT_TYPES[1];
  return { from: shiftDate(today, -(t.days - 1)), to: today };
}

/** Quita el nombre del jugador de un texto libre (para no enviarlo a Gemini). */
export function scrubName(text, player) {
  let out = String(text || "");
  const parts = [player?.display_name, ...(String(player?.display_name || "").split(/\s+/))]
    .map((p) => String(p || "").trim())
    .filter((p) => p.length >= 3)
    .sort((a, b) => b.length - a.length);
  parts.forEach((p) => {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "el jugador");
  });
  return out;
}

function assessmentBlock(profile, from, to) {
  const catalog = criteriaCatalog(profile.criteria || []);
  const all = (profile.assessments || []).filter((a) => !a.voided_at && a.assessed_on <= to);
  const before = all.filter((a) => a.assessed_on < from);
  const inside = all.filter((a) => a.assessed_on >= from);
  const now = dimensionSummary(all, catalog);
  const prev = dimensionSummary(before, catalog);
  const dims = now
    .filter((d) => d.evaluated)
    .map((d) => {
      const p = prev.find((x) => x.dimension.id === d.dimension.id);
      return { id: d.dimension.id, label: d.dimension.label, score: d.score, previous: p?.evaluated ? p.score : null, lastDate: d.lastDate, criteria: d.latest.length };
    });
  const dates = [...new Set(inside.map((a) => a.assessed_on))].sort();
  return {
    evaluationsInPeriod: new Set(inside.map((a) => a.batch_id)).size,
    lastDate: all.reduce((m, a) => (a.assessed_on > m ? a.assessed_on : m), "") || null,
    dates,
    dims,
    notEvaluated: DIMENSIONS.filter((d) => !dims.some((x) => x.id === d.id)).map((d) => d.label)
  };
}

function shootingBlock(profile, from, to) {
  const days = shootingDays(profile);
  const sum = periodSummary(profile, { from, to, days });
  const mid = shiftDate(from, Math.floor(daysBetween(from, to) / 2));
  const first = periodSummary(profile, { from, to: mid, days });
  const second = periodSummary(profile, { from: shiftDate(mid, 1), to, days });
  const zones = Object.entries(sum.shooting.byZone)
    .filter(([, l]) => l.attempts > 0)
    .map(([id, l]) => ({ id, label: zoneById(id)?.label || id, made: l.made, attempts: l.attempts, pct: pct(l.made, l.attempts), enough: l.attempts >= MIN_SHOTS }))
    .sort((a, b) => b.attempts - a.attempts);
  return {
    sessions: sum.sessions,
    attempts: sum.attempts,
    fg: line(sum.shooting.fg),
    two: line(sum.shooting.two),
    three: line(sum.shooting.three),
    ft: line(sum.shooting.ft),
    zones,
    halves: [
      { from, to: mid, sessions: first.sessions, attempts: first.shooting.fg.attempts, pct: pct(first.shooting.fg.made, first.shooting.fg.attempts) },
      { from: shiftDate(mid, 1), to, sessions: second.sessions, attempts: second.shooting.fg.attempts, pct: pct(second.shooting.fg.made, second.shooting.fg.attempts) }
    ]
  };
}

function statsBlock(profile, from, to) {
  const records = (profile.stats || []).filter((r) => !r.voided_at && inPeriod(r.played_on, from, to));
  const m = aggregateStats(records, "match");
  const t = aggregateStats(records, "training");
  return {
    matches: m.count,
    match: { averages: m.averages, fg: line(m.fg), fg3: line(m.fg3), ft: line(m.ft), minutes: m.averages.minutes ?? null },
    trainingRecords: t.count,
    training: { fg: line(t.fg), fg3: line(t.fg3), ft: line(t.ft) }
  };
}

function goalsBlock(profile, from, to, today) {
  const criteria = criteriaCatalog(profile.criteria || []);
  return (profile.goals || [])
    .filter((g) => g.status === "active" || (g.status === "completed" && (!g.achieved_at || String(g.achieved_at).slice(0, 10) >= from)))
    .map((g) => {
      if (!isStructured(g) || !g.metric_key) {
        return { title: g.title || g.body, status: g.status, measurable: false, due: g.due_on || null };
      }
      const m = measureGoal(g, profile, { today, criteria });
      return {
        title: g.title || g.body,
        status: g.status,
        measurable: true,
        metric: m.metric?.label || null,
        unit: g.unit || m.metric?.unit || "",
        baseline: g.baseline_value == null ? null : Number(g.baseline_value),
        target: g.target_value == null ? null : Number(g.target_value),
        value: m.value,
        sample: m.sample,
        sampleUnit: m.sampleUnit,
        minSample: m.minSample,
        enough: m.enough,
        progress: m.progress == null ? null : Math.round(m.progress * 100),
        reached: m.reached,
        overdue: m.overdue,
        due: g.due_on || null,
        priority: g.priority || null
      };
    });
}

function planBlock(profile, from, to) {
  const items = (profile.planItems || []).filter((it) => it.status !== "cancelled");
  const done = items.filter((it) => it.status === "done" && inPeriod(it.done_on, from, to));
  const skipped = items.filter((it) => it.status === "skipped" && inPeriod(it.planned_on || String(it.updated_at || "").slice(0, 10), from, to));
  const pending = items.filter((it) => it.status === "planned");
  const att = attendanceSummary(profile.attendance || [], { from, to });
  return {
    done: done.length,
    skipped: skipped.length,
    pending: pending.length,
    doneTitles: done.slice(0, 8).map((it) => `${it.title} (${labelOf(PLAN_KINDS, it.kind)})`),
    attendance: att
  };
}

function notesBlock(profile, from, to, viewerId) {
  return visibleNotes(profile.notes || [], viewerId)
    .filter((n) => n.visibility !== "private" && inPeriod(String(n.related_on || n.created_at).slice(0, 10), from, to))
    .slice(0, 8)
    .map((n) => ({ date: String(n.related_on || n.created_at).slice(0, 10), type: labelOf(NOTE_TYPES, n.note_type || "general"), text: scrubName(String(n.body || "").slice(0, 300), profile.player) }));
}

/**
 * Resumen estructurado y minimizado del jugador en un período.
 * includeNotes: solo notas NO privadas, recortadas y sin el nombre del jugador.
 */
export function buildDigest(profile, { from, to, today, includeNotes = false, viewerId = null } = {}) {
  const p = profile.player || {};
  const digest = {
    period: { from, to, days: daysBetween(from, to) + 1 },
    player: { age: p.age ?? null, position: p.position || null, category: p.category || null },
    assessments: assessmentBlock(profile, from, to),
    shooting: shootingBlock(profile, from, to),
    stats: statsBlock(profile, from, to),
    goals: goalsBlock(profile, from, to, today),
    plan: planBlock(profile, from, to),
    notes: includeNotes ? notesBlock(profile, from, to, viewerId) : null
  };
  digest.signals = signals(digest);
  digest.gaps = gaps(digest, today);
  return digest;
}

/** Señales calculadas (datos observados + cómo se calcularon). Nunca diagnósticos. */
export function signals(d) {
  const out = [];
  const [h1, h2] = d.shooting.halves;
  if (h1.attempts >= 2 * MIN_SHOTS && h2.attempts >= 2 * MIN_SHOTS) {
    const vol = h1.attempts ? Math.round(((h2.attempts - h1.attempts) / h1.attempts) * 100) : null;
    const diff = Math.round((h2.pct - h1.pct) * 10) / 10;
    let verdict;
    if (Math.abs(diff) < 3) verdict = vol != null && vol >= 20 ? "Subió el volumen pero la efectividad se mantiene estable." : "Volumen y efectividad estables.";
    else if (diff > 0) verdict = "La efectividad de campo mejoró entre la primera y la segunda mitad del período.";
    else verdict = "La efectividad de campo bajó entre la primera y la segunda mitad del período.";
    out.push({ id: "volume_vs_pct", text: `${verdict.replace(/\.$/, "")} (${h1.attempts} → ${h2.attempts} lanzamientos de campo; ${p1(h1.pct)} → ${p1(h2.pct)}).`, basis: "Sesiones de tiro registradas, por mitades del período." });
  } else if (d.shooting.attempts) {
    out.push({ id: "volume_vs_pct", text: "No alcanza la muestra para separar volumen de efectividad (hacen falta al menos 40 lanzamientos de campo en cada mitad del período).", basis: "Sesiones de tiro registradas.", insufficient: true });
  }
  const tr = d.shooting.fg;
  const mt = d.stats.match.fg;
  if (tr.attempts >= MIN_SHOTS && mt.attempts >= MIN_SHOTS) {
    const gap = Math.round((tr.pct - mt.pct) * 10) / 10;
    out.push({
      id: "training_vs_match",
      text: `Campo entrenando ${p1(tr.pct)} (${tr.made}/${tr.attempts}) vs. compitiendo ${p1(mt.pct)} (${mt.made}/${mt.attempts}): diferencia de ${gap > 0 ? "+" : ""}${n1(gap)} puntos.`,
      basis: "Entrenando: sesiones de tiro (sin defensa, en general). Compitiendo: planillas de partido. No son situaciones equivalentes."
    });
  } else if (tr.attempts || mt.attempts) {
    out.push({ id: "training_vs_match", text: "No hay muestra suficiente para comparar entrenamiento y competencia (mínimo 20 lanzamientos de campo en cada uno).", basis: "Sesiones de tiro y planillas de partido.", insufficient: true });
  }
  d.shooting.zones
    .filter((z) => z.enough && z.id !== "ft")
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 1)
    .forEach((z) => out.push({ id: "weak_zone", text: `Zona con menor efectividad (con muestra suficiente): ${z.label}, ${p1(z.pct)} (${z.made}/${z.attempts}).`, basis: "Sesiones de tiro registradas." }));
  const low = d.assessments.dims.filter((x) => x.score != null).sort((a, b) => a.score - b.score)[0];
  if (low && low.score <= 60) out.push({ id: "low_dimension", text: `Fundamento con evaluación más baja: ${low.label} (${low.score}%, evaluado el ${low.lastDate}).`, basis: "Última evaluación del entrenador (subjetiva)." });
  d.assessments.dims
    .filter((x) => x.previous != null && x.score != null && Math.abs(x.score - x.previous) >= 10)
    .forEach((x) => out.push({ id: `dim_change_${x.id}`, text: `${x.label}: ${x.previous}% → ${x.score}% respecto de la evaluación anterior al período.`, basis: "Evaluaciones del entrenador." }));
  d.goals.filter((g) => g.overdue).forEach((g) => out.push({ id: "goal_overdue", text: `Objetivo vencido sin confirmar: ${g.title}.`, basis: "Fecha límite del objetivo." }));
  d.goals.filter((g) => g.measurable && g.status === "active" && g.reached).forEach((g) => out.push({ id: "goal_reached", text: `Objetivo con la meta alcanzada y muestra suficiente (falta que lo confirmes): ${g.title}.`, basis: "Medición automática con datos realizados." }));
  const a = d.plan.attendance;
  if (a.rate != null && a.present + a.partial + a.absent >= 4 && a.rate < 75) out.push({ id: "attendance", text: `Asistencia del ${a.rate}% en el período.`, basis: "Asistencia registrada (los justificados no cuentan)." });
  if (d.plan.skipped >= 3 && d.plan.skipped >= d.plan.done) out.push({ id: "plan_skipped", text: `Más trabajo marcado como «no se hizo» (${d.plan.skipped}) que realizado (${d.plan.done}).`, basis: "Trabajo individual planificado." });
  return out;
}

/** Información que falta para una evaluación más confiable. */
export function gaps(d, today) {
  const out = [];
  if (!d.assessments.lastDate) out.push("No hay evaluaciones de fundamentos registradas.");
  else if (daysBetween(d.assessments.lastDate, today) > 60) out.push(`La última evaluación de fundamentos es del ${d.assessments.lastDate} (más de 60 días).`);
  if (d.assessments.notEvaluated.length && d.assessments.lastDate) out.push(`Fundamentos sin evaluar: ${d.assessments.notEvaluated.join(", ")}.`);
  if (!d.shooting.sessions) out.push("No hay sesiones de tiro registradas en el período.");
  else d.shooting.zones.filter((z) => !z.enough).slice(0, 4).forEach((z) => out.push(`Muestra chica en ${z.label} (${z.attempts} lanzamientos; mínimo ${MIN_SHOTS}).`));
  if (!d.stats.matches) out.push("No hay estadísticas de partido en el período.");
  if (!d.goals.length) out.push("No hay objetivos activos.");
  else if (d.goals.some((g) => !g.measurable)) out.push("Hay objetivos sin métrica: no se pueden medir automáticamente.");
  if (!d.plan.attendance.total) out.push("No hay asistencia registrada en el período.");
  return out;
}

/**
 * Recomendaciones automáticas de Basket Lab a partir de señales. Son propuestas para revisar,
 * no diagnósticos: cada una dice en qué dato se apoya.
 */
export function autoRecommendations(d) {
  const out = [];
  const weak = d.signals.find((s) => s.id === "weak_zone");
  if (weak) out.push(`Asignar el plan de tiro sugerido para priorizar la zona más floja (${weak.text.split(":")[1].split(",")[0].trim()}) y volver a medir con muestra suficiente.`);
  const low = d.signals.find((s) => s.id === "low_dimension");
  if (low) out.push(`Planificar trabajo específico de ${low.text.split(":")[1].split("(")[0].trim()} y reevaluarlo en 4 a 6 semanas.`);
  if (d.signals.some((s) => s.id === "goal_reached")) out.push("Revisar los objetivos con meta alcanzada y, si corresponde, confirmarlos y plantear el siguiente paso.");
  if (d.signals.some((s) => s.id === "goal_overdue")) out.push("Revisar los objetivos vencidos: extender el plazo, ajustar la meta o archivarlos.");
  if (d.signals.some((s) => s.id === "attendance")) out.push("Conversar sobre la asistencia antes de sacar conclusiones de rendimiento.");
  d.gaps.slice(0, 3).forEach((g) => out.push(`Completar datos: ${g.charAt(0).toLowerCase()}${g.slice(1)}`));
  return out;
}

/** Textos iniciales de cada sección del informe (el entrenador los edita). */
export function reportSections(d) {
  const s = d.shooting;
  const st = d.stats;
  const sig = (id) => d.signals.find((x) => x.id === id)?.text;
  const summary = [
    `Período: ${d.period.from} a ${d.period.to} (${d.period.days} días).`,
    s.sessions ? `${s.sessions} sesión(es) de tiro, ${s.attempts} lanzamientos, ${p1(s.fg.pct)} de campo.` : "Sin sesiones de tiro en el período.",
    st.matches ? `${st.matches} partido(s) con estadísticas.` : "Sin partidos registrados.",
    d.plan.attendance.rate != null ? `Asistencia: ${d.plan.attendance.rate}%.` : null,
    d.goals.length ? `${d.goals.filter((g) => g.status === "active").length} objetivo(s) activo(s).` : null
  ].filter(Boolean).join(" ");
  const assessments = d.assessments.dims.length
    ? d.assessments.dims.map((x) => `${x.label}: ${x.score}%${x.previous != null ? ` (antes ${x.previous}%)` : ""}`).join(" · ") + `. Última evaluación: ${d.assessments.lastDate}.`
    : "Sin evaluaciones de fundamentos.";
  const stats = st.matches
    ? `Promedios por partido: ${n1(st.match.averages.points)} pts, ${n1(st.match.averages.reb)} reb, ${n1(st.match.averages.assists)} ast, ${n1(st.match.averages.turnovers)} pérdidas. Campo ${p1(st.match.fg.pct)} (${st.match.fg.made}/${st.match.fg.attempts}), triples ${p1(st.match.fg3.pct)}, libres ${p1(st.match.ft.pct)}.`
    : "Sin estadísticas de partido en el período.";
  const training = [
    s.sessions ? `Tiro: campo ${p1(s.fg.pct)} (${s.fg.made}/${s.fg.attempts}), dobles ${p1(s.two.pct)}, triples ${p1(s.three.pct)}, libres ${p1(s.ft.pct)}.` : null,
    `Trabajo individual: ${d.plan.done} realizado(s), ${d.plan.skipped} no hecho(s), ${d.plan.pending} pendiente(s).`,
    d.plan.attendance.total ? `Asistencia: ${d.plan.attendance.present} presente, ${d.plan.attendance.partial} parcial, ${d.plan.attendance.absent} ausente, ${d.plan.attendance.excused} justificado.` : null
  ].filter(Boolean).join(" ");
  const evolution = [sig("volume_vs_pct"), sig("training_vs_match"), ...d.signals.filter((x) => x.id.startsWith("dim_change_")).map((x) => x.text)].filter(Boolean).join(" ") || "Sin datos suficientes para describir la evolución.";
  const goals = d.goals.length
    ? d.goals
        .map((g) =>
          g.measurable
            ? `${g.title}: ${g.value == null ? "sin datos" : formatValue(g.value, g.unit)}${g.target != null ? ` (meta ${formatValue(g.target, g.unit)})` : ""}${g.enough ? "" : " · muestra insuficiente"}${g.status === "completed" ? " · cumplido" : ""}${g.overdue ? " · vencido" : ""}.`
            : `${g.title} (sin métrica).`
        )
        .join("\n")
    : "Sin objetivos.";
  const notes = d.notes?.length ? d.notes.map((n) => `${n.date} (${n.type}): ${n.text}`).join("\n") : "";
  const recommendations = autoRecommendations(d).map((r) => `- ${r}`).join("\n");
  return { summary, assessments, stats, training, evolution, goals, notes, recommendations };
}

/** Texto compacto para el prompt del Asistente (sin datos identificatorios). */
export function digestToText(d, { library = [] } = {}) {
  const L = [];
  const p = d.player;
  L.push(`Jugador: ${[p.age != null ? `${p.age} años` : null, p.position, p.category ? `categoría ${p.category}` : null].filter(Boolean).join(", ") || "sin datos básicos"}.`);
  L.push(`Período analizado: ${d.period.from} a ${d.period.to} (${d.period.days} días).`);
  L.push("");
  L.push("EVALUACIONES DEL ENTRENADOR (subjetivas, escala convertida a %):");
  if (d.assessments.dims.length) d.assessments.dims.forEach((x) => L.push(`- ${x.label}: ${x.score}%${x.previous != null ? ` (antes del período: ${x.previous}%)` : ""}, ${x.criteria} criterio(s), última ${x.lastDate}`));
  else L.push("- Sin evaluaciones.");
  if (d.assessments.notEvaluated.length) L.push(`- Sin evaluar: ${d.assessments.notEvaluated.join(", ")}`);
  L.push("");
  const s = d.shooting;
  L.push("TIRO EN ENTRENAMIENTO (sesiones registradas, solo tiros atribuidos a este jugador):");
  if (s.sessions) {
    L.push(`- ${s.sessions} sesiones, ${s.attempts} lanzamientos. Campo ${s.fg.made}/${s.fg.attempts} (${p1(s.fg.pct)}), dobles ${s.two.made}/${s.two.attempts}, triples ${s.three.made}/${s.three.attempts}, libres ${s.ft.made}/${s.ft.attempts}.`);
    s.zones.slice(0, 11).forEach((z) => L.push(`- ${z.label}: ${z.made}/${z.attempts} (${p1(z.pct)})${z.enough ? "" : " — muestra insuficiente"}`));
    s.halves.forEach((h, i) => L.push(`- ${i ? "Segunda" : "Primera"} mitad (${h.from} a ${h.to}): ${h.sessions} sesiones, ${h.attempts} tiros de campo, ${p1(h.pct)}`));
  } else L.push("- Sin sesiones en el período.");
  L.push("");
  const st = d.stats;
  L.push("COMPETENCIA (planillas de partido):");
  if (st.matches) {
    const a = st.match.averages;
    L.push(`- ${st.matches} partidos. Promedios: ${n1(a.minutes)} min, ${n1(a.points)} pts, ${n1(a.reb)} reb, ${n1(a.assists)} ast, ${n1(a.turnovers)} pérdidas, ${n1(a.steals)} robos.`);
    L.push(`- Campo ${st.match.fg.made}/${st.match.fg.attempts}, triples ${st.match.fg3.made}/${st.match.fg3.attempts}, libres ${st.match.ft.made}/${st.match.ft.attempts}.`);
  } else L.push("- Sin partidos en el período.");
  L.push("");
  L.push("OBJETIVOS:");
  if (d.goals.length)
    d.goals.forEach((g) =>
      L.push(
        g.measurable
          ? `- ${g.title} [${GOAL_STATUS[g.status] || g.status}] métrica: ${g.metric}; inicial ${formatValue(g.baseline, g.unit)}, meta ${formatValue(g.target, g.unit)}; actual ${g.value == null ? "sin datos" : formatValue(g.value, g.unit)} con muestra ${g.sample} ${g.sampleUnit || ""} (mínimo ${g.minSample})${g.overdue ? "; vencido" : ""}${g.due ? `; vence ${g.due}` : ""}`
          : `- ${g.title} [${GOAL_STATUS[g.status] || g.status}] sin métrica medible`
      )
    );
  else L.push("- Sin objetivos.");
  L.push("");
  L.push("TRABAJO INDIVIDUAL Y ASISTENCIA (lo planificado no es lo realizado):");
  L.push(`- Realizado: ${d.plan.done}; no se hizo: ${d.plan.skipped}; pendiente: ${d.plan.pending}.`);
  if (d.plan.doneTitles.length) L.push(`- Realizado: ${d.plan.doneTitles.join("; ")}`);
  const at = d.plan.attendance;
  L.push(at.total ? `- Asistencia: ${at.present} presente, ${at.partial} parcial, ${at.absent} ausente, ${at.excused} justificado (${at.rate ?? "—"}%).` : "- Sin asistencia registrada.");
  if (d.notes) {
    L.push("");
    L.push("OBSERVACIONES DEL CUERPO TÉCNICO (compartidas, recortadas):");
    if (d.notes.length) d.notes.forEach((n) => L.push(`- ${n.date} (${n.type}): ${n.text}`));
    else L.push("- Sin observaciones en el período.");
  }
  L.push("");
  L.push("SEÑALES CALCULADAS POR LA APP:");
  if (d.signals.length) d.signals.forEach((x) => L.push(`- ${x.text} [base: ${x.basis}]`));
  else L.push("- Ninguna.");
  L.push("");
  L.push("DATOS QUE FALTAN:");
  if (d.gaps.length) d.gaps.forEach((g) => L.push(`- ${g}`));
  else L.push("- Ninguno importante.");
  if (library.length) {
    L.push("");
    L.push("EJERCICIOS DISPONIBLES EN LA BIBLIOTECA DE BASKET LAB ACADEMY (nombre — fundamento — mínimo de jugadores):");
    library.slice(0, 30).forEach((x) => L.push(`- ${x.name} — ${x.fundamento || "—"} — ${x.minPlayers || 1}`));
  }
  return L.join("\n");
}

/** Reglas que se suman al prompt del Asistente cuando analiza un jugador. */
export const PLAYER_ANALYSIS_RULES = `Análisis de un jugador (pedido expresamente por el entrenador).
Más abajo hay un resumen ANONIMIZADO armado por la app con los datos registrados. Es lo único que sabés de este jugador: no conocés su nombre ni otros datos.
Organizá la respuesta con estos títulos, en este orden, y omití los que no apliquen:
### Datos observados
Solo números y hechos que estén en el resumen, citando la muestra (por ejemplo «41/120 en triples»).
### Interpretación
Lo que razonablemente indican los datos, aclarando sus límites.
### Hipótesis
Posibles explicaciones que habría que confirmar viendo al jugador. Marcalas como hipótesis.
### Recomendaciones
Acciones concretas. Si sugerís ejercicios, priorizá los de la biblioteca listada; si proponés uno propio, aclará que es una propuesta tuya y no de la biblioteca. Diferenciá criterios oficiales (FIBA, WABC) de interpretaciones propias, y no cites documentos que no estén disponibles.
### Información insuficiente
Qué falta para concluir con más confianza.
Reglas: no inventes datos ni porcentajes; si una muestra es insuficiente, decilo. No diagnostiques defectos técnicos que no figuren como observados en el resumen. No hagas diagnósticos médicos ni de salud; si algo lo sugiere, recomendá consultar a un profesional. Recordá que las evaluaciones son subjetivas y que los tiros de entrenamiento no son comparables 1 a 1 con los de partido. Tené en cuenta la edad: si es menor, priorizá el desarrollo y el disfrute por sobre el resultado.`;
