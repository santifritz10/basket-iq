import "server-only";
import zona23 from "@/js/academy-content/zona-2-3.js";
import zona32 from "@/js/academy-content/zona-3-2.js";
import zona131 from "@/js/academy-content/zona-1-3-1.js";
import pickAndRoll from "@/js/academy-content/pick-and-roll.js";
import superioridades from "@/js/academy-content/superioridades.js";
import spacing from "@/js/academy-content/spacing.js";
import presion from "@/js/academy-content/presion.js";
import BasketExercises from "@/js/exercises.js";
import BasketSim from "@/js/simulator.js";

/**
 * Contenidos de Basket Lab Academy disponibles para el asistente.
 * Son los mismos módulos que usa la app: el servidor no consulta a Gemini
 * para armarlos ni acepta texto de contenido desde el navegador.
 * Al agregar una guía nueva, sumala acá y en app/page.js.
 */
export const ACADEMY_ARTICLES = [zona23, zona32, zona131, pickAndRoll, superioridades, spacing, presion];
export const exercisesApi = BasketExercises;
export const simApi = BasketSim;
