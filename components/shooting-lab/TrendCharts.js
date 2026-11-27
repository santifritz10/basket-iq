"use client";

import { useState } from "react";
import { pctLabel } from "@/lib/shooting/model";
import styles from "./lab.module.css";

const W = 640;
const PAD = { l: 40, r: 12, t: 12, b: 26 };

function fmtDate(iso) {
  const [y, m, d] = String(iso).split("-");
  return `${Number(d)}/${Number(m)}${y ? "" : ""}`;
}

/**
 * Evolución de la efectividad (línea) y del volumen (barras) por fecha de sesión.
 * Son dos gráficos con su propio eje: nunca un gráfico con dos escalas.
 * points: [{ fecha, attempts, made, pct }]
 */
export default function TrendCharts({ points, minSample }) {
  const [hover, setHover] = useState(null);
  if (!points.length) {
    return <p className={styles.subtle}>Todavía no hay sesiones con lanzamientos en este período.</p>;
  }
  const n = points.length;
  const innerW = W - PAD.l - PAD.r;
  const x = (i) => PAD.l + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const H1 = 170;
  const y1 = (p) => PAD.t + (1 - p / 100) * (H1 - PAD.t - PAD.b);
  const H2 = 110;
  const maxV = Math.max(...points.map((p) => p.attempts), 1);
  const y2 = (v) => PAD.t + (1 - v / maxV) * (H2 - PAD.t - PAD.b);
  const barW = Math.max(4, Math.min(28, innerW / n - 6));
  const linePts = points.map((p, i) => (p.pct == null ? null : `${x(i).toFixed(1)},${y1(p.pct).toFixed(1)}`)).filter(Boolean);
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const hp = hover != null ? points[hover] : null;

  return (
    <div className={styles.relative} onMouseLeave={() => setHover(null)}>
      <svg className={styles.chart} viewBox={`0 0 ${W} ${H1}`} role="img" aria-label="Efectividad de tiros de campo por sesión">
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y1(t)} y2={y1(t)} stroke="rgba(255,255,255,0.07)" />
            <text x={PAD.l - 8} y={y1(t) + 4} textAnchor="end" fontSize="11" fill="#7d8396">{t}%</text>
          </g>
        ))}
        {linePts.length > 1 ? <polyline points={linePts.join(" ")} fill="none" stroke="#ff8a1f" strokeWidth="2" strokeLinejoin="round" /> : null}
        {points.map((p, i) =>
          p.pct == null ? null : (
            <circle
              key={p.fecha}
              cx={x(i)}
              cy={y1(p.pct)}
              r={hover === i ? 6 : 4.5}
              fill={p.attempts < minSample ? "#0a0b10" : "#ff8a1f"}
              stroke="#ff8a1f"
              strokeWidth="2"
            />
          )
        )}
        {hover != null ? <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H1 - PAD.b} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" /> : null}
        {points.map((p, i) => (
          <rect
            key={`h-${p.fecha}`}
            x={x(i) - innerW / Math.max(1, n) / 2}
            y={0}
            width={innerW / Math.max(1, n)}
            height={H1}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
          />
        ))}
      </svg>
      <p className={styles.subtle} style={{ margin: "2px 0 8px" }}>
        Punto vacío: sesión con menos de {minSample} intentos (muestra chica, interpretar con cuidado).
      </p>
      <svg className={styles.chart} viewBox={`0 0 ${W} ${H2}`} role="img" aria-label="Volumen de lanzamientos por sesión">
        <line x1={PAD.l} x2={W - PAD.r} y1={y2(0)} y2={y2(0)} stroke="rgba(255,255,255,0.18)" />
        <text x={PAD.l - 8} y={y2(maxV) + 4} textAnchor="end" fontSize="11" fill="#7d8396">{maxV}</text>
        <text x={PAD.l - 8} y={y2(0) + 4} textAnchor="end" fontSize="11" fill="#7d8396">0</text>
        {points.map((p, i) => {
          const h = y2(0) - y2(p.attempts);
          return (
            <path
              key={p.fecha}
              d={`M${x(i) - barW / 2} ${y2(0)}V${y2(0) - Math.max(0, h - 4)}q0 -4 4 -4h${barW - 8}q4 0 4 4V${y2(0)}Z`}
              fill={hover === i ? "#ffb066" : "rgba(255,138,31,0.6)"}
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={`l-${p.fecha}`} x={x(i)} y={H2 - 6} textAnchor="middle" fontSize="11" fill="#7d8396">{fmtDate(p.fecha)}</text>
          ) : null
        )}
      </svg>
      {hp ? (
        <div className={styles.chartTip} style={{ left: `${(x(hover) / W) * 100}%`, top: 18 }}>
          <strong>{fmtDate(hp.fecha)}</strong> · {hp.made}/{hp.attempts} · {pctLabel(hp.made, hp.attempts)}
        </div>
      ) : null}
      <details className={styles.details} style={{ marginTop: 8 }}>
        <summary>Ver como tabla</summary>
        <div className={styles.tableWrap} style={{ marginTop: 8 }}>
          <table className={styles.table}>
            <thead>
              <tr><th>Fecha</th><th className={styles.num}>Aciertos</th><th className={styles.num}>Intentos</th><th className={styles.num}>%</th></tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.fecha}>
                  <td>{p.fecha}</td>
                  <td className={styles.num}>{p.made}</td>
                  <td className={styles.num}>{p.attempts}</td>
                  <td className={styles.num}>{pctLabel(p.made, p.attempts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
