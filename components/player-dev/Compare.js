"use client";

import { useEffect, useMemo, useState } from "react";
import { DIMENSIONS } from "@/lib/player-dev/catalog";
import { COMPARE_ROWS, comparePlayers, formatValue, metricByKey } from "@/lib/player-dev/goals";
import { criteriaCatalog, dimensionSummary } from "@/lib/player-dev/model";
import { todayISO } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import { Avatar } from "./Roster";

const MAX = 4;
const PERIODS = [
  { id: "30", label: "30 días", days: 30 },
  { id: "90", label: "90 días", days: 90 },
  { id: "365", label: "12 meses", days: 365 },
  { id: "all", label: "Todo", days: null }
];

function fromFor(id) {
  const p = PERIODS.find((x) => x.id === id);
  if (!p?.days) return null;
  const d = new Date(`${todayISO()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (p.days - 1));
  return d.toISOString().slice(0, 10);
}

/** Comparación entre jugadores con acceso autorizado. No es un ranking. */
export default function Compare({ roster, initialIds = [], onIds, onOpen }) {
  const players = roster.players.filter((p) => p.status !== "archived");
  const [ids, setIds] = useState(() => initialIds.filter((id) => players.some((p) => p.id === id)).slice(0, MAX));
  const [period, setPeriod] = useState("90");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onIds?.(ids);
    if (ids.length < 2) {
      setData(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    devApi
      .compare(ids)
      .then((r) => alive && (setData(r.players), setError(null)))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (!data) return null;
    return comparePlayers(data, {
      from: fromFor(period),
      to: todayISO(),
      dimensionSummaryFn: (p) => dimensionSummary(p.assessments, criteriaCatalog(p.criteria))
    });
  }, [data, period]);

  const toggle = (id) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]));
  let lastSection = null;

  return (
    <>
      <div className={lab.pageHead}>
        <div>
          <h1 className={lab.h1}>Comparar jugadores</h1>
          <p className={lab.lede}>Elegí de 2 a {MAX} jugadores. Se miden con las mismas métricas y el mismo período.</p>
        </div>
      </div>
      <Notice kind="info">
        No es un ranking ni una medida del talento: posición, categoría, contexto y cantidad de registros cambian mucho los números. Los datos con muestra chica se muestran atenuados.
      </Notice>
      <section className={lab.card} style={{ marginTop: 12 }}>
        <div className={lab.chipsWrap}>
          {players.map((p) => (
            <button key={p.id} type="button" className={cx(lab.chip, ids.includes(p.id) && lab.chipActive)} aria-pressed={ids.includes(p.id)} disabled={!ids.includes(p.id) && ids.length >= MAX} onClick={() => toggle(p.id)}>
              {p.display_name}
            </button>
          ))}
        </div>
        <div className={lab.segment} role="radiogroup" aria-label="Período" style={{ marginTop: 12 }}>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={period === p.id} className={cx(lab.segmentBtn, period === p.id && lab.segmentBtnActive)} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>
      </section>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {ids.length < 2 ? <p className={lab.subtle} style={{ marginTop: 12 }}>Elegí al menos dos jugadores.</p> : null}
      {loading && !rows ? <div className={lab.skeleton} style={{ height: 240, marginTop: 12 }} /> : null}
      {rows ? (
        <section className={lab.card} style={{ marginTop: 12 }}>
          <div className={lab.tableWrap}>
            <table className={lab.table}>
              <thead>
                <tr>
                  <th>Dato</th>
                  {rows.map((r) => (
                    <th key={r.player.id} className={lab.num}>
                      <button type="button" onClick={() => onOpen(r.player.id)} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Avatar player={r.player} />
                        <span>{r.player.display_name}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={rows.length + 1} style={{ fontWeight: 700, paddingTop: 14 }}>Contexto</td></tr>
                {[["Posición", (r) => r.player.position], ["Categoría", (r) => r.player.category], ["Edad", (r) => r.player.age]].map(([l, f]) => (
                  <tr key={l}><td>{l}</td>{rows.map((r) => <td key={r.player.id} className={lab.num}>{f(r) ?? "—"}</td>)}</tr>
                ))}
                <tr><td>Registros en el período</td>{rows.map((r) => <td key={r.player.id} className={lab.num}>{r.records.sessions} ses. · {r.records.matches} part. · {r.records.assessments} eval.</td>)}</tr>
                <tr><td colSpan={rows.length + 1} style={{ fontWeight: 700, paddingTop: 14 }}>Perfil técnico (última evaluación)</td></tr>
                {DIMENSIONS.filter((d) => rows.some((r) => r.technical?.find((t) => t.dimension.id === d.id)?.evaluated)).map((d) => (
                  <tr key={d.id}>
                    <td>{d.label}</td>
                    {rows.map((r) => {
                      const t = r.technical?.find((x) => x.dimension.id === d.id);
                      return <td key={r.player.id} className={lab.num}>{t?.evaluated ? `${t.score}%` : <span className={lab.subtle}>sin evaluar</span>}</td>;
                    })}
                  </tr>
                ))}
                {COMPARE_ROWS.map((row) => {
                  const metric = metricByKey(row.key);
                  const head = row.section !== lastSection ? (lastSection = row.section) : null;
                  return [
                    head ? <tr key={`h-${row.section}`}><td colSpan={rows.length + 1} style={{ fontWeight: 700, paddingTop: 14 }}>{row.section}</td></tr> : null,
                    <tr key={row.key}>
                      <td>{metric.label}</td>
                      {rows.map((r) => {
                        const m = r.metrics[row.key];
                        return (
                          <td key={r.player.id} className={lab.num} style={!m.enough ? { opacity: 0.55 } : undefined} title={!m.enough ? `Muestra chica: ${m.sample} de ${m.minSample} ${m.sampleUnit}` : undefined}>
                            {formatValue(m.value, metric.unit === "%" ? "%" : "")}
                            {metric.kind !== "count" && m.sample ? <span className={lab.subtle}> ({m.sample} {m.sampleUnit})</span> : null}
                          </td>
                        );
                      })}
                    </tr>
                  ];
                })}
                <tr><td colSpan={rows.length + 1} style={{ fontWeight: 700, paddingTop: 14 }}>Objetivos</td></tr>
                <tr><td>Activos / cumplidos</td>{rows.map((r) => <td key={r.player.id} className={lab.num}>{r.goals.active} / {r.goals.completed}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className={lab.subtle}>Lanzamiento de entrenamiento: solo registros propios de cada jugador (las sesiones grupales históricas no se reparten). Partidos y entrenamientos van por separado.</p>
        </section>
      ) : null}
    </>
  );
}
