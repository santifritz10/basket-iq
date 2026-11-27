"use client";

import { useState } from "react";
import { formatValue } from "@/lib/player-dev/goals";
import lab from "@/components/shooting-lab/lab.module.css";

const W = 560;
const PAD = { l: 44, r: 14, t: 14, b: 26 };
const ACCENT = "#ff8a1f";

function fmtDate(iso) {
  const [, m, d] = String(iso).split("-");
  return `${Number(d)}/${Number(m)}`;
}

/**
 * Línea de un valor en el tiempo, con la meta como línea de referencia.
 * series: [{ date, value, sample? }]. Un solo eje.
 */
export function LineWithTarget({ series, target = null, baseline = null, unit = "", label = "Evolución", minSample = 0 }) {
  const [hover, setHover] = useState(null);
  if (!series?.length) return <p className={lab.subtle}>Todavía no hay datos en el período.</p>;
  const H = 180;
  const vals = series.map((p) => p.value).concat([target, baseline].filter((v) => v != null));
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (unit === "%") {
    lo = Math.max(0, Math.floor((lo - 5) / 10) * 10);
    hi = Math.min(100, Math.ceil((hi + 5) / 10) * 10);
  } else {
    const pad = (hi - lo) * 0.15 || Math.max(1, Math.abs(hi) * 0.2);
    lo = Math.max(0, lo - pad);
    hi += pad;
  }
  if (hi === lo) hi = lo + 1;
  const n = series.length;
  const innerW = W - PAD.l - PAD.r;
  const x = (i) => PAD.l + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const hp = hover != null ? series[hover] : null;
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  return (
    <div className={lab.relative} onMouseLeave={() => setHover(null)}>
      <svg className={lab.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ maxWidth: 720 }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.07)" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#7d8396">{formatValue(Math.round(t * 10) / 10, unit === "%" ? "%" : "")}</text>
          </g>
        ))}
        {target != null ? (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} stroke="#5fd39a" strokeDasharray="5 4" strokeWidth="1.5" />
            <text x={W - PAD.r} y={y(target) - 5} textAnchor="end" fontSize="11" fill="#5fd39a">Meta {formatValue(target, unit)}</text>
          </g>
        ) : null}
        {baseline != null ? (
          <line x1={PAD.l} x2={W - PAD.r} y1={y(baseline)} y2={y(baseline)} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 4" />
        ) : null}
        {n > 1 ? (
          <polyline points={series.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" />
        ) : null}
        {series.map((p, i) => (
          <circle
            key={`${p.date}-${i}`}
            cx={x(i)}
            cy={y(p.value)}
            r={hover === i ? 6 : 4.5}
            fill={p.sample != null && p.sample < minSample ? "#0a0b10" : ACCENT}
            stroke={ACCENT}
            strokeWidth="2"
          />
        ))}
        {series.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={`l-${i}`} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#7d8396">{fmtDate(p.date)}</text>
          ) : null
        )}
        {series.map((p, i) => (
          <rect key={`h-${i}`} x={x(i) - innerW / n / 2} y={0} width={innerW / n} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
        ))}
      </svg>
      {hp ? (
        <div className={lab.chartTip} style={{ left: `${(x(hover) / W) * 100}%`, top: 10 }}>
          <strong>{fmtDate(hp.date)}</strong> · {formatValue(hp.value, unit)}
          {hp.sample != null ? ` · muestra ${hp.sample}` : ""}
        </div>
      ) : null}
      {minSample ? <p className={lab.subtle} style={{ margin: "2px 0 0" }}>Punto vacío: todavía por debajo de la muestra mínima ({minSample}).</p> : null}
    </div>
  );
}

/** Barras simples (volumen por semana). items: [{ label, value, title }] */
export function Bars({ items, label = "Volumen", unit = "" }) {
  const [hover, setHover] = useState(null);
  if (!items?.length) return <p className={lab.subtle}>Sin datos en el período.</p>;
  const H = 130;
  const max = Math.max(...items.map((i) => i.value), 1);
  const n = items.length;
  const innerW = W - PAD.l - PAD.r;
  const step = innerW / n;
  const barW = Math.max(4, Math.min(30, step - 4));
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const hi = hover != null ? items[hover] : null;
  return (
    <div className={lab.relative} onMouseLeave={() => setHover(null)}>
      <svg className={lab.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ maxWidth: 720 }}>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.18)" />
        <text x={PAD.l - 8} y={y(max) + 4} textAnchor="end" fontSize="11" fill="#7d8396">{max}</text>
        <text x={PAD.l - 8} y={y(0) + 4} textAnchor="end" fontSize="11" fill="#7d8396">0</text>
        {items.map((it, i) => {
          const cx = PAD.l + step * i + step / 2;
          const h = y(0) - y(it.value);
          return (
            <g key={it.label + i} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <rect x={cx - step / 2} y={0} width={step} height={H} fill="transparent" />
              {h > 0 ? (
                <path d={`M${cx - barW / 2} ${y(0)}V${y(0) - Math.max(0, h - 4)}q0 -4 4 -4h${barW - 8}q4 0 4 4V${y(0)}Z`} fill={hover === i ? "#ffb066" : "rgba(255,138,31,0.6)"} />
              ) : null}
              {i % labelEvery === 0 || i === n - 1 ? <text x={cx} y={H - 6} textAnchor="middle" fontSize="11" fill="#7d8396">{it.label}</text> : null}
            </g>
          );
        })}
      </svg>
      {hi ? (
        <div className={lab.chartTip} style={{ left: `${((PAD.l + step * hover + step / 2) / W) * 100}%`, top: 6 }}>
          {hi.title || `${hi.label} · ${hi.value}${unit ? ` ${unit}` : ""}`}
        </div>
      ) : null}
    </div>
  );
}
