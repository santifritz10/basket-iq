"use client";

import { useId, useMemo } from "react";
import { ZONE_LABEL_POINTS, ZONE_POLYGONS, classifyPoint, courtLinePaths, polygonPath } from "@/lib/shooting/court";
import { DEFAULT_MIN_SAMPLE, DEFAULT_THRESHOLDS, FIELD_ZONES, colorBand, pctLabel, zoneById } from "@/lib/shooting/model";
import styles from "./lab.module.css";

/** Colores de referencia (configurables por umbral; siempre acompañados del número). */
export const BAND_FILL = {
  low: "rgba(255, 107, 94, 0.58)",
  mid: "rgba(245, 196, 81, 0.52)",
  high: "rgba(79, 209, 139, 0.55)"
};

const VIEW = { x: -0.35, y: -0.35, w: 15.7, h: 10.75 };
const LINE = "rgba(235, 222, 205, 0.78)";

function volumeFill(attempts, max) {
  if (!attempts) return null;
  const t = Math.min(1, attempts / Math.max(1, max));
  return `rgba(255, 138, 31, ${(0.16 + t * 0.66).toFixed(2)})`;
}

function zoneDescription(zone, line, minSample) {
  if (!line.attempts) return `${zone.label}: sin registros`;
  const small = line.attempts < minSample ? `, muestra menor a ${minSample} intentos` : "";
  return `${zone.label}: ${line.made} de ${line.attempts}, ${pctLabel(line.made, line.attempts)}${small}`;
}

/**
 * Media cancha FIBA con las zonas de lanzamiento.
 * mode: "efficiency" | "volume" | "input" (selección para registrar)
 * byZone: { zoneId: { attempts, made } }
 * dots: [{ x, y, made }] lanzamientos con coordenadas
 */
export default function ShotChart({
  byZone = {},
  mode = "efficiency",
  thresholds = DEFAULT_THRESHOLDS,
  minSample = DEFAULT_MIN_SAMPLE,
  selectedZone = null,
  onSelectZone,
  onPickPoint,
  dots = [],
  title = "Mapa de lanzamiento",
  showRim = true
}) {
  const uid = useId().replace(/[:]/g, "");
  const lines = useMemo(() => courtLinePaths(), []);
  const zones = FIELD_ZONES.filter((z) => z.id !== "rim");
  const maxAttempts = Math.max(1, ...FIELD_ZONES.map((z) => byZone[z.id]?.attempts || 0));
  const interactive = Boolean(onSelectZone || onPickPoint);

  function fillFor(id) {
    const line = byZone[id] || { attempts: 0, made: 0 };
    if (mode === "input") return id === selectedZone ? "rgba(255, 138, 31, 0.42)" : "rgba(255,255,255,0.02)";
    if (!line.attempts) return `url(#nodata-${uid})`;
    if (mode === "volume") return volumeFill(line.attempts, maxAttempts);
    return BAND_FILL[colorBand(line.made, line.attempts, thresholds)];
  }

  function handlePointer(ev) {
    if (!onPickPoint) return;
    const svg = ev.currentTarget.ownerSVGElement || ev.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    const x = Math.round(p.x * 100) / 100;
    const y = Math.round(p.y * 100) / 100;
    const zone = classifyPoint(x, y);
    if (zone) onPickPoint({ x, y, zone });
  }

  function zoneLabel(id) {
    const line = byZone[id] || { attempts: 0, made: 0 };
    const [lx, ly] = ZONE_LABEL_POINTS[id];
    const isCorner = id === "t3_corner_l" || id === "t3_corner_r";
    const small = line.attempts > 0 && line.attempts < minSample;
    const z = zoneById(id);
    if (mode === "input") {
      return (
        <text x={lx} y={ly} textAnchor="middle" fontSize={isCorner ? 0.3 : 0.36} fill="#f4f5f8" fontWeight="650"
          transform={isCorner ? `rotate(-90 ${lx} ${ly})` : undefined} pointerEvents="none">
          {z.short}
        </text>
      );
    }
    const top = line.attempts ? `${line.made}/${line.attempts}` : "—";
    const bottom = line.attempts ? `${pctLabel(line.made, line.attempts)}${small ? "*" : ""}` : "sin datos";
    return (
      <g pointerEvents="none" transform={isCorner ? `rotate(-90 ${lx} ${ly})` : undefined}>
        <text x={lx} y={ly - 0.06} textAnchor="middle" fontSize={isCorner ? 0.3 : 0.38} fontWeight="750" fill="#ffffff"
          stroke="rgba(0,0,0,0.55)" strokeWidth="0.06" paintOrder="stroke">
          {line.attempts ? bottom : top}
        </text>
        <text x={lx} y={ly + (isCorner ? 0.32 : 0.4)} textAnchor="middle" fontSize={isCorner ? 0.24 : 0.28} fill="#e6e8ef"
          stroke="rgba(0,0,0,0.5)" strokeWidth="0.05" paintOrder="stroke">
          {line.attempts ? top : bottom}
        </text>
      </g>
    );
  }

  function zoneNode(id, shape) {
    const z = zoneById(id);
    const line = byZone[id] || { attempts: 0, made: 0 };
    const selected = selectedZone === id;
    const small = mode !== "input" && line.attempts > 0 && line.attempts < minSample;
    const common = {
      className: styles.zoneShape,
      fill: fillFor(id),
      stroke: selected ? "#ff8a1f" : small ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.14)",
      strokeWidth: selected ? 0.12 : small ? 0.05 : 0.03,
      strokeDasharray: small && !selected ? "0.18 0.12" : undefined
    };
    return (
      <g
        key={id}
        className={interactive ? styles.zone : undefined}
        role={interactive ? "button" : "img"}
        tabIndex={interactive ? 0 : undefined}
        aria-pressed={interactive ? selected : undefined}
        aria-label={mode === "input" ? z.label : zoneDescription(z, line, minSample)}
        onClick={(ev) => {
          if (onPickPoint) handlePointer(ev);
          else if (onSelectZone) onSelectZone(id);
        }}
        onKeyDown={(ev) => {
          if (!onSelectZone) return;
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            onSelectZone(id);
          }
        }}
      >
        {shape(common)}
        <title>{mode === "input" ? z.label : zoneDescription(z, line, minSample)}</title>
        {zoneLabel(id)}
      </g>
    );
  }

  const rim = lines.rim;

  return (
    <div className={styles.courtWrap}>
      <svg
        className={styles.court}
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        role="group"
        aria-label={title}
      >
        <defs>
          <pattern id={`nodata-${uid}`} width="0.35" height="0.35" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="0.35" height="0.35" fill="rgba(255,255,255,0.025)" />
            <line x1="0" y1="0" x2="0" y2="0.35" stroke="rgba(255,255,255,0.12)" strokeWidth="0.06" />
          </pattern>
          <linearGradient id={`floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d1914" />
            <stop offset="1" stopColor="#15130f" />
          </linearGradient>
        </defs>

        <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={`url(#floor-${uid})`} rx="0.3" />

        {zones.map((z) => zoneNode(z.id, (p) => <path d={polygonPath(ZONE_POLYGONS[z.id])} {...p} />))}
        {showRim
          ? zoneNode("rim", (p) => <circle cx={rim.cx} cy={rim.cy} r={1.3} {...p} />)
          : null}

        {/* Líneas reglamentarias FIBA (encima de las zonas, sin capturar toques). */}
        <g fill="none" stroke={LINE} strokeWidth="0.05" pointerEvents="none">
          <path d={lines.boundary} />
          <path d={lines.lane} />
          <path d={lines.ftCircleOuter} />
          <path d={lines.ftCircleInner} strokeDasharray="0.3 0.22" />
          <path d={lines.three} />
          <path d={lines.noCharge} />
          <path d={lines.centerArc} />
          <path d={lines.backboard} strokeWidth="0.09" />
          <circle cx={rim.cx} cy={rim.cy} r={rim.r} stroke="#ff8a1f" strokeWidth="0.06" />
        </g>

        {dots.map((d, i) => (
          <g key={i} pointerEvents="none">
            {d.made ? (
              <circle cx={d.x} cy={d.y} r="0.17" fill="#4fd18b" stroke="#0a0b10" strokeWidth="0.05" />
            ) : (
              <path
                d={`M${d.x - 0.14} ${d.y - 0.14}L${d.x + 0.14} ${d.y + 0.14}M${d.x + 0.14} ${d.y - 0.14}L${d.x - 0.14} ${d.y + 0.14}`}
                stroke="#ff7a6b"
                strokeWidth="0.08"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Leyenda: explica colores, patrón y borde punteado sin depender solo del color. */
export function ShotChartLegend({ mode, thresholds = DEFAULT_THRESHOLDS, minSample = DEFAULT_MIN_SAMPLE }) {
  if (mode === "input") return null;
  return (
    <div className={styles.legend}>
      {mode === "volume" ? (
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: "linear-gradient(90deg, rgba(255,138,31,0.18), rgba(255,138,31,0.82))", width: 36 }} />
          Más intentos = más intenso
        </span>
      ) : (
        <>
          <span className={styles.legendItem}><span className={styles.swatch} style={{ background: BAND_FILL.low }} />Menos de {thresholds.low}%</span>
          <span className={styles.legendItem}><span className={styles.swatch} style={{ background: BAND_FILL.mid }} />{thresholds.low}–{thresholds.high}%</span>
          <span className={styles.legendItem}><span className={styles.swatch} style={{ background: BAND_FILL.high }} />Más de {thresholds.high}%</span>
        </>
      )}
      <span className={styles.legendItem}>
        <span className={styles.swatch} style={{ background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 6px)" }} />
        Sin datos (no es 0%)
      </span>
      <span className={styles.legendItem}>
        <span className={styles.swatch} style={{ borderStyle: "dashed", borderColor: "rgba(255,255,255,0.75)" }} />
        * Menos de {minSample} intentos
      </span>
      {mode !== "volume" ? (
        <span className={styles.legendItem} style={{ flexBasis: "100%" }}>
          Los colores son referencias visuales configurables, no estándares de rendimiento.
        </span>
      ) : null}
    </div>
  );
}
