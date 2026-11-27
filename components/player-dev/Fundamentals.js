"use client";

import { useMemo, useState } from "react";
import { ASSESSMENT_CONTEXTS, DIMENSIONS, levelDescription } from "@/lib/player-dev/catalog";
import {
  assessmentBatches,
  compareBatches,
  criteriaCatalog,
  criterionHistory,
  dimensionSummary,
  legacyFundamentalsView
} from "@/lib/player-dev/model";
import { formatDate, newClientId, todayISO } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import s from "./dev.module.css";

const ctxLabel = (id) => ASSESSMENT_CONTEXTS.find((c) => c.id === id)?.label || id;

/** Gráfico radial: solo fundamentos evaluados; el resto se lista como "sin evaluar". */
export function Radar({ dims, compare = null }) {
  const pts = dims.filter((d) => d.score != null);
  if (pts.length < 3) {
    return <p className={lab.subtle}>El gráfico radial aparece con al menos 3 fundamentos evaluados.</p>;
  }
  const R = 100;
  const cx0 = 220;
  const cy0 = 130;
  const angle = (i) => (Math.PI * 2 * i) / pts.length - Math.PI / 2;
  const point = (i, v) => [cx0 + Math.cos(angle(i)) * (R * v) / 100, cy0 + Math.sin(angle(i)) * (R * v) / 100];
  const poly = (vals) => vals.map((v, i) => point(i, v ?? 0).map((n) => n.toFixed(1)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 440 270" className={lab.chart} role="img" aria-label={`Perfil técnico: ${pts.map((d) => `${d.dimension.label} ${d.score}%`).join(", ")}`} style={{ maxWidth: 460, margin: "0 auto" }}>
      {[25, 50, 75, 100].map((r) => (
        <polygon key={r} points={poly(pts.map(() => r))} fill="none" stroke="rgba(255,255,255,0.09)" />
      ))}
      {pts.map((d, i) => {
        const [x, y] = point(i, 100);
        const [lx, ly] = point(i, 122);
        return (
          <g key={d.dimension.id}>
            <line x1={cx0} y1={cy0} x2={x} y2={y} stroke="rgba(255,255,255,0.09)" />
            <text x={lx} y={ly} fontSize="12.5" fill="#a5aaba" textAnchor={Math.abs(lx - cx0) < 8 ? "middle" : lx > cx0 ? "start" : "end"} dominantBaseline="middle">
              {d.dimension.label}
            </text>
          </g>
        );
      })}
      {compare ? <polygon points={poly(pts.map((d) => compare[d.dimension.id] ?? 0))} fill="rgba(165,170,186,0.12)" stroke="#a5aaba" strokeDasharray="4 3" strokeWidth="1.5" /> : null}
      <polygon points={poly(pts.map((d) => d.score))} fill="rgba(255,138,31,0.22)" stroke="#ff8a1f" strokeWidth="2" />
      {pts.map((d, i) => {
        const [x, y] = point(i, d.score);
        return <circle key={d.dimension.id} cx={x} cy={y} r="3.5" fill="#ff8a1f" stroke="#0a0b10" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

export default function Fundamentals({ profile, canEdit, onChanged }) {
  const catalog = useMemo(() => criteriaCatalog(profile.criteria), [profile.criteria]);
  const dims = useMemo(() => dimensionSummary(profile.assessments, catalog), [profile.assessments, catalog]);
  const batches = useMemo(() => assessmentBatches(profile.assessments), [profile.assessments]);
  const legacy = legacyFundamentalsView(profile.player.fundamentals);
  const [mode, setMode] = useState(null); // "new" | "legacy" | "criteria"
  const [historyKey, setHistoryKey] = useState(null);
  const [cmp, setCmp] = useState({ a: "", b: "" });
  const installed = profile.schema?.installed;

  const pending = dims.filter((d) => !d.evaluated);
  const batchA = batches.find((b) => b.batch_id === cmp.a);
  const batchB = batches.find((b) => b.batch_id === cmp.b);
  const comparison = batchA && batchB ? compareBatches(batchA.assessed_on <= batchB.assessed_on ? batchA : batchB, batchA.assessed_on <= batchB.assessed_on ? batchB : batchA) : null;
  const hasConfirmedLegacy = batches.some((b) => b.source === "legacy_confirmed");

  return (
    <div className={lab.stack}>
      {!installed ? <Notice kind="warn">Para cargar evaluaciones con fecha falta correr la migración 012 en Supabase.</Notice> : null}

      {legacy.status !== "empty" && !hasConfirmedLegacy ? (
        <Notice kind={legacy.status === "default_only" ? "info" : "warn"}>
          {legacy.status === "default_only" ? (
            <>Las estrellas del sistema anterior están todas en 3, el valor que ponía el formulario al crear el perfil. No se toman como evaluación.</>
          ) : (
            <>
              Hay estrellas del sistema anterior sin fecha ({legacy.items.filter((i) => i.value != null).map((i) => `${i.label} ${i.value}`).join(", ")}). No se cuentan hasta que las confirmes.{" "}
              {canEdit && installed ? (
                <button type="button" className={cx(lab.btn, lab.btnSmall)} onClick={() => setMode("legacy")}>Revisar y confirmar</button>
              ) : null}
            </>
          )}
        </Notice>
      ) : null}

      <div className={cx(lab.grid, lab.gridMain)}>
        <section className={lab.card} aria-labelledby="fund-title">
          <div className={lab.cardHead}>
            <div>
              <h2 className={lab.cardTitle} id="fund-title">Perfil técnico actual</h2>
              <p className={lab.cardHint}>Último valor de cada criterio. Promedio por fundamento sobre su escala.</p>
            </div>
            {canEdit && installed ? (
              <div className={lab.btnRow}>
                <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} onClick={() => setMode("new")}>+ Evaluación</button>
                <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setMode("criteria")}>Criterios</button>
              </div>
            ) : null}
          </div>
          <Radar dims={dims} />
          <div style={{ marginTop: 8 }}>
            {dims.map((d) => (
              <div key={d.dimension.id} className={s.dimRow}>
                <span>{d.dimension.label}</span>
                {d.evaluated ? (
                  <div className={s.bar} role="img" aria-label={`${d.score}%`}>
                    <div className={s.barFill} style={{ width: `${d.score}%` }} />
                  </div>
                ) : (
                  <span className={lab.subtle}>Sin evaluar</span>
                )}
                <span className={lab.num} style={{ textAlign: "right", fontSize: 12.5, color: "#a5aaba" }}>
                  {d.evaluated ? `${d.score}% · ${formatDate(d.lastDate).replace(/ de \d{4}$/, "")}` : "—"}
                </span>
              </div>
            ))}
          </div>
          {pending.length ? <p className={lab.subtle}>Pendientes de evaluación: {pending.map((d) => d.dimension.label).join(", ")}.</p> : null}
        </section>

        <section className={lab.card} aria-labelledby="crit-title">
          <div className={lab.cardHead}>
            <h2 className={lab.cardTitle} id="crit-title">Criterios evaluados</h2>
          </div>
          {dims.some((d) => d.evaluated) ? (
            <div className={lab.tableWrap}>
              <table className={lab.table}>
                <thead>
                  <tr><th>Criterio</th><th className={lab.num}>Valor</th><th>Fecha</th></tr>
                </thead>
                <tbody>
                  {dims.flatMap((d) =>
                    d.latest.map((a) => (
                      <tr key={a.criterion_key} className={cx(lab.clickRow, historyKey === a.criterion_key && lab.rowSelected)} onClick={() => setHistoryKey((k) => (k === a.criterion_key ? null : a.criterion_key))}>
                        <td>
                          {a.criterion_label}
                          <div className={lab.subtle}>{d.dimension.label}</div>
                        </td>
                        <td className={lab.num}>{a.value}/{a.scale_max}</td>
                        <td>{formatDate(a.assessed_on)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={lab.subtle}>Todavía no hay evaluaciones con fecha.</p>
          )}
          {historyKey ? <CriterionHistory points={criterionHistory(profile.assessments, historyKey)} /> : dims.some((d) => d.evaluated) ? <p className={lab.subtle}>Tocá un criterio para ver su evolución.</p> : null}
        </section>
      </div>

      {batches.length >= 2 ? (
        <section className={lab.card} aria-labelledby="cmp-title">
          <div className={lab.cardHead}>
            <h2 className={lab.cardTitle} id="cmp-title">Comparar evaluaciones</h2>
          </div>
          <div className={lab.filters}>
            {["a", "b"].map((k) => (
              <select key={k} className={lab.select} value={cmp[k]} onChange={(e) => setCmp((c) => ({ ...c, [k]: e.target.value }))} aria-label={k === "a" ? "Primera evaluación" : "Segunda evaluación"}>
                <option value="">{k === "a" ? "Primera fecha" : "Segunda fecha"}</option>
                {batches.map((b) => <option key={b.batch_id} value={b.batch_id}>{formatDate(b.assessed_on)} · {ctxLabel(b.context)}</option>)}
              </select>
            ))}
          </div>
          {comparison ? (
            <div className={lab.tableWrap}>
              <table className={lab.table}>
                <thead><tr><th>Criterio</th><th className={lab.num}>Antes</th><th className={lab.num}>Después</th><th className={lab.num}>Cambio</th></tr></thead>
                <tbody>
                  {comparison.map((r) => (
                    <tr key={r.criterion_key}>
                      <td>{r.label}</td>
                      <td className={lab.num}>{r.a == null ? "sin evaluar" : `${r.a}/${r.scale_max}`}</td>
                      <td className={lab.num}>{r.b == null ? "sin evaluar" : `${r.b}/${r.scale_max}`}</td>
                      <td className={lab.num}>{r.delta == null ? "—" : `${r.delta > 0 ? "+" : ""}${r.delta}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={lab.subtle}>Elegí dos fechas.</p>
          )}
        </section>
      ) : null}

      <section className={lab.card} aria-labelledby="hist-title">
        <div className={lab.cardHead}>
          <h2 className={lab.cardTitle} id="hist-title">Historial de evaluaciones y observaciones</h2>
        </div>
        {batches.length ? (
          <ul className={s.timeline}>
            {batches.map((b) => (
              <li key={b.batch_id} className={s.timelineItem}>
                <span className={s.timelineDate}>{formatDate(b.assessed_on)}<br />{ctxLabel(b.context)}</span>
                <div>
                  {b.source === "legacy_confirmed" ? <span className={cx(lab.badge, lab.badgeLegacy)}>Confirmado del sistema anterior</span> : null}
                  <div>{b.items.map((i) => `${i.criterion_label} ${i.value}/${i.scale_max}`).join(" · ")}</div>
                  {[...new Set(b.items.map((i) => i.notes).filter(Boolean))].map((n) => (
                    <p key={n} style={{ margin: "6px 0 0", color: "#a5aaba", whiteSpace: "pre-wrap" }}>{n}</p>
                  ))}
                  {canEdit ? <VoidButton playerId={profile.player.id} batchId={b.batch_id} onDone={onChanged} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={lab.subtle}>Sin evaluaciones todavía.</p>
        )}
        <p className={lab.subtle}>Las evaluaciones son del entrenador y no cambian solas: por ejemplo, la mecánica de tiro no sube porque suba el porcentaje.</p>
      </section>

      {mode === "new" || mode === "legacy" ? (
        <AssessmentDialog
          catalog={catalog}
          legacy={mode === "legacy" ? legacy : null}
          playerId={profile.player.id}
          onClose={() => setMode(null)}
          onSaved={async () => {
            setMode(null);
            await onChanged();
          }}
        />
      ) : null}
      {mode === "criteria" ? <CriteriaDialog criteria={profile.criteria} onClose={() => setMode(null)} onChanged={onChanged} /> : null}
    </div>
  );
}

function CriterionHistory({ points }) {
  if (!points.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <p className={lab.stepLabel}>Evolución del criterio</p>
      <ul className={s.timeline}>
        {points.map((p, i) => (
          <li key={i} className={s.timelineItem}>
            <span className={s.timelineDate}>{formatDate(p.fecha)}</span>
            <div>
              <div className={s.bar} style={{ maxWidth: 220 }}><div className={s.barFill} style={{ width: `${(p.value / p.scale_max) * 100}%` }} /></div>
              <span style={{ fontSize: 13 }}>{p.value}/{p.scale_max} · {ctxLabel(p.context)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VoidButton({ playerId, batchId, onDone }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirm) {
    return (
      <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} style={{ marginTop: 6 }} onClick={() => setConfirm(true)}>
        Anular
      </button>
    );
  }
  return (
    <span className={lab.btnRow} style={{ marginTop: 6 }}>
      <span className={lab.subtle}>¿Anular esta evaluación? Queda registrada como anulada.</span>
      <button type="button" className={cx(lab.btn, lab.btnDanger, lab.btnSmall)} disabled={busy} onClick={async () => { setBusy(true); try { await devApi.voidAssessment(playerId, batchId); await onDone(); } finally { setBusy(false); setConfirm(false); } }}>
        Anular
      </button>
      <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setConfirm(false)}>Cancelar</button>
    </span>
  );
}

function Dialog({ title, onClose, children, wide }) {
  return (
    <div className={lab.dialogBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={lab.dialog} role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: "min(720px, 100%)" } : undefined}>
        <h2 className={lab.dialogTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function AssessmentDialog({ catalog, legacy, playerId, onClose, onSaved }) {
  const isLegacy = Boolean(legacy);
  const [batchId] = useState(() => newClientId());
  const [date, setDate] = useState(todayISO());
  const [context, setContext] = useState(isLegacy ? "observation" : "training");
  const [notes, setNotes] = useState(isLegacy ? "Valores del sistema anterior revisados y confirmados." : "");
  const [values, setValues] = useState(() => {
    const v = {};
    if (isLegacy) legacy.items.forEach((i) => { if (i.value != null) v[i.key] = i.value; });
    return v;
  });
  const [dim, setDim] = useState(isLegacy ? "all" : DIMENSIONS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const shown = isLegacy ? catalog.filter((c) => c.legacy) : catalog.filter((c) => dim === "all" || c.dimension === dim);
  const count = Object.values(values).filter((v) => v != null).length;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await devApi.addAssessment(playerId, {
        batch_id: batchId,
        assessed_on: date,
        context,
        notes,
        source: isLegacy ? "legacy_confirmed" : "manual",
        items: Object.entries(values).filter(([, v]) => v != null).map(([criterion_key, value]) => ({ criterion_key, value }))
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Dialog title={isLegacy ? "Confirmar valores del sistema anterior" : "Nueva evaluación"} onClose={onClose} wide>
      {isLegacy ? <p className={lab.subtle} style={{ margin: 0 }}>Revisá cada valor y poné la fecha en que realmente los observaste. Podés cambiar o dejar sin evaluar cualquiera.</p> : null}
      <div className={lab.formGrid}>
        <label className={lab.field}>
          <span className={lab.label}>Fecha</span>
          <input className={lab.input} type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className={lab.field}>
          <span className={lab.label}>Contexto</span>
          <select className={lab.select} value={context} onChange={(e) => setContext(e.target.value)}>
            {ASSESSMENT_CONTEXTS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
      </div>
      {!isLegacy ? (
        <div className={lab.chipsWrap}>
          {DIMENSIONS.map((d) => (
            <button key={d.id} type="button" className={cx(lab.chip, dim === d.id && lab.chipActive)} onClick={() => setDim(d.id)}>
              {d.label}
              {catalog.some((c) => c.dimension === d.id && values[c.key] != null) ? <span className={lab.chipCount}>✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <div>
        {shown.map((c) => (
          <div key={c.key} className={s.critRow}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{c.label}{c.custom ? <span className={lab.subtle}> · propio</span> : null}</div>
              <div className={s.levelHint}>{values[c.key] != null ? levelDescription(c, values[c.key]) : "Sin evaluar"}</div>
            </div>
            <div className={s.scale} role="radiogroup" aria-label={c.label}>
              <button type="button" className={cx(s.scaleBtn, s.scaleNone, values[c.key] == null && s.scaleBtnOn)} onClick={() => setValues((v) => ({ ...v, [c.key]: null }))} aria-pressed={values[c.key] == null}>
                —
              </button>
              {Array.from({ length: c.scale_max }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={cx(s.scaleBtn, values[c.key] === n && s.scaleBtnOn)} aria-pressed={values[c.key] === n} title={levelDescription(c, n)} onClick={() => setValues((v) => ({ ...v, [c.key]: n }))}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label className={lab.field}>
        <span className={lab.label}>Observaciones</span>
        <textarea className={lab.textarea} rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qué observaste, en qué situación…" />
      </label>
      <p className={lab.subtle} style={{ margin: 0 }}>Niveles 1–5: propuesta de Basket Lab. «—» = no evaluado (no es un valor intermedio).</p>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <div className={lab.btnRow}>
        <button type="button" className={cx(lab.btn, lab.btnPrimary)} disabled={busy || !count} onClick={save}>{busy ? "Guardando…" : `Guardar (${count} criterio${count === 1 ? "" : "s"})`}</button>
        <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cancelar</button>
      </div>
    </Dialog>
  );
}

function CriteriaDialog({ criteria, onClose, onChanged }) {
  const [form, setForm] = useState({ dimension: DIMENSIONS[0].id, label: "", description: "", scale_max: 5 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Criterios propios" onClose={onClose}>
      <p className={lab.subtle} style={{ margin: 0 }}>Sumá criterios según tu forma de trabajar. Son tuyos: se usan en todos tus jugadores. La escala no se puede cambiar después.</p>
      {criteria.length ? (
        <ul className={lab.list}>
          {criteria.map((c) => (
            <li key={c.id} className={lab.sessionItem}>
              <div>
                <div className={lab.sessionName}>{c.label}</div>
                <div className={lab.sessionMeta}>{DIMENSIONS.find((d) => d.id === c.dimension)?.label} · escala 1–{c.scale_max}{c.active ? "" : " · desactivado"}</div>
              </div>
              <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => run(() => devApi.editCriterion(c.id, { active: !c.active }))}>
                {c.active ? "Desactivar" : "Activar"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={lab.formGrid}>
        <label className={lab.field}>
          <span className={lab.label}>Fundamento</span>
          <select className={lab.select} value={form.dimension} onChange={(e) => setForm((f) => ({ ...f, dimension: e.target.value }))}>
            {DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <label className={lab.field}>
          <span className={lab.label}>Escala (máximo)</span>
          <input className={lab.input} type="number" min={2} max={10} value={form.scale_max} onChange={(e) => setForm((f) => ({ ...f, scale_max: Number(e.target.value) }))} />
        </label>
      </div>
      <label className={lab.field}>
        <span className={lab.label}>Nombre del criterio</span>
        <input className={lab.input} maxLength={80} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ej.: Cambio de ritmo" />
      </label>
      <label className={lab.field}>
        <span className={lab.label}>Descripción (opcional)</span>
        <input className={lab.input} maxLength={500} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </label>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <div className={lab.btnRow}>
        <button type="button" className={cx(lab.btn, lab.btnPrimary)} disabled={busy || !form.label.trim()} onClick={() => run(async () => { await devApi.addCriterion(form); setForm((f) => ({ ...f, label: "", description: "" })); })}>
          Agregar criterio
        </button>
        <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cerrar</button>
      </div>
    </Dialog>
  );
}
