"use client";

import { useMemo, useState } from "react";
import { criteriaCatalog } from "@/lib/player-dev/model";
import {
  GOAL_TYPES,
  PRIORITIES,
  formatValue,
  isStructured,
  labelOf,
  measureGoal,
  measureMetric,
  metricByKey,
  metricCatalog,
  shootingDays
} from "@/lib/player-dev/goals";
import { formatDate, todayISO } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import { Dialog } from "./Fundamentals";
import { LineWithTarget } from "./MiniCharts";
import s from "./dev.module.css";

const STATUS = { active: "Activos", completed: "Cumplidos", archived: "Archivados" };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function useRun(onChanged) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

export default function GoalsTab({ profile, canEdit, onChanged }) {
  const [editing, setEditing] = useState(null); // null | "new" | goal
  const [open, setOpen] = useState(null);
  const { busy, error, run } = useRun(onChanged);
  const today = todayISO();
  const pid = profile.player.id;
  const criteria = useMemo(() => criteriaCatalog(profile.criteria), [profile.criteria]);
  const days = useMemo(() => shootingDays(profile), [profile]);
  const measured = useMemo(
    () => Object.fromEntries(profile.goals.filter(isStructured).map((g) => [g.id, measureGoal(g, profile, { today, criteria, days })])),
    [profile, today, criteria, days]
  );
  const installed = profile.schema?.goals !== false;

  const groups = ["active", "completed", "archived"].map((st) => ({
    st,
    items: profile.goals
      .filter((g) => (g.status || "active") === st)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3) || String(a.due_on || "9").localeCompare(String(b.due_on || "9")))
  }));

  return (
    <div className={lab.stack}>
      {!installed ? (
        <Notice kind="warn">Para crear objetivos medibles falta correr <code>docs/sql/013-goals-notes.sql</code> en Supabase. Los objetivos de texto siguen funcionando.</Notice>
      ) : null}
      {canEdit ? (
        <div className={lab.btnRow}>
          {installed ? <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} onClick={() => setEditing("new")}>+ Objetivo</button> : <QuickTextGoal pid={pid} run={run} busy={busy} />}
        </div>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {groups.map(({ st, items }) =>
        items.length ? (
          <section key={st} className={lab.card}>
            <div className={lab.cardHead}><h2 className={lab.cardTitle}>{STATUS[st]} ({items.length})</h2></div>
            <ul className={lab.list}>
              {items.map((g) => (
                <GoalItem
                  key={g.id}
                  goal={g}
                  m={measured[g.id]}
                  open={open === g.id}
                  onToggle={() => setOpen(open === g.id ? null : g.id)}
                  canEdit={canEdit}
                  installed={installed}
                  busy={busy}
                  onStatus={(status, achieved_value) =>
                    run(() => (isStructured(g) ? devApi.editGoal(pid, g.id, { status, achieved_value }) : devApi.updateGoal(pid, g.id, { status })))
                  }
                  onEdit={() => setEditing(g)}
                  pid={pid}
                  run={run}
                />
              ))}
            </ul>
          </section>
        ) : null
      )}
      {!profile.goals.length ? (
        <div className={lab.empty}>
          <p className={lab.emptyTitle}>Sin objetivos</p>
          <p className={lab.emptyText}>Un objetivo medible se sigue solo con los datos reales: tiros registrados, estadísticas de partido o evaluaciones.</p>
        </div>
      ) : null}
      {editing ? (
        <GoalForm
          goal={editing === "new" ? null : editing}
          profile={profile}
          criteria={criteria}
          days={days}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

function QuickTextGoal({ pid, run, busy }) {
  const [text, setText] = useState("");
  return (
    <form
      style={{ display: "flex", gap: 8, flex: 1 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (text.trim() && (await run(() => devApi.addGoal(pid, text.trim())))) setText("");
      }}
    >
      <input className={lab.input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nuevo objetivo de texto" maxLength={400} />
      <button type="submit" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} disabled={busy || !text.trim()}>Agregar</button>
    </form>
  );
}

function GoalItem({ goal, m, open, onToggle, canEdit, installed, busy, onStatus, onEdit, pid, run }) {
  const structured = isStructured(goal);
  const unit = goal.unit || m?.metric?.unit || "";
  const pct = m?.progress != null ? Math.round(m.progress * 100) : null;
  return (
    <li className={lab.sessionItem} style={{ display: "block" }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <div className={lab.sessionName}>{goal.title || goal.body}</div>
          <div className={lab.sessionMeta}>
            {structured ? <span className={lab.badge}>{labelOf(GOAL_TYPES, goal.goal_type || "qualitative")}</span> : <span className={lab.badge}>Texto</span>}
            {goal.priority ? <span>Prioridad {labelOf(PRIORITIES, goal.priority).toLowerCase()}</span> : null}
            {goal.due_on ? <span style={m?.overdue ? { color: "#f5c451" } : undefined}>{m?.overdue ? "Venció" : "Vence"} el {formatDate(goal.due_on)}</span> : null}
            {goal.status === "completed" && goal.achieved_at ? <span>Cumplido el {formatDate(String(goal.achieved_at).slice(0, 10))}{goal.achieved_value != null ? ` con ${formatValue(goal.achieved_value, unit)}` : ""}</span> : null}
          </div>
        </div>
        {m && m.metric ? (
          <div style={{ textAlign: "right", minWidth: 120 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{formatValue(m.value, unit)}</div>
            <div className={lab.subtle} style={{ margin: 0 }}>meta {formatValue(goal.target_value, unit)}</div>
          </div>
        ) : null}
      </div>
      {m && m.metric && goal.target_value != null ? (
        <div style={{ marginTop: 8 }}>
          <div className={s.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? 0} aria-label="Progreso">
            <div className={s.barFill} style={{ width: `${pct ?? 0}%`, background: m.reached ? "#5fd39a" : undefined }} />
          </div>
          <div className={lab.subtle} style={{ marginTop: 4 }}>
            {pct != null ? `${pct}% del camino` : "Sin datos todavía"}
            {m.metric.kind !== "count" && m.metric.kind !== "manual" ? ` · muestra ${m.sample} ${m.sampleUnit}${m.minSample ? ` (mínimo ${m.minSample})` : ""}` : ""}
            {m.meets && !m.enough ? " · todavía no alcanza la muestra mínima" : ""}
          </div>
        </div>
      ) : null}
      {goal.status === "active" && m?.reached && canEdit ? (
        <Notice kind="info">
          La meta se cumple con muestra suficiente. ¿Lo marcás como cumplido?{" "}
          <button type="button" className={cx(lab.btn, lab.btnSmall, lab.btnPrimary)} disabled={busy} onClick={() => onStatus("completed", m.value)}>Marcar cumplido</button>
        </Notice>
      ) : null}
      <div className={lab.btnRow} style={{ marginTop: 8 }}>
        {structured ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={onToggle} aria-expanded={open}>{open ? "Ocultar detalle" : "Ver detalle"}</button> : null}
        {canEdit ? (
          <>
            {goal.status !== "completed" ? <button type="button" className={cx(lab.btn, lab.btnSmall)} disabled={busy} onClick={() => onStatus("completed", m?.value ?? null)}>Cumplido</button> : null}
            {goal.status !== "active" ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => onStatus("active")}>Reactivar</button> : null}
            {goal.status !== "archived" ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => onStatus("archived")}>Archivar</button> : null}
            {installed ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={onEdit}>{structured ? "Editar" : "Convertir en medible"}</button> : null}
          </>
        ) : null}
      </div>
      {open && structured ? <GoalDetail goal={goal} m={m} unit={unit} canEdit={canEdit} pid={pid} run={run} busy={busy} /> : null}
    </li>
  );
}

function GoalDetail({ goal, m, unit, canEdit, pid, run, busy }) {
  const [form, setForm] = useState({ value: "", note: "", measured_on: todayISO() });
  const manual = !m?.metric || m.metric.kind === "manual";
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
      {goal.body && goal.body !== goal.title ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{goal.body}</p> : null}
      <div className={lab.subtle} style={{ margin: 0 }}>
        {m?.metric ? <>Métrica: <strong>{m.metric.label}</strong> · </> : null}
        Período: {m?.period.from ? formatDate(m.period.from) : "—"} → {m?.period.to ? formatDate(m.period.to) : "hoy"}
        {goal.baseline_value != null ? <> · Valor inicial {formatValue(goal.baseline_value, unit)}</> : null}
      </div>
      {m?.series?.length ? <LineWithTarget series={m.series} target={goal.target_value == null ? null : Number(goal.target_value)} baseline={goal.baseline_value == null ? null : Number(goal.baseline_value)} unit={unit} minSample={m.metric?.kind === "pct" ? m.minSample : 0} label={`Evolución de ${goal.title}`} /> : null}
      {m?.evidence?.length ? (
        <div>
          <p className={lab.stepLabel}>Evidencias</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>{m.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          {m.metric && !manual ? <p className={lab.subtle}>Se calcula solo con lo realizado (sesiones y partidos registrados), nunca con lo planificado.</p> : null}
        </div>
      ) : null}
      {goal.observations ? <p className={lab.subtle} style={{ whiteSpace: "pre-wrap", margin: 0 }}>Observaciones: {goal.observations}</p> : null}
      <div>
        <p className={lab.stepLabel}>{manual ? "Mediciones" : "Observaciones de seguimiento"}</p>
        {m?.checkins?.length ? (
          <ul className={s.timeline}>
            {m.checkins.map((c) => (
              <li key={c.id} className={s.timelineItem}>
                <span className={s.timelineDate}>{formatDate(c.measured_on)}</span>
                <div>
                  {c.value != null ? <strong>{formatValue(c.value, unit)} </strong> : null}
                  {c.note ? <span style={{ whiteSpace: "pre-wrap" }}>{c.note}</span> : null}
                  {canEdit ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} style={{ marginLeft: 8 }} disabled={busy} onClick={() => run(() => devApi.voidCheckin(pid, c.id))}>Anular</button> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={lab.subtle} style={{ margin: 0 }}>Sin registros.</p>
        )}
        {canEdit ? (
          <form
            className={lab.filters}
            style={{ marginTop: 8, marginBottom: 0 }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => devApi.addCheckin(pid, goal.id, { ...form, value: manual ? form.value : "" }))) setForm({ value: "", note: "", measured_on: todayISO() });
            }}
          >
            <input className={lab.input} type="date" max={todayISO()} value={form.measured_on} onChange={(e) => setForm((f) => ({ ...f, measured_on: e.target.value }))} aria-label="Fecha" style={{ maxWidth: 160 }} />
            {manual ? <input className={lab.input} type="number" step="any" inputMode="decimal" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={`Valor${unit ? ` (${unit})` : ""}`} aria-label="Valor" style={{ maxWidth: 140 }} /> : null}
            <input className={lab.input} value={form.note} maxLength={2000} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Observación (opcional)" aria-label="Observación" />
            <button type="submit" className={cx(lab.btn, lab.btnSmall)} disabled={busy || (!form.value && !form.note.trim())}>Registrar</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function GoalForm({ goal, profile, criteria, days, onClose, onSaved }) {
  const metrics = useMemo(() => metricCatalog(criteria), [criteria]);
  const groups = useMemo(() => {
    const g = {};
    metrics.forEach((m) => (g[m.group] = g[m.group] || []).push(m));
    return g;
  }, [metrics]);
  const [f, setF] = useState(() => ({
    title: goal?.title || goal?.body || "",
    description: goal?.title ? (goal.body !== goal.title ? goal.body : "") : "",
    goal_type: goal?.goal_type || "statistical",
    priority: goal?.priority || "medium",
    metric_key: goal?.metric_key || "",
    baseline_value: goal?.baseline_value ?? "",
    target_value: goal?.target_value ?? "",
    comparison: goal?.comparison || "",
    min_sample: goal?.min_sample ?? "",
    start_on: goal?.start_on || todayISO(),
    due_on: goal?.due_on || "",
    observations: goal?.observations || ""
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const metric = f.metric_key ? metricByKey(f.metric_key, criteria) : null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  function pickMetric(key) {
    const m = key ? metricByKey(key, criteria) : null;
    setF((x) => ({ ...x, metric_key: key, comparison: m?.comparison || "", min_sample: m ? m.minSample : "" }));
  }

  function useCurrent() {
    if (!metric) return;
    const r = measureMetric(metric, profile, { days, from: null, to: todayISO() });
    if (r.value != null) setF((x) => ({ ...x, baseline_value: r.value }));
  }
  const current = metric && metric.kind !== "manual" ? measureMetric(metric, profile, { days }) : null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...f, unit: metric?.unit ?? "" };
    if (!body.metric_key) {
      body.metric_key = null;
    }
    try {
      if (goal) await devApi.editGoal(profile.player.id, goal.id, body);
      else await devApi.createGoal(profile.player.id, body);
      await onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Dialog title={goal ? (goal.title ? "Editar objetivo" : "Convertir en objetivo medible") : "Nuevo objetivo"} onClose={onClose} wide>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div className={lab.formGrid}>
          <label className={lab.field} style={{ gridColumn: "1 / -1" }}>
            <span className={lab.label}>Título</span>
            <input className={lab.input} value={f.title} onChange={set("title")} maxLength={160} required placeholder="Ej.: 40% en triples de esquina" />
          </label>
          <label className={lab.field}>
            <span className={lab.label}>Tipo</span>
            <select className={lab.select} value={f.goal_type} onChange={set("goal_type")}>
              {GOAL_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className={lab.field}>
            <span className={lab.label}>Prioridad</span>
            <select className={lab.select} value={f.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className={lab.field} style={{ gridColumn: "1 / -1" }}>
            <span className={lab.label}>Cómo se mide</span>
            <select className={lab.select} value={f.metric_key} onChange={(e) => pickMetric(e.target.value)}>
              <option value="">Sin métrica: se evalúa a mano (cualitativo)</option>
              {Object.entries(groups).map(([g, list]) => (
                <optgroup key={g} label={g}>
                  {list.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        {metric ? (
          <>
            {current ? (
              <p className={lab.subtle} style={{ margin: 0 }}>
                Valor actual (todo el historial): <strong>{formatValue(current.value, metric.unit)}</strong>
                {metric.kind === "pct" || metric.kind === "avg" ? ` · muestra ${current.sample} ${current.sampleUnit}` : ""}{" "}
                {current.value != null ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={useCurrent}>Usar como valor inicial</button> : null}
              </p>
            ) : null}
            <div className={lab.formGrid}>
              <label className={lab.field}>
                <span className={lab.label}>Valor inicial {metric.unit ? `(${metric.unit})` : ""}</span>
                <input className={lab.input} type="number" step="any" inputMode="decimal" value={f.baseline_value} onChange={set("baseline_value")} />
              </label>
              <label className={lab.field}>
                <span className={lab.label}>Meta {metric.unit ? `(${metric.unit})` : ""}</span>
                <input className={lab.input} type="number" step="any" inputMode="decimal" value={f.target_value} onChange={set("target_value")} required />
              </label>
              <label className={lab.field}>
                <span className={lab.label}>Cumple si el valor es</span>
                <select className={lab.select} value={f.comparison || metric.comparison} onChange={set("comparison")}>
                  <option value="gte">Mayor o igual a la meta</option>
                  <option value="lte">Menor o igual a la meta</option>
                </select>
              </label>
              {metric.kind === "pct" || metric.kind === "avg" ? (
                <label className={lab.field}>
                  <span className={lab.label}>Muestra mínima ({metric.kind === "pct" ? "intentos" : "partidos"})</span>
                  <input className={lab.input} type="number" min="0" step="1" inputMode="numeric" value={f.min_sample} onChange={set("min_sample")} />
                </label>
              ) : null}
            </div>
          </>
        ) : null}
        <div className={lab.formGrid}>
          <label className={lab.field}>
            <span className={lab.label}>Inicio</span>
            <input className={lab.input} type="date" value={f.start_on} onChange={set("start_on")} />
          </label>
          <label className={lab.field}>
            <span className={lab.label}>Fecha límite</span>
            <input className={lab.input} type="date" value={f.due_on} min={f.start_on || undefined} onChange={set("due_on")} />
          </label>
        </div>
        <label className={lab.field}>
          <span className={lab.label}>Descripción</span>
          <textarea className={lab.textarea} rows={2} value={f.description} onChange={set("description")} maxLength={2000} />
        </label>
        <label className={lab.field}>
          <span className={lab.label}>Observaciones</span>
          <textarea className={lab.textarea} rows={2} value={f.observations} onChange={set("observations")} maxLength={2000} />
        </label>
        {metric && metric.kind !== "manual" ? <p className={lab.subtle} style={{ margin: 0 }}>Solo cuentan los datos realizados entre el inicio y la fecha límite. El objetivo no se marca cumplido solo: la app avisa y vos lo confirmás.</p> : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={lab.btnRow}>
          <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Dialog>
  );
}
