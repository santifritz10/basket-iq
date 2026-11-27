/**
 * Catálogo de fundamentos y criterios de evaluación.
 * Los 8 criterios del sistema anterior conservan su clave para poder
 * confirmar sus valores sin perder la relación.
 * Las descripciones de niveles son una propuesta de Basket Lab (no un
 * estándar oficial de FIBA ni de WABC).
 */
export const DIMENSIONS = [
  { id: "dribbling", label: "Dribbling" },
  { id: "shooting", label: "Tiro" },
  { id: "passing", label: "Pase" },
  { id: "finishing", label: "Finalización" },
  { id: "defense", label: "Defensa" },
  { id: "off_ball", label: "Juego sin balón" },
  { id: "rebounding", label: "Rebote" },
  { id: "decision_making", label: "Toma de decisiones" },
  { id: "tactical_reading", label: "Lectura táctica" },
  { id: "communication", label: "Comunicación" }
];

export const DIMENSION_IDS = DIMENSIONS.map((d) => d.id);
const DIM_BY_ID = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d]));

export function dimensionById(id) {
  return DIM_BY_ID[id] || null;
}

/** Criterios incluidos. legacy: existían como estrellas en el sistema anterior. */
export const BUILTIN_CRITERIA = [
  { key: "drib_control", dimension: "dribbling", label: "Control", legacy: true },
  { key: "drib_weak_hand", dimension: "dribbling", label: "Mano débil", legacy: true },
  { key: "shot_mechanics", dimension: "shooting", label: "Mecánica", legacy: true },
  { key: "shot_consistency", dimension: "shooting", label: "Consistencia", legacy: true },
  { key: "pass_accuracy", dimension: "passing", label: "Precisión", legacy: true },
  { key: "pass_decisions", dimension: "passing", label: "Decisiones", legacy: true },
  { key: "finish_definition", dimension: "finishing", label: "Definición", legacy: true },
  { key: "finish_both_hands", dimension: "finishing", label: "Uso de ambas manos", legacy: true },
  { key: "def_on_ball", dimension: "defense", label: "Defensa al balón" },
  { key: "def_help", dimension: "defense", label: "Ayudas y rotaciones" },
  { key: "offball_spacing", dimension: "off_ball", label: "Espaciado y cortes" },
  { key: "reb_boxout", dimension: "rebounding", label: "Bloqueo de rebote" },
  { key: "reb_pursuit", dimension: "rebounding", label: "Ataque al balón" },
  { key: "dec_general", dimension: "decision_making", label: "Elección de la acción" },
  { key: "tac_concepts", dimension: "tactical_reading", label: "Comprensión de conceptos" },
  { key: "comm_court", dimension: "communication", label: "Comunicación en cancha" }
].map((c) => ({ ...c, scale_max: 5, builtin: true }));

export const LEGACY_CRITERIA = BUILTIN_CRITERIA.filter((c) => c.legacy);

/** Descripción de niveles para la escala 1–5 (propuesta de Basket Lab). */
export const DEFAULT_LEVELS = {
  1: "Inicial: lo intenta, necesita ayuda constante.",
  2: "En desarrollo: lo logra a veces, en situaciones simples.",
  3: "Funcional: lo logra con regularidad sin oposición o con poca presión.",
  4: "Consolidado: lo logra con constancia y con oposición.",
  5: "Avanzado: lo logra con constancia en contexto de partido."
};

export function levelDescription(criterion, value) {
  const custom = criterion?.level_descriptions?.[value];
  if (custom) return custom;
  if ((criterion?.scale_max || 5) === 5) return DEFAULT_LEVELS[value] || "";
  return "";
}

export const ASSESSMENT_CONTEXTS = [
  { id: "training", label: "Entrenamiento" },
  { id: "match", label: "Partido" },
  { id: "test", label: "Prueba específica" },
  { id: "observation", label: "Observación" },
  { id: "other", label: "Otro" }
];

export const STAT_TYPES = [
  { id: "match", label: "Partido" },
  { id: "training", label: "Entrenamiento" },
  { id: "manual_legacy", label: "Histórico manual" }
];

/** Campos numéricos de una planilla de estadísticas. */
export const STAT_FIELDS = [
  { key: "minutes", label: "Minutos", decimal: true },
  { key: "points", label: "Puntos" },
  { key: "fg2_made", label: "Dobles conv.", pair: "fg2_att" },
  { key: "fg2_att", label: "Dobles int." },
  { key: "fg3_made", label: "Triples conv.", pair: "fg3_att" },
  { key: "fg3_att", label: "Triples int." },
  { key: "ft_made", label: "Libres conv.", pair: "ft_att" },
  { key: "ft_att", label: "Libres int." },
  { key: "assists", label: "Asistencias" },
  { key: "oreb", label: "Rebotes of." },
  { key: "dreb", label: "Rebotes def." },
  { key: "turnovers", label: "Pérdidas" },
  { key: "steals", label: "Recuperos" },
  { key: "blocks", label: "Tapones" },
  { key: "fouls", label: "Faltas" }
];

export const LEGACY_STAT_LABELS = {
  ft_pct: "% tiros libres",
  fg_pct: "% tiros de campo",
  three_pct: "% triples",
  assists: "Asistencias",
  turnovers: "Pérdidas",
  rebounds: "Rebotes"
};
