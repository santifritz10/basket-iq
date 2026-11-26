import "server-only";

/**
 * Punto de extensión para el contexto del entrenador.
 *
 * Hoy devuelve una lista vacía: el asistente solo usa lo que el entrenador
 * escribe en el chat. Más adelante, cada "proveedor" de esta lista aportará
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

export async function buildCoachContext({ userId, projectId = null }) {
  if (!userId) return [];
  const sections = [];
  for (const provider of CONTEXT_PROVIDERS) {
    const section = await provider({ userId, projectId });
    if (section) sections.push(section);
  }
  return sections;
}
