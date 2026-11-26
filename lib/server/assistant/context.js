import "server-only";
import { getUserDataByType } from "@/services/server/user-data-service";
import { buildAcademyContext, summarizeCategory } from "@/lib/assistant/academy-context";
import { ACADEMY_ARTICLES, exercisesApi, simApi } from "@/lib/server/assistant/academy-registry";

/**
 * Punto de extensión para el contexto del entrenador.
 *
 * Hoy aporta el contexto de Basket Lab Academy cuando el entrenador consulta
 * desde una guía (contenido, ejercicio, simulador, fuentes y categoría). Más adelante, cada "proveedor" de esta lista aportará
 * una sección al prompt, en este orden de prioridad:
 *
 *   1. Seguridad y disponibilidad de jugadores (ausencias del día).
 *   2. Filosofía y principios confirmados por el entrenador.
 *   3. Modelo del equipo y planificación vigente.
 *   4. Observaciones recientes del día a día.
 *   5. Documentos y bibliografía verificable cargados por el entrenador.
 *
 * Cada proveedor recibe { userId, projectId } y devuelve
 * { title, content } o null. Siempre debe filtrar por userId (y por
 * projectId cuando aplique, para no mezclar categorías).
 */
const CONTEXT_PROVIDERS = [];

/**
 * Resumen de la categoría con la planificación anual y los entrenamientos
 * guardados por el propio entrenador (filtrado por userId en el servidor).
 */
async function loadCategorySummary(userId, categoria) {
  if (!categoria) return "";
  try {
    const [trainings, plans] = await Promise.all([
      getUserDataByType(userId, "trainings"),
      getUserDataByType(userId, "annual_plans")
    ]);
    return summarizeCategory({ categoria, trainings: trainings || [], plans: plans || [], today: new Date() });
  } catch (error) {
    console.error("[assistant] category context unavailable", { message: String(error?.message || "").slice(0, 120) });
    return "";
  }
}

/**
 * Secciones de contexto para el prompt. `academy` es el pedido validado con
 * parseAcademyRef (solo identificadores y condiciones).
 */
export async function buildCoachContext({ userId, projectId = null, academy = null }) {
  if (!userId) return [];
  const sections = [];
  if (academy) {
    const categorySummary = await loadCategorySummary(userId, academy.categoria);
    const built = buildAcademyContext({ ref: academy, articles: ACADEMY_ARTICLES, exercisesApi, simApi, categorySummary });
    sections.push(...built.sections);
  }
  for (const provider of CONTEXT_PROVIDERS) {
    const section = await provider({ userId, projectId });
    if (section) sections.push(section);
  }
  return sections;
}

/** Etiqueta corta del contexto (para mostrar en el historial). Null si el contenido ya no existe. */
export function describeAcademyContext(academy) {
  if (!academy) return null;
  try {
    return buildAcademyContext({ ref: academy, articles: ACADEMY_ARTICLES }).label || null;
  } catch {
    return null;
  }
}
