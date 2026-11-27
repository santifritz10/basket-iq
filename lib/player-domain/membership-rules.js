/**
 * Roles deportivos y permisos técnicos son cosas distintas:
 * elegir «Jugador» o «Padre/madre» describe el vínculo, no da permisos.
 * El permiso se elige aparte y el servidor lo valida contra el de quien invita.
 */
export const RELATIONSHIP_TYPES = [
  { id: "coach", label: "Entrenador/a" },
  { id: "assistant", label: "Ayudante" },
  { id: "player", label: "Jugador/a" },
  { id: "parent", label: "Madre, padre o tutor/a" },
  { id: "physio", label: "Preparación física / salud" },
  { id: "scout", label: "Scouting" }
];

export const ACCESS_LEVELS = [
  { id: "viewer", label: "Lector: ve el perfil" },
  { id: "editor", label: "Editor: carga datos" },
  { id: "admin", label: "Administrador: además gestiona colaboradores" }
];

const RANK = { viewer: 1, editor: 2, admin: 3 };

/**
 * Valida una invitación. Devuelve { ok, error?, value? }.
 * - Solo un admin puede otorgar admin.
 * - Nadie puede otorgar más permiso del que tiene.
 * - Sin permiso explícito, se invita como lector.
 */
export function validateInvitation({ inviterLevel, relationshipType, accessLevel }) {
  const rel = relationshipType || "coach";
  if (!RELATIONSHIP_TYPES.some((r) => r.id === rel)) return { ok: false, error: "Rol deportivo inválido." };
  const level = accessLevel || "viewer";
  if (!RANK[level]) return { ok: false, error: "Permiso inválido." };
  if (!RANK[inviterLevel] || RANK[inviterLevel] < RANK.editor) {
    return { ok: false, error: "Necesitás ser editor o administrador para invitar." };
  }
  if (RANK[level] > RANK[inviterLevel]) {
    return { ok: false, error: "No podés otorgar un permiso mayor que el tuyo." };
  }
  return { ok: true, value: { relationship_type: rel, access_level: level } };
}
