"use client";

import { useMemo, useState } from "react";
import { DIMENSIONS } from "@/lib/player-dev/catalog";
import { isStructured, measureGoal, periodSummary, shootingDays, technicalTimeline, weeklyVolume } from "@/lib/player-dev/goals";
import { criteriaCatalog, pctText } from "@/lib/player-dev/model";
import { compareZoneMaps, timelineByDate, summarizeZoneMap } from "@/lib/shooting/model";
import { formatDate, todayISO } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import TrendCharts from "@/components/shooting-lab/TrendCharts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import { Bars } from "./MiniCharts";
import s from "./dev.module.css";

const MIN = 20;

function shift(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { id: "30", label: "30 días", days: 30 },
  { id: "90", label: "90 días", days: 90 },
  { id: "180", label: "6 meses", days: 182 }
];

function periods(preset, today) {
  const p = PRESETS.find((x) => x.id === preset) || PRESETS[0];
  const bTo = today;
  const bFrom = shift(today, -(p.days - 1));
  const aTo = shift(bFrom, -1);
  const aFrom = shift(aTo, -(p.days - 1));
  return { a: { from: aFrom, to: aTo }, b: { from: bFrom, to: bTo } };
}

const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: 1 }));

function Delta({ a, b, lowerIsBetter = false, unit = "" }) {
  if (a == null || b == null) return <span className={lab.subtle}>—</span>;
  const d = Math.round((b - a) * 10) / 10;
  if (!d) return <span>=</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return <span style={{ color: good ? "#5fd39a" : "#f5c451" }}>{d > 0 ? "+" : ""}{fmt(d)}{unit}</span>;
}

export default function EvolutionTab({ profile, canEdit, onChanged }) {
  const today = todayISO();
  const [preset, setPreset] = useState("30");
  const days = useMemo(() => shootingDays(profile), [profile]);
  const per = periods(preset, today);
  const A = useMemo(() => periodSummary(profile, { ...per.a, days }), [profile, days, per.a.from, per.a.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const B = useMemo(() => periodSummary(profile, { ...per.b, days }), [profile, days, per.b.from, per.b.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const timeline = useMemo(
    () => timelineByDate(days.map((d) => { const t = summarizeZoneMap(d.map).fg; return { fecha: d.date, attempts: t.attempts, made: t.made }; })),
    [days]
  );
  const weeks = useMemo(() => weeklyVolume(days, { from: shift(today, -7 * 26), to: today }), [days, today]);
  const tech = useMemo(() => technicalTimeline(profile.assessments, DIMENSIONS).slice(-6), [profile.assessments]);
  const techDims = DIMENSIONS.filter((d) => tech.some((b) => b.scores[d.id] != null));
  const zones = compareZoneMaps(A.shooting.byZone, B.shooting.byZone, MIN).filter((z) => z.a.attempts || z.b.attempts);
  const matches = profile.stats.filter((r) => r.record_type === "match").slice(0, 10);
  const criteria = useMemo(() => criteriaCatalog(profile.criteria), [profile.criteria]);
  const structured = profile.goals.filter(isStructured);
  const goalState = structured.map((g) => ({ g, m: measureGoal(g, profile, { today, criteria, days }) }));
  const pctOrDash = (l) => (l.attempts >= MIN ? pctText(l.made, l.attempts) : l.attempts ? `${l.made}/${l.attempts}` : "—");
  const pctVal = (l) => (l.attempts >= MIN ? (l.made / l.attempts) * 100 : null);

  const rows = [
    ["Sesiones de tiro", A.sessions, B.sessions, fmt, false, ""],
    ["Lanzamientos", A.attempts, B.attempts, fmt, false, ""],
    ["% de campo", A.shooting.fg, B.shooting.fg, "pct"],
    ["% de triples", A.shooting.three, B.shooting.three, "pct"],
    ["% de libres", A.shooting.ft, B.shooting.ft, "pct"],
    ["Partidos", A.matches, B.matches, fmt, false, ""],
    ["Puntos por partido", A.matchAvg.points, B.matchAvg.points, fmt, false, ""],
    ["Pérdidas por partido", A.matchAvg.turnovers, B.matchAvg.turnovers, fmt, true, ""]
  ];

  return (
    <div className={lab.stack}>
      <section className={lab.card}>
        <div className={lab.cardHead}>
          <div>
            <h2 className={lab.cardTitle}>Comparación de períodos</h2>
            <p className={lab.cardHint}>{formatDate(per.a.from)} – {formatDate(per.a.to)} frente a {formatDate(per.b.from)} – {formatDate(per.b.to)}.</p>
          </div>
          <div className={lab.segment} role="radiogroup" aria-label="Período">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} className={cx(lab.segmentBtn, preset === p.id && lab.segmentBtnActive)} onClick={() => setPreset(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className={lab.tableWrap}>
          <table className={lab.table}>
            <thead><tr><th>Dato</th><th className={lab.num}>Anterior</th><th className={lab.num}>Último</th><th className={lab.num}>Cambio</th></tr></thead>
            <tbody>
              {rows.map(([label, a, b, f, lower, unit]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {f === "pct" ? (
                    <>
                      <td className={lab.num}>{pctOrDash(a)}</td>
                      <td className={lab.num}>{pctOrDash(b)}</td>
                      <td className={lab.num}><Delta a={pctVal(a)} b={pctVal(b)} unit=" pts" /></td>
                    </>
                  ) : (
                    <>
                      <td className={lab.num}>{f(a)}</td>
                      <td className={lab.num}>{f(b)}</td>
                      <td className={lab.num}><Delta a={a} b={b} lowerIsBetter={lower} unit={unit} /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={lab.subtle}>Los porcentajes se comparan solo con {MIN} intentos o más en cada período; si no, se muestra el conteo. Entrenamiento y partidos nunca se suman.</p>
      </section>

      <div className={cx(lab.grid, lab.gridMain)}>
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Lanzamiento en entrenamiento</h2></div>
          <TrendCharts points={timeline} minSample={MIN} />
        </section>
        <section className={lab.card}>
          <div className={lab.cardHead}>
            <div>
              <h2 className={lab.cardTitle}>Volumen por semana</h2>
              <p className={lab.cardHint}>Lanzamientos registrados, últimos 6 meses.</p>
            </div>
          </div>
          <Bars
            items={weeks.map((w) => ({ label: `${Number(w.from.slice(8))}/${Number(w.from.slice(5, 7))}`, value: w.attempts, title: `Semana del ${formatDate(w.from)} · ${w.attempts} tiros en ${w.sessions} sesión(es)` }))}
            label="Lanzamientos por semana"
          />
        </section>
      </div>

      <section className={lab.card}>
        <div className={lab.cardHead}>
          <div>
            <h2 className={lab.cardTitle}>Evolución por zona</h2>
            <p className={lab.cardHint}>Mismos períodos de arriba. El cambio se muestra solo con {MIN} intentos o más en ambos.</p>
          </div>
        </div>
        {zones.length ? (
          <div className={lab.tableWrap}>
            <table className={lab.table}>
              <thead><tr><th>Zona</th><th className={lab.num}>Anterior</th><th className={lab.num}>Último</th><th className={lab.num}>Cambio</th></tr></thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.zone.id}>
                    <td>{z.zone.label}</td>
                    <td className={lab.num}>{z.a.attempts ? `${pctText(z.a.made, z.a.attempts)} (${z.a.made}/${z.a.attempts})` : "—"}</td>
                    <td className={lab.num}>{z.b.attempts ? `${pctText(z.b.made, z.b.attempts)} (${z.b.made}/${z.b.attempts})` : "—"}</td>
                    <td className={lab.num}>{z.comparable ? <Delta a={z.pctA} b={z.pctB} unit=" pts" /> : <span className={lab.subtle}>muestra chica</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={lab.subtle}>Sin lanzamientos propios en estos períodos.</p>
        )}
      </section>

      <div className={cx(lab.grid, lab.gridMain)}>
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Evolución técnica</h2></div>
          {tech.length && techDims.length ? (
            <div className={lab.tableWrap}>
              <table className={lab.table}>
                <thead>
                  <tr><th>Fundamento</th>{tech.map((b) => <th key={b.batch_id} className={lab.num}>{formatDate(b.date).replace(/ de \d{4}$/, "")}</th>)}</tr>
                </thead>
                <tbody>
                  {techDims.map((d) => (
                    <tr key={d.id}>
                      <td>{d.label}</td>
                      {tech.map((b) => <td key={b.batch_id} className={lab.num}>{b.scores[d.id] == null ? "—" : `${b.scores[d.id]}%`}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={lab.subtle}>Sin evaluaciones con fecha todavía.</p>
          )}
          <p className={lab.subtle}>Puntaje de cada fundamento en cada evaluación (promedio de sus criterios sobre la escala). «—» es «no evaluado ese día».</p>
        </section>
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Cumplimiento de objetivos</h2></div>
          <div className={s.facts}>
            <span><strong>{profile.goals.filter((g) => g.status === "completed").length}</strong>cumplidos</span>
            <span><strong>{profile.goals.filter((g) => g.status === "active").length}</strong>activos</span>
            <span><strong>{goalState.filter((x) => x.g.status === "active" && x.m.overdue).length}</strong>vencidos</span>
          </div>
          {goalState.filter((x) => x.g.status === "active" && x.m.metric).length ? (
            <ul className={lab.list} style={{ marginTop: 10 }}>
              {goalState.filter((x) => x.g.status === "active" && x.m.metric).map(({ g, m }) => (
                <li key={g.id} className={s.dimRow}>
                  <span>{g.title}</span>
                  <div className={s.bar}><div className={s.barFill} style={{ width: `${Math.round((m.progress || 0) * 100)}%`, background: m.reached ? "#5fd39a" : undefined }} /></div>
                  <span className={lab.num}>{m.progress == null ? "—" : `${Math.round(m.progress * 100)}%`}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <section className={lab.card}>
        <div className={lab.cardHead}><h2 className={lab.cardTitle}>Últimos partidos</h2></div>
        {matches.length ? (
          <div className={lab.tableWrap}>
            <table className={lab.table}>
              <thead><tr><th>Fecha</th><th>Rival</th><th className={lab.num}>Min</th><th className={lab.num}>Pts</th><th className={lab.num}>Campo</th><th className={lab.num}>Reb</th><th className={lab.num}>Ast</th><th className={lab.num}>Pérd</th></tr></thead>
              <tbody>
                {matches.map((r) => {
                  const made = (r.fg2_made ?? 0) + (r.fg3_made ?? 0);
                  const att = (r.fg2_att ?? 0) + (r.fg3_att ?? 0);
                  return (
                    <tr key={r.id}>
                      <td>{formatDate(r.played_on)}</td>
                      <td>{r.opponent || "—"}</td>
                      <td className={lab.num}>{fmt(r.minutes)}</td>
                      <td className={lab.num}>{fmt(r.points)}</td>
                      <td className={lab.num}>{att ? `${made}/${att}` : "—"}</td>
                      <td className={lab.num}>{r.oreb == null && r.dreb == null ? "—" : (r.oreb || 0) + (r.dreb || 0)}</td>
                      <td className={lab.num}>{fmt(r.assists)}</td>
                      <td className={lab.num}>{fmt(r.turnovers)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={lab.subtle}>Sin partidos registrados. Se cargan desde Estadísticas.</p>
        )}
      </section>

      <Milestones profile={profile} canEdit={canEdit} onChanged={onChanged} />

      <section className={lab.card}>
        <div className={lab.cardHead}>
          <div>
            <h2 className={lab.cardTitle}>Registro de actividad</h2>
            <p className={lab.cardHint}>Qué se hizo y cuándo. La evolución de arriba se calcula con los datos, no con este registro.</p>
          </div>
        </div>
        {profile.activity.length ? (
          <ul className={s.timeline}>
            {profile.activity.map((a) => (
              <li key={a.id} className={s.timelineItem}>
                <span className={s.timelineDate}>{formatDate(String(a.created_at).slice(0, 10))}</span>
                <span>{a.summary || a.event_type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={lab.subtle}>Sin actividad registrada.</p>
        )}
      </section>
    </div>
  );
}

function Milestones({ profile, canEdit, onChanged }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  return (
    <section className={lab.card}>
      <div className={lab.cardHead}><h2 className={lab.cardTitle}>Hitos registrados por el entrenador</h2></div>
      {canEdit ? (
        <form
          style={{ display: "flex", gap: 8, marginBottom: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setBusy(true);
            setError(null);
            try {
              await devApi.addEvolution(profile.player.id, text.trim());
              setText("");
              await onChanged();
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input className={lab.input} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Ej.: Empezó a finalizar con mano izquierda en contraataque" aria-label="Nuevo hito" />
          <button type="submit" className={cx(lab.btn, lab.btnSmall)} disabled={busy || !text.trim()}>Agregar</button>
        </form>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {profile.evolution.length ? (
        <ul className={s.timeline}>
          {profile.evolution.map((e) => (
            <li key={e.id} className={s.timelineItem}>
              <span className={s.timelineDate}>{formatDate(String(e.created_at).slice(0, 10))}</span>
              <span style={{ whiteSpace: "pre-wrap" }}>{e.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={lab.subtle}>Sin hitos.</p>
      )}
    </section>
  );
}
