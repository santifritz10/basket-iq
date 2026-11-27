"use client";

import { useEffect, useMemo, useState } from "react";
import { ATTENDANCE_STATUS, PLAN_KINDS, PLAN_STATUS } from "@/lib/player-dev/plan";
import { labelOf } from "@/lib/player-dev/goals";
import { formatDate, todayISO } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import s from "./dev.module.css";

/**
 * Asistencia grupal a un entrenamiento del planificador + trabajo individual vinculado.
 * Solo lectura del planificador: los entrenamientos no se modifican.
 */
export default function Attendance({ roster, onOpen }) {
  const [planning, setPlanning] = useState(null);
  const [error, setError] = useState(null);
  const [ref, setRef] = useState("");
  const [overview, setOverview] = useState(null);
  const [marks, setMarks] = useState({});
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = todayISO();

  useEffect(() => {
    devApi
      .planning()
      .then((p) => {
        setPlanning(p);
        const past = p.trainings.filter((t) => t.date && t.date <= today);
        if (past[0]) setRef(past[0].ref);
      })
      .catch((e) => setError(e.message));
  }, [today]);

  useEffect(() => {
    if (!ref) return;
    setOverview(null);
    setSaved(false);
    devApi
      .trainingOverview(ref)
      .then((o) => {
        setOverview(o);
        setMarks(Object.fromEntries(o.attendance.map((a) => [a.player_id, { status: a.status, notes: a.notes || "" }])));
      })
      .catch((e) => setError(e.message));
  }, [ref]);

  const training = planning?.trainings.find((t) => t.ref === ref);
  const future = training?.date && training.date > today;
  const team = roster.teams.find((t) => t.id === teamId);
  const players = useMemo(() => {
    const list = (overview?.players || []).filter((p) => p.access_level === "admin" || p.access_level === "editor");
    const scoped = team ? list.filter((p) => team.player_ids.includes(p.id)) : list;
    return scoped.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [overview, team]);
  const itemsByPlayer = useMemo(() => {
    const out = {};
    (overview?.items || []).forEach((it) => (out[it.player_id] = out[it.player_id] || []).push(it));
    return out;
  }, [overview]);

  if (planning && planning.schema?.plan === false) {
    return <Notice kind="warn">Para registrar asistencia falta correr <code>docs/sql/014-player-plan.sql</code> en Supabase.</Notice>;
  }

  const setMark = (id, patch) => {
    setSaved(false);
    setMarks((m) => ({ ...m, [id]: { status: "present", notes: "", ...m[id], ...patch } }));
  };
  const entries = players.filter((p) => marks[p.id]?.status).map((p) => ({ player_id: p.id, status: marks[p.id].status, notes: marks[p.id].notes }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await devApi.saveAttendance({ training_ref: ref, entries });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={lab.stack}>
      <div>
        <h1 className={lab.h1}>Asistencia</h1>
        <p className={lab.lede}>Elegí un entrenamiento de tu planificador y marcá quién participó. El planificador no se modifica.</p>
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!planning ? <div className={lab.skeleton} style={{ height: 120 }} /> : null}
      {planning && !planning.trainings.length ? <Notice kind="info">Tu planificador todavía no tiene entrenamientos.</Notice> : null}
      {planning && planning.trainings.length ? (
        <section className={lab.card}>
          <div className={lab.filters} style={{ marginBottom: 0 }}>
            <label className={lab.field} style={{ flex: 2, minWidth: 220 }}>
              <span className={lab.label}>Entrenamiento</span>
              <select className={lab.select} value={ref} onChange={(e) => setRef(e.target.value)}>
                <option value="">Elegí…</option>
                {planning.trainings.map((t) => (
                  <option key={t.ref} value={t.ref}>{t.name}{t.date ? ` · ${formatDate(t.date)}` : " · sin fecha"}</option>
                ))}
              </select>
            </label>
            {roster.teams.length ? (
              <label className={lab.field} style={{ flex: 1, minWidth: 160 }}>
                <span className={lab.label}>Equipo</span>
                <select className={lab.select} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">Todos mis jugadores</option>
                  {roster.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          {training ? (
            <p className={lab.subtle} style={{ marginBottom: 0 }}>
              {training.category ? `${training.category} · ` : ""}{training.blocks} bloque(s){training.minutes ? ` · ${training.minutes} min` : ""}
            </p>
          ) : null}
        </section>
      ) : null}

      {ref && !overview && !error ? <div className={lab.skeleton} style={{ height: 200 }} /> : null}
      {overview && training ? (
        <section className={lab.card}>
          {!training.date ? <Notice kind="warn">Este entrenamiento no tiene fecha en el planificador: poné la fecha para poder registrar asistencia.</Notice> : null}
          {future ? <Notice kind="info">Es un entrenamiento futuro: la asistencia se registra cuando ya pasó. Abajo ves el trabajo individual planificado.</Notice> : null}
          <div className={lab.cardHead}>
            <h2 className={lab.cardTitle}>Jugadores ({players.length})</h2>
            {training.date && !future ? (
              <div className={lab.btnRow}>
                <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => players.forEach((p) => !marks[p.id]?.status && setMark(p.id, { status: "present" }))}>Todos presentes</button>
              </div>
            ) : null}
          </div>
          {players.length ? (
            <ul className={lab.list}>
              {players.map((p) => {
                const m = marks[p.id] || {};
                const items = itemsByPlayer[p.id] || [];
                return (
                  <li key={p.id} className={s.stackItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => onOpen(p.id)} style={{ fontWeight: 600, background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer", font: "inherit", textAlign: "left" }}>{p.display_name}</button>
                      {training.date && !future ? (
                        <div className={lab.segment} role="radiogroup" aria-label={`Asistencia de ${p.display_name}`} style={{ flexWrap: "wrap", overflow: "visible" }}>
                          {ATTENDANCE_STATUS.map((a) => (
                            <button key={a.id} type="button" role="radio" aria-checked={m.status === a.id} className={cx(lab.segmentBtn, m.status === a.id && lab.segmentBtnActive)} onClick={() => setMark(p.id, { status: a.id })}>{a.label}</button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {m.status && m.status !== "present" ? (
                      <input className={lab.input} value={m.notes || ""} maxLength={1000} placeholder="Observación (opcional)" aria-label={`Observación de ${p.display_name}`} onChange={(e) => setMark(p.id, { notes: e.target.value })} />
                    ) : null}
                    {items.length ? (
                      <div className={lab.sessionMeta}>
                        {items.map((it) => (
                          <span key={it.id}>{labelOf(PLAN_KINDS, it.kind)}: {it.title} · <strong>{labelOf(PLAN_STATUS, it.status)}</strong></span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={lab.subtle}>No hay jugadores que puedas editar{team ? " en este equipo" : ""}.</p>
          )}
          {training.date && !future && players.length ? (
            <div className={lab.btnRow} style={{ marginTop: 12 }}>
              <button type="button" className={cx(lab.btn, lab.btnPrimary)} disabled={busy || !entries.length} onClick={save}>Guardar asistencia ({entries.length})</button>
              {saved ? <span className={lab.subtle} role="status">Guardado.</span> : null}
            </div>
          ) : null}
          <p className={lab.subtle}>Solo se guarda a quienes marcaste. El trabajo individual se marca como realizado desde el perfil de cada jugador.</p>
        </section>
      ) : null}
    </div>
  );
}
