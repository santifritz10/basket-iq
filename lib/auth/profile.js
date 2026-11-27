/**
 * Datos de perfil deportivo. El "rol deportivo" es solo descriptivo: no
 * otorga permisos. Los permisos de la app no dependen de este campo.
 */
export const SPORT_ROLES = [
  { id: "entrenador", label: "Entrenador/a" },
  { id: "ayudante", label: "Ayudante técnico/a" },
  { id: "jugador", label: "Jugador/a" },
  { id: "coordinador", label: "Coordinador/a deportivo/a" }
];

export const CATEGORY_OPTIONS = ["Escuelita", "Premini", "Mini", "U13", "U15", "U17", "U19", "U21", "Primera", "Veteranos"];

const ROLE_IDS = new Set(SPORT_ROLES.map((r) => r.id));

function cleanText(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

/**
 * Normaliza lo que envía el formulario. Ignora cualquier campo que no sea de
 * perfil (por ejemplo, alguien que intente mandar "role" o "is_admin").
 */
export function sanitizeProfileInput(input = {}) {
  const fullName = cleanText(input.full_name, 80);
  const role = ROLE_IDS.has(input.sport_role) ? input.sport_role : null;
  const club = cleanText(input.club, 120) || null;
  const categories = Array.isArray(input.categories)
    ? Array.from(new Set(input.categories.map((c) => cleanText(c, 40)).filter(Boolean))).slice(0, 12)
    : [];
  return { full_name: fullName, sport_role: role, club, categories };
}

export function validateProfileInput(input) {
  const errors = {};
  if (!input.full_name || input.full_name.length < 2) errors.full_name = "Ingresá un nombre de al menos 2 caracteres.";
  return errors;
}

/** Nombre de usuario por defecto a partir del correo (como hacía la app). */
export function baseUsernameFromEmail(email) {
  const local = String(email || "").split("@")[0].toLowerCase();
  const cleaned = local.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
  return cleaned.length >= 2 ? cleaned : "usuario";
}
