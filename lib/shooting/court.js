/**
 * Media cancha FIBA para Shooting Lab, en metros.
 * Mismas medidas que la pizarra táctica (js/tactical-board.js, objeto FIBA).
 *
 * Sistema de coordenadas:
 *   x: 0 → 15 a lo ancho (0 = banda izquierda mirando hacia el aro)
 *   y: 0 → 14 desde la línea de fondo hacia la mitad de cancha
 *   El aro queda arriba en el dibujo.
 *
 * Las 9 zonas históricas se conservan con sus ids. Los límites entre zonas
 * (rayos a 30° desde el aro, esquinas hasta donde la línea de triple es recta)
 * son una convención de Basket Lab, no una definición oficial de FIBA.
 */

export const FIBA_HALF = {
  width: 15,
  halfLength: 14,
  basketX: 7.5,
  basketY: 1.575, // centro del aro desde la línea de fondo
  rimRadius: 0.225,
  backboardY: 1.2,
  backboardHalf: 0.9,
  laneHalfWidth: 2.45, // zona de 4,90 m
  laneLength: 5.8,
  ftCircleRadius: 1.8,
  threeRadius: 6.75,
  threeSideDist: 0.9,
  noChargeRadius: 1.3
};

const F = FIBA_HALF;
const BX = F.basketX;
const BY = F.basketY;
const R3 = F.threeRadius;
const CORNER_X = BX - (F.width / 2 - F.threeSideDist); // 0.9
const CORNER_HALF = F.width / 2 - F.threeSideDist; // 6.6
/** Altura (desde el fondo) hasta donde la línea de triple es recta: ≈ 2,99 m. */
export const CORNER_Y = BY + Math.sqrt(R3 * R3 - CORNER_HALF * CORNER_HALF);
const SPLIT_DEG = 30;
const TOP_Y = F.halfLength;

/** Punto sobre la línea de triple; theta en grados desde el eje del aro (+ hacia la derecha). */
function arcPoint(thetaDeg, r = R3) {
  const t = (thetaDeg * Math.PI) / 180;
  return [BX + r * Math.sin(t), BY + r * Math.cos(t)];
}

const CORNER_THETA = (Math.asin(CORNER_HALF / R3) * 180) / Math.PI; // ≈ 77,98°

function arc(fromDeg, toDeg, steps = 24) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) pts.push(arcPoint(fromDeg + ((toDeg - fromDeg) * i) / steps));
  return pts;
}

function rayAtY(thetaDeg, y) {
  const t = (thetaDeg * Math.PI) / 180;
  const k = (y - BY) / Math.cos(t);
  return [BX + k * Math.sin(t), y];
}

const laneL = BX - F.laneHalfWidth;
const laneR = BX + F.laneHalfWidth;
const W = F.width;

/** Polígonos de las zonas (se usan para dibujar y para clasificar coordenadas). */
export const ZONE_POLYGONS = {
  t3_corner_l: [[0, 0], [CORNER_X, 0], [CORNER_X, CORNER_Y], [0, CORNER_Y]],
  t3_corner_r: [[W - CORNER_X, 0], [W, 0], [W, CORNER_Y], [W - CORNER_X, CORNER_Y]],
  t3_left45: [[0, CORNER_Y], ...arc(-CORNER_THETA, -SPLIT_DEG), rayAtY(-SPLIT_DEG, TOP_Y), [0, TOP_Y]],
  t3_right45: [[W, CORNER_Y], [W, TOP_Y], rayAtY(SPLIT_DEG, TOP_Y), ...arc(SPLIT_DEG, CORNER_THETA)],
  t3_front: [...arc(-SPLIT_DEG, SPLIT_DEG), rayAtY(SPLIT_DEG, TOP_Y), rayAtY(-SPLIT_DEG, TOP_Y)],
  mid_l: [[CORNER_X, 0], [laneL, 0], [laneL, F.laneLength], arcPoint(-SPLIT_DEG), ...arc(-SPLIT_DEG, -CORNER_THETA)],
  mid_r: [[laneR, 0], [W - CORNER_X, 0], ...arc(CORNER_THETA, SPLIT_DEG), [laneR, F.laneLength]],
  mid_c: [[laneL, F.laneLength], [laneR, F.laneLength], ...arc(SPLIT_DEG, -SPLIT_DEG)],
  paint: [[laneL, 0], [laneR, 0], [laneR, F.laneLength], [laneL, F.laneLength]]
};

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Distancia al centro del aro, en metros. */
export function distanceToBasket(x, y) {
  return Math.hypot(x - BX, y - BY);
}

/** ¿El punto está fuera de la línea de triple? */
export function isBeyondArc(x, y) {
  if (y <= CORNER_Y) return Math.abs(x - BX) > CORNER_HALF;
  return distanceToBasket(x, y) > R3;
}

/**
 * Zona de un punto de la media cancha. «Cerca del aro» = dentro del
 * semicírculo de 1,30 m (criterio propio, configurable con rimRadius).
 */
export function classifyPoint(x, y, { rimRadius = F.noChargeRadius } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || x > W || y < 0 || y > TOP_Y) return null;
  if (distanceToBasket(x, y) <= rimRadius) return "rim";
  if (isBeyondArc(x, y)) {
    if (y <= CORNER_Y) return x < BX ? "t3_corner_l" : "t3_corner_r";
    const theta = (Math.atan2(x - BX, y - BY) * 180) / Math.PI;
    if (Math.abs(theta) < SPLIT_DEG) return "t3_front";
    return theta < 0 ? "t3_left45" : "t3_right45";
  }
  if (pointInPolygon(x, y, ZONE_POLYGONS.paint)) return "paint";
  if (y > F.laneLength && pointInPolygon(x, y, ZONE_POLYGONS.mid_c)) return "mid_c";
  return x < BX ? "mid_l" : "mid_r";
}

/** Path SVG de un polígono (coordenadas en metros). */
export function polygonPath(points) {
  return `M${points.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join("L")}Z`;
}

/** Punto donde se ubica la etiqueta de cada zona. */
export const ZONE_LABEL_POINTS = {
  rim: [BX, BY + 0.55],
  paint: [BX, 4.2],
  mid_l: [3.3, 2.6],
  mid_c: [BX, 6.6],
  mid_r: [11.7, 2.6],
  t3_corner_l: [0.45, 1.5],
  t3_corner_r: [W - 0.45, 1.5],
  t3_left45: [1.7, 6.9],
  t3_front: [BX, 9.2],
  t3_right45: [W - 1.7, 6.9],
  ft: [BX, F.laneLength]
};

/** Líneas de la cancha para el dibujo. */
export function courtLinePaths() {
  const ftY = F.laneLength;
  const ftR = F.ftCircleRadius;
  const nc = F.noChargeRadius;
  return {
    boundary: `M0 0H${W}V${TOP_Y}H0Z`,
    lane: `M${laneL} 0V${ftY}H${laneR}V0`,
    ftCircleOuter: `M${BX - ftR} ${ftY}A${ftR} ${ftR} 0 0 0 ${BX + ftR} ${ftY}`,
    ftCircleInner: `M${BX - ftR} ${ftY}A${ftR} ${ftR} 0 0 1 ${BX + ftR} ${ftY}`,
    three: `M${CORNER_X} 0V${CORNER_Y.toFixed(3)}A${R3} ${R3} 0 0 0 ${W - CORNER_X} ${CORNER_Y.toFixed(3)}V0`,
    noCharge: `M${BX - nc} ${F.backboardY}V${BY}A${nc} ${nc} 0 0 0 ${BX + nc} ${BY}V${F.backboardY}`,
    backboard: `M${BX - F.backboardHalf} ${F.backboardY}H${BX + F.backboardHalf}`,
    rim: { cx: BX, cy: BY, r: F.rimRadius },
    centerArc: `M${BX - ftR} ${TOP_Y}A${ftR} ${ftR} 0 0 1 ${BX + ftR} ${TOP_Y}`
  };
}
