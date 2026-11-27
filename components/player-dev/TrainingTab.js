"use client";

import { useEffect, useMemo, useState } from "react";
import { ATTENDANCE_STATUS, PLAN_KINDS, PLAN_STATUS, attendanceSummary, routineMinutes, splitPlan } from "@/lib/player-dev/plan";
import { labelOf } from "@/lib/player-dev/goals";
import { FIELD_ZONES } from "@/lib/shooting/model";
import { formatDate, newClientId, todayISO } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import { Dialog } from "./Fundamentals";
import s from "./dev.module.css";

function daysAgo(n) {
  const d = new Date(`${todayISO()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function useRun(onChanged) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      await onChanged?.();
      return r || true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

export default function TrainingTab({ profile, canEdit, onChanged }) {
  const installed = profile.schema?.plan !== false;
  const [planning, setPlanning] = useState(null);
  const [dialog, setDialog] = useState(null); // assign | attendance | routine | {done: item}
  const today = todayISO();
  const pid = profile.player.id;
  const { busy, error, run } = useRun(onChanged);

  const loadPlanning = () =>
    devApi
      .planning()
      .then(setPlanning)
      .catch(() => setPlanning({ routines: [], trainings: [], library: [], schema: { plan: false } }));
  useEffect(() => {
    if (installed && canEdit) loadPlanning();
  }, [installed, canEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = useMemo(() => splitPlan(profile.planItems || [], today), [profile.planItems, today]);
  const att = useMemo(() => attendanceSummary(profile.attendance || [], { from: daysAgo(89) }), [profile.attendance]);
  const goalsById = Object.fromEntries(profile.goals.map((g) => [g.id, g]));
  const sessionsById = Object.fromEntries(profile.sessions.map((x) => [x.id, x]));
  const doneSessions = profile.sessions.filter((x) => x.status !== "draft" && x.status !== "archived");

  if (!installed) {
    return (
      <div className={lab.stack}>
        <Notice kind="warn">Para planificar trabajo individual y registrar asistencia falta correr <code>docs/sql/014-player-plan.sql</code> en Supabase.</Notice>
        <DoneSessions sessions={doneSessions} />
      </div>
    );
  }

  return (
    <div className={lab.stack}>
      <p className={lab.subtle} style={{ margin: 0 }}>
        <strong>Planificado</strong> es lo previsto; <strong>realizado</strong> es lo que se hizo. Los objetivos solo avanzan con lo realizado y registrado (tiros, partidos, evaluaciones), nunca con lo planificado.
      </p>
      {canEdit ? (
        <div className={lab.btnRow}>
          <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} onClick={() => setDialog("assign")} disabled={!planning}>+ Asignar trabajo</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setDialog("attendance")} disabled={!planning}>Registrar asistencia</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setDialog("routine")} disabled={!planning}>Mis rutinas</button>
        </div>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className={cx(lab.grid, lab.gridMain)}>
        <section className={lab.card}>
          <div className={lab.cardHead}>
            <div>
              <h2 className={lab.cardTitle}>Planificado ({plan.upcoming.length})</h2>
              {plan.overdue.length ? <p className={lab.cardHint} style={{ color: "#f5c451" }}>{plan.overdue.length} con fecha pasada: marcá si se hizo o no.</p> : null}
            </div>
          </div>
          {plan.upcoming.length ? (
            <ul className={lab.list}>
              {plan.upcoming.map((it) => (
                <PlanItem
                  key={it.id}
                  item={it}
                  goal={goalsById[it.goal_id]}
                  overdue={it.planned_on && it.planned_on < today}
                  canEdit={canEdit}
                  busy={busy}
                  pid={pid}
                  onDone={() => setDialog({ done: it })}
                  onStatus={(status) => run(() => devApi.editPlanItem(pid, it.id, { status }))}
                />
              ))}
            </ul>
          ) : (
            <p className={lab.subtle}>No hay trabajo planificado.</p>
          )}
        </section>
        <section className={lab.card}>
          <div className={lab.cardHead}>
            <div>
              <h2 className={lab.cardTitle}>Asistencia</h2>
              <p className={lab.cardHint}>Últimos 90 días, entrenamientos del planificador.</p>
            </div>
          </div>
          <div className={s.facts}>
            <span><strong>{att.rate == null ? "—" : `${att.rate}%`}</strong>asistencia</span>
            <span><strong>{att.present}</strong>presente</span>
            <span><strong>{att.partial}</strong>parcial</span>
            <span><strong>{att.absent}</strong>ausente</span>
            <span><strong>{att.excused}</strong>justificado</span>
          </div>
          {(profile.attendance || []).length ? (
            <ul className={s.timeline} style={{ marginTop: 10 }}>
              {profile.attendance.slice(0, 8).map((a) => (
                <li key={a.id} className={s.timelineItem}>
                  <span className={s.timelineDate}>{formatDate(a.trained_on)}</span>
                  <span>{labelOf(ATTENDANCE_STATUS, a.status)} · {String(a.training_label || "").replace(/ · \d{4}-\d{2}-\d{2}$/, "")}{a.notes ? ` · ${a.notes}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={lab.subtle}>Sin asistencia registrada.</p>
          )}
          <p className={lab.subtle}>Los justificados no cuentan en contra; un parcial cuenta la mitad.</p>
        </section>
      </div>

      <section className={lab.card}>
        <div className={lab.cardHead}><h2 className={lab.cardTitle}>Realizado ({plan.done.length})</h2></div>
        {plan.done.length ? (
          <ul className={s.timeline}>
            {plan.done.map((it) => (
              <li key={it.id} className={s.timelineItem}>
                <span className={s.timelineDate}>{formatDate(it.done_on)}</span>
                <div>
                  <strong>{it.title}</strong> <span className={lab.subtle}>· {labelOf(PLAN_KINDS, it.kind)}</span>
                  {goalsById[it.goal_id] ? <div className={lab.subtle}>Objetivo: {goalsById[it.goal_id].title || goalsById[it.goal_id].body}</div> : null}
                  {it.shooting_session_id && sessionsById[it.shooting_session_id] ? (
                    <div className={lab.subtle}>
                      Sesión: <a href={`/shooting?session=${it.shooting_session_id}`} style={{ color: "inherit" }}>{sessionsById[it.shooting_session_id].nombre}</a>
                    </div>
                  ) : null}
                  {it.result_notes ? <div className={lab.subtle} style={{ whiteSpace: "pre-wrap" }}>{it.result_notes}</div> : null}
                  {canEdit ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => run(() => devApi.editPlanItem(pid, it.id, { status: "planned" }))}>Volver a planificado</button> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={lab.subtle}>Todavía no hay trabajo planificado marcado como realizado.</p>
        )}
        {plan.skipped.length ? <p className={lab.subtle}>{plan.skipped.length} trabajo(s) marcado(s) como «no se hizo».</p> : null}
      </section>

      <DoneSessions sessions={doneSessions} />

      {dialog === "assign" && planning ? (
        <AssignDialog profile={profile} planning={planning} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await onChanged(); }} />
      ) : null}
      {dialog === "attendance" && planning ? (
        <AttendanceDialog profile={profile} planning={planning} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await onChanged(); }} />
      ) : null}
      {dialog === "routine" && planning ? (
        <RoutinesDialog planning={planning} onClose={() => setDialog(null)} onChanged={loadPlanning} />
      ) : null}
      {dialog?.done ? (
        <DoneDialog item={dialog.done} sessions={doneSessions} pid={pid} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await onChanged(); }} />
      ) : null}
    </div>
  );
}

function DoneSessions({ sessions }) {
  return (
    <section className={lab.card}>
      <div className={lab.cardHead}><h2 className={lab.cardTitle}>Sesiones de tiro realizadas ({sessions.length})</h2></div>
      {sessions.length ? (
        <ul className={s.timeline}>
          {sessions.slice(0, 12).map((x) => (
            <li key={x.id} className={s.timelineItem}>
              <span className={s.timelineDate}>{formatDate(x.fecha)}</span>
              <a href={`/shooting?session=${x.id}`} style={{ color: "inherit" }}>{x.nombre}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p className={lab.subtle}>Sin sesiones registradas.</p>
      )}
    </section>
  );
}

function PlanItem({ item, goal, overdue, canEdit, busy, pid, onDone, onStatus }) {
  const [open, setOpen] = useState(false);
  const c = item.content || {};
  return (
    <li className={s.stackItem}>
      <div className={lab.sessionName}>{item.title}</div>
      <div className={lab.sessionMeta}>
        <span className={lab.badge}>{labelOf(PLAN_KINDS, item.kind)}</span>
        {item.planned_on ? <span style={overdue ? { color: "#f5c451" } : undefined}>{formatDate(item.planned_on)}</span> : <span>Sin fecha</span>}
        {item.training_label ? <span>Entrenamiento: {String(item.training_label).replace(/ · \d{4}-\d{2}-\d{2}$/, "")}</span> : null}
        {goal ? <span>Objetivo: {goal.title || goal.body}</span> : null}
      </div>
      {open ? (
        <div style={{ marginTop: 8, fontSize: 13.5, display: "grid", gap: 6 }}>
          {item.details ? <div style={{ whiteSpace: "pre-wrap" }}>{item.details}</div> : null}
          {item.kind === "exercise" ? (
            <div className={lab.subtle} style={{ margin: 0 }}>
              {c.article} · {c.fundamento}{c.minutes ? ` · ${c.minutes[0]}–${c.minutes[1]} min` : ""}
              {c.objective ? <div>{c.objective}</div> : null}
            </div>
          ) : null}
          {item.kind === "routine" ? (
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {(c.items || []).map((x, i) => (
                <li key={i}>{x.title}{x.minutes ? ` · ${x.minutes} min` : ""}{x.attempts ? ` · ${x.attempts} lanzamientos` : ""}{x.zone_id ? ` (${FIELD_ZONES.find((z) => z.id === x.zone_id)?.label || x.zone_id})` : ""}{x.source ? <span className={lab.subtle}> · {x.source}</span> : null}</li>
              ))}
            </ol>
          ) : null}
          {item.kind === "shooting_plan" ? (
            <>
              <div className={lab.tableWrap}>
                <table className={lab.table}>
                  <thead><tr><th>Zona</th><th className={lab.num}>Lanzamientos</th><th>Por qué</th></tr></thead>
                  <tbody>{(c.zones || []).map((z) => <tr key={z.zone_id}><td>{z.zone}</td><td className={lab.num}>{z.shots}</td><td>{z.reason}</td></tr>)}</tbody>
                </table>
              </div>
              {(c.notes || []).map((n) => <p key={n} className={lab.subtle} style={{ margin: 0 }}>{n}</p>)}
              <p className={lab.subtle} style={{ margin: 0 }}>Calculado con {c.basis?.attempts ?? 0} lanzamientos realizados desde el {c.basis?.from ? formatDate(c.basis.from) : "—"}.</p>
              <div><a className={cx(lab.btn, lab.btnSmall)} href={`/shooting?view=new&player=${pid}`}>Registrar la sesión en Shooting Lab</a></div>
            </>
          ) : null}
        </div>
      ) : null}
      <div className={lab.btnRow} style={{ marginTop: 8 }}>
        <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Ocultar" : "Ver"}</button>
        {canEdit ? (
          <>
            <button type="button" className={cx(lab.btn, lab.btnSmall)} disabled={busy} onClick={onDone}>Realizado</button>
            <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => onStatus("skipped")}>No se hizo</button>
            <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => onStatus("cancelled")}>Cancelar</button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function DoneDialog({ item, sessions, pid, onClose, onSaved }) {
  const [f, setF] = useState({ done_on: todayISO(), shooting_session_id: "", result_notes: "" });
  const { busy, error, run } = useRun(null);
  const candidates = sessions.filter((x) => !item.planned_on || x.fecha >= item.planned_on).slice(0, 20);
  return (
    <Dialog title={`Realizado: ${item.title}`} onClose={onClose}>
      <form
        style={{ display: "grid", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => devApi.editPlanItem(pid, item.id, { status: "done", ...f, shooting_session_id: f.shooting_session_id || null }))) await onSaved();
        }}
      >
        <label className={lab.field}>
          <span className={lab.label}>Fecha</span>
          <input className={lab.input} type="date" max={todayISO()} value={f.done_on} onChange={(e) => setF((x) => ({ ...x, done_on: e.target.value }))} required />
        </label>
        <label className={lab.field}>
          <span className={lab.label}>Sesión de tiro registrada (opcional)</span>
          <select className={lab.select} value={f.shooting_session_id} onChange={(e) => setF((x) => ({ ...x, shooting_session_id: e.target.value }))}>
            <option value="">Ninguna</option>
            {candidates.map((x) => <option key={x.id} value={x.id}>{x.nombre} · {formatDate(x.fecha)}</option>)}
          </select>
        </label>
        <label className={lab.field}>
          <span className={lab.label}>Observaciones</span>
          <textarea className={lab.textarea} rows={2} maxLength={2000} value={f.result_notes} onChange={(e) => setF((x) => ({ ...x, result_notes: e.target.value }))} />
        </label>
        <p className={lab.subtle} style={{ margin: 0 }}>Marcarlo realizado no suma tiros ni cambia objetivos: los números salen de la sesión registrada.</p>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={lab.btnRow}>
          <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy}>Guardar</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Dialog>
  );
}

function AssignDialog({ profile, planning, onClose, onSaved }) {
  const pid = profile.player.id;
  const [kind, setKind] = useState("exercise");
  const [q, setQ] = useState("");
  const [f, setF] = useState({ exercise_key: "", routine_id: "", total_shots: 60, include_ft: false, title: "", details: "", goal_id: "", training_ref: "", planned_on: "" });
  const [clientId] = useState(() => newClientId());
  const { busy, error, run } = useRun(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const activeGoals = profile.goals.filter((g) => g.status === "active");
  const routines = planning.routines.filter((r) => !r.archived_at);
  const needle = q.trim().toLowerCase();
  const library = planning.library.filter((x) => !needle || [x.name, x.fundamento, x.objetivo, x.article].join(" ").toLowerCase().includes(needle));
  const upcoming = planning.trainings.slice(0, 40);

  async function submit(e) {
    e.preventDefault();
    const body = { kind, client_item_id: clientId, goal_id: f.goal_id || null, training_ref: f.training_ref || null, planned_on: f.planned_on || null, details: f.details };
    if (kind === "exercise") body.exercise_key = f.exercise_key;
    if (kind === "routine") body.routine_id = f.routine_id;
    if (kind === "shooting_plan") Object.assign(body, { total_shots: Number(f.total_shots), include_ft: f.include_ft, title: f.title || undefined });
    if (kind === "custom") body.title = f.title;
    if (await run(() => devApi.addPlanItem(pid, body))) await onSaved();
  }

  return (
    <Dialog title="Asignar trabajo" onClose={onClose} wide>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div className={lab.segment} role="radiogroup" aria-label="Tipo de trabajo" style={{ flexWrap: "wrap" }}>
          {PLAN_KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={cx(lab.segmentBtn, kind === k.id && lab.segmentBtnActive)} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>
        {kind === "exercise" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <input className={lab.input} placeholder="Buscar por nombre, fundamento u objetivo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ejercicio" />
            <div style={{ maxHeight: 260, overflowY: "auto", display: "grid", gap: 6 }} role="radiogroup" aria-label="Ejercicios">
              {library.map((x) => (
                <label key={x.key} className={s.pickItem} style={{ borderColor: f.exercise_key === x.key ? "var(--l-accent)" : undefined }}>
                  <input type="radio" name="exercise" value={x.key} checked={f.exercise_key === x.key} onChange={set("exercise_key")} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className={lab.sessionName}>{x.name}</div>
                    <div className={lab.sessionMeta}><span>{x.fundamento}</span><span>{x.objetivo}</span><span>{x.level}</span>{x.minutes ? <span>{x.minutes[0]}–{x.minutes[1]} min</span> : null}<span>desde {x.minPlayers} jug.</span></div>
                  </div>
                </label>
              ))}
              {!library.length ? <p className={lab.subtle}>Ningún ejercicio coincide.</p> : null}
            </div>
            <p className={lab.subtle} style={{ margin: 0 }}>Biblioteca de Basket Lab Academy. Se guarda una copia de referencia; el ejercicio original no cambia.</p>
          </div>
        ) : null}
        {kind === "routine" ? (
          routines.length ? (
            <label className={lab.field}>
              <span className={lab.label}>Rutina</span>
              <select className={lab.select} value={f.routine_id} onChange={set("routine_id")} required>
                <option value="">Elegí…</option>
                {routines.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.items.length} ejercicio(s){routineMinutes(r.items) ? ` · ${routineMinutes(r.items)} min` : ""}</option>)}
              </select>
            </label>
          ) : (
            <Notice kind="info">Todavía no tenés rutinas. Creálas desde «Mis rutinas».</Notice>
          )
        ) : null}
        {kind === "shooting_plan" ? (
          <div className={lab.formGrid}>
            <label className={lab.field}>
              <span className={lab.label}>Lanzamientos totales</span>
              <input className={lab.input} type="number" min={10} max={500} step={10} value={f.total_shots} onChange={set("total_shots")} />
            </label>
            <label className={lab.field} style={{ alignSelf: "end" }}>
              <span><input type="checkbox" checked={f.include_ft} onChange={set("include_ft")} /> Incluir tiros libres</span>
            </label>
            <p className={lab.subtle} style={{ gridColumn: "1 / -1", margin: 0 }}>El mismo plan sugerido de Shooting Lab, calculado con lo realizado en los últimos 90 días. Las zonas de objetivos activos tienen prioridad.</p>
          </div>
        ) : null}
        {kind === "custom" || kind === "shooting_plan" ? (
          <label className={lab.field}>
            <span className={lab.label}>Título{kind === "shooting_plan" ? " (opcional)" : ""}</span>
            <input className={lab.input} value={f.title} onChange={set("title")} maxLength={160} required={kind === "custom"} />
          </label>
        ) : null}
        <div className={lab.formGrid}>
          <label className={lab.field}>
            <span className={lab.label}>Objetivo (opcional)</span>
            <select className={lab.select} value={f.goal_id} onChange={set("goal_id")}>
              <option value="">Sin objetivo</option>
              {activeGoals.map((g) => <option key={g.id} value={g.id}>{g.title || g.body}</option>)}
            </select>
          </label>
          <label className={lab.field}>
            <span className={lab.label}>Entrenamiento del planificador (opcional)</span>
            <select className={lab.select} value={f.training_ref} onChange={set("training_ref")}>
              <option value="">Ninguno</option>
              {upcoming.map((t) => <option key={t.ref} value={t.ref}>{t.name}{t.date ? ` · ${formatDate(t.date)}` : ""}</option>)}
            </select>
          </label>
          <label className={lab.field}>
            <span className={lab.label}>Fecha prevista</span>
            <input className={lab.input} type="date" value={f.planned_on} onChange={set("planned_on")} />
          </label>
        </div>
        <label className={lab.field}>
          <span className={lab.label}>Indicaciones</span>
          <textarea className={lab.textarea} rows={2} maxLength={4000} value={f.details} onChange={set("details")} />
        </label>
        {!planning.trainings.length ? <p className={lab.subtle} style={{ margin: 0 }}>Tu planificador todavía no tiene entrenamientos para vincular.</p> : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={lab.btnRow}>
          <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy || (kind === "exercise" && !f.exercise_key) || (kind === "routine" && !f.routine_id)}>Asignar</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Dialog>
  );
}

function AttendanceDialog({ profile, planning, onClose, onSaved }) {
  const today = todayISO();
  const past = planning.trainings.filter((t) => t.date && t.date <= today).slice(0, 40);
  const existing = Object.fromEntries((profile.attendance || []).map((a) => [a.training_ref, a]));
  const [ref, setRef] = useState(past[0]?.ref || "");
  const [status, setStatus] = useState(existing[past[0]?.ref]?.status || "present");
  const [notes, setNotes] = useState("");
  const { busy, error, run } = useRun(null);
  return (
    <Dialog title="Registrar asistencia" onClose={onClose}>
      {past.length ? (
        <form
          style={{ display: "grid", gap: 10 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => devApi.saveAttendance({ training_ref: ref, entries: [{ player_id: profile.player.id, status, notes }] }))) await onSaved();
          }}
        >
          <label className={lab.field}>
            <span className={lab.label}>Entrenamiento</span>
            <select className={lab.select} value={ref} onChange={(e) => { setRef(e.target.value); setStatus(existing[e.target.value]?.status || "present"); }}>
              {past.map((t) => <option key={t.ref} value={t.ref}>{t.name} · {formatDate(t.date)}{existing[t.ref] ? ` (${labelOf(ATTENDANCE_STATUS, existing[t.ref].status)})` : ""}</option>)}
            </select>
          </label>
          <div className={lab.segment} role="radiogroup" aria-label="Asistencia" style={{ flexWrap: "wrap", overflow: "visible" }}>
            {ATTENDANCE_STATUS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={status === a.id} className={cx(lab.segmentBtn, status === a.id && lab.segmentBtnActive)} onClick={() => setStatus(a.id)}>{a.label}</button>
            ))}
          </div>
          <input className={lab.input} placeholder="Observación (opcional)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} aria-label="Observación" />
          <p className={lab.subtle} style={{ margin: 0 }}>Para cargar a todo el grupo de una vez, usá «Asistencia» en el menú de Jugadores.</p>
          {error ? <Notice kind="error">{error}</Notice> : null}
          <div className={lab.btnRow}>
            <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy || !ref}>Guardar</button>
            <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cancelar</button>
          </div>
        </form>
      ) : (
        <Notice kind="info">No hay entrenamientos pasados con fecha en tu planificador.</Notice>
      )}
    </Dialog>
  );
}

const EMPTY_ITEM = { title: "", minutes: "", zone_id: "", attempts: "", notes: "" };

function RoutinesDialog({ planning, onClose, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const { busy, error, run } = useRun(onChanged);
  const list = planning.routines.filter((r) => Boolean(r.archived_at) === showArchived);

  if (editing) {
    return <RoutineForm routine={editing === "new" ? null : editing} library={planning.library} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />;
  }
  return (
    <Dialog title="Mis rutinas" onClose={onClose} wide>
      <div className={lab.btnRow} style={{ marginBottom: 10 }}>
        <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} onClick={() => setEditing("new")}>+ Nueva rutina</button>
        <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Ver activas" : "Ver archivadas"}</button>
        <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={onClose}>Cerrar</button>
      </div>
      {list.length ? (
        <ul className={lab.list}>
          {list.map((r) => (
            <li key={r.id} className={lab.sessionItem}>
              <div style={{ minWidth: 0 }}>
                <div className={lab.sessionName}>{r.name}</div>
                <div className={lab.sessionMeta}><span>{r.items.length} ejercicio(s)</span>{routineMinutes(r.items) ? <span>{routineMinutes(r.items)} min</span> : null}{r.focus ? <span>{r.focus}</span> : null}</div>
              </div>
              <div className={lab.btnRow}>
                {!r.archived_at ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setEditing(r)}>Editar</button> : null}
                <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => run(() => devApi.editRoutine(r.id, { archived: !r.archived_at }))}>{r.archived_at ? "Reactivar" : "Archivar"}</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={lab.subtle}>{showArchived ? "No hay rutinas archivadas." : "Todavía no creaste rutinas."}</p>
      )}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <p className={lab.subtle}>Las rutinas son tuyas. Al asignarlas a un jugador se guarda una copia: si después cambiás la rutina, lo ya asignado no cambia.</p>
    </Dialog>
  );
}

function RoutineForm({ routine, library, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    name: routine?.name || "",
    focus: routine?.focus || "",
    description: routine?.description || "",
    items: routine?.items?.length ? routine.items.map((it) => ({ ...EMPTY_ITEM, ...it, minutes: it.minutes ?? "", attempts: it.attempts ?? "", zone_id: it.zone_id || "" })) : [{ ...EMPTY_ITEM }]
  }));
  const [libKey, setLibKey] = useState("");
  const { busy, error, run } = useRun(null);
  const setItem = (i, k, v) => setF((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  return (
    <Dialog title={routine ? "Editar rutina" : "Nueva rutina"} onClose={onClose} wide>
      <form
        style={{ display: "grid", gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const body = {
            ...f,
            items: f.items.map((it) =>
              it.type === "exercise" ? { exercise_key: it.exercise_key, minutes: it.minutes, notes: it.notes } : { title: it.title, minutes: it.minutes, zone_id: it.zone_id || null, attempts: it.attempts, notes: it.notes }
            )
          };
          if (await run(() => (routine ? devApi.editRoutine(routine.id, body) : devApi.addRoutine(body)))) await onSaved();
        }}
      >
        <div className={lab.formGrid}>
          <label className={lab.field}>
            <span className={lab.label}>Nombre</span>
            <input className={lab.input} value={f.name} maxLength={120} required onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder="Ej.: Triples desde recepción" />
          </label>
          <label className={lab.field}>
            <span className={lab.label}>Foco (opcional)</span>
            <input className={lab.input} value={f.focus} maxLength={80} onChange={(e) => setF((x) => ({ ...x, focus: e.target.value }))} placeholder="Ej.: Tiro" />
          </label>
        </div>
        <p className={lab.stepLabel} style={{ margin: 0 }}>Ejercicios</p>
        {f.items.map((it, i) => (
          <div key={i} className={s.stackItem}>
            {it.type === "exercise" ? (
              <div className={lab.sessionName}>{it.title} <span className={lab.subtle}>· biblioteca</span></div>
            ) : (
              <input className={lab.input} value={it.title} maxLength={160} placeholder={`Ejercicio ${i + 1}`} onChange={(e) => setItem(i, "title", e.target.value)} aria-label={`Ejercicio ${i + 1}`} required />
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              <input className={lab.input} type="number" min={1} max={240} value={it.minutes} placeholder="Minutos" onChange={(e) => setItem(i, "minutes", e.target.value)} aria-label="Minutos" />
              {it.type !== "exercise" ? (
                <>
                  <select className={lab.select} value={it.zone_id} onChange={(e) => setItem(i, "zone_id", e.target.value)} aria-label="Zona de tiro">
                    <option value="">Sin zona de tiro</option>
                    {FIELD_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                    <option value="ft">Tiro libre</option>
                  </select>
                  <input className={lab.input} type="number" min={1} max={1000} value={it.attempts} placeholder="Lanzamientos" onChange={(e) => setItem(i, "attempts", e.target.value)} aria-label="Lanzamientos" />
                </>
              ) : null}
            </div>
            <div className={lab.btnRow}>
              <input className={lab.input} value={it.notes || ""} maxLength={500} placeholder="Consigna (opcional)" onChange={(e) => setItem(i, "notes", e.target.value)} aria-label="Consigna" style={{ flex: 1 }} />
              {f.items.length > 1 ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setF((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}>Quitar</button> : null}
            </div>
          </div>
        ))}
        <div className={lab.btnRow}>
          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setF((x) => ({ ...x, items: [...x.items, { ...EMPTY_ITEM }] }))}>+ Ejercicio propio</button>
          <select className={lab.select} value={libKey} onChange={(e) => setLibKey(e.target.value)} aria-label="Ejercicio de la biblioteca" style={{ maxWidth: 320 }}>
            <option value="">Agregar de la biblioteca…</option>
            {library.map((x) => <option key={x.key} value={x.key}>{x.name} · {x.fundamento}</option>)}
          </select>
          <button
            type="button"
            className={cx(lab.btn, lab.btnGhost, lab.btnSmall)}
            disabled={!libKey}
            onClick={() => {
              const ex = library.find((x) => x.key === libKey);
              if (ex) setF((x) => ({ ...x, items: [...x.items, { ...EMPTY_ITEM, type: "exercise", exercise_key: ex.key, title: ex.name, minutes: ex.minutes ? ex.minutes[1] : "" }] }));
              setLibKey("");
            }}
          >
            Agregar
          </button>
        </div>
        <label className={lab.field}>
          <span className={lab.label}>Descripción (opcional)</span>
          <textarea className={lab.textarea} rows={2} maxLength={2000} value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} />
        </label>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={lab.btnRow}>
          <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy}>Guardar rutina</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Volver</button>
        </div>
      </form>
    </Dialog>
  );
}

export { PLAN_STATUS };
