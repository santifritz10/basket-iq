/**
 * Invitaciones a colaborar en el perfil de un jugador.
 * - Quien invita crea la invitación para un email; la persona invitada la ve al entrar con ESE email
 *   (o abre el enlace con el código). Nunca se acepta en nombre de otra cuenta.
 * - Aceptar crea (o reactiva) su acceso con el permiso elegido. Rechazar o anular no borra nada.
 */
import { createHash } from "node:crypto";
import { DevError, activity, check, requireAccess } from "./core.js";
import { isUuid } from "./model.js";

export function hashToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

const normEmail = (email) => String(email || "").trim().toLowerCase();
const isExpired = (inv, now) => new Date(inv.expires_at).getTime() < now.getTime();

function toDto(inv, playerNames = {}) {
  return {
    id: inv.id,
    player_id: inv.player_id,
    player_name: playerNames[inv.player_id] || null,
    email: inv.email,
    relationship_type: inv.relationship_type,
    access_level: inv.access_level,
    status: inv.status,
    expires_at: inv.expires_at,
    created_at: inv.created_at
  };
}

async function playerNames(db, ids) {
  const list = [...new Set(ids)];
  if (!list.length) return {};
  const rows = check(await db.from("players").select("id, display_name").in("id", list)) || [];
  return Object.fromEntries(rows.map((r) => [r.id, r.display_name]));
}

/** Invitaciones pendientes y vigentes para el email de la cuenta con la que se entró. */
export async function listMyInvitations(db, userEmail, { now = new Date() } = {}) {
  const email = normEmail(userEmail);
  if (!email) return { invitations: [] };
  const rows = (check(await db.from("player_invitations").select("*").eq("email", email).eq("status", "pending")) || []).filter((r) => !isExpired(r, now));
  const names = await playerNames(db, rows.map((r) => r.player_id));
  return { invitations: rows.map((r) => toDto(r, names)) };
}

async function findPending(db, userEmail, { token, invitationId }, now) {
  let inv = null;
  if (invitationId) {
    if (!isUuid(invitationId)) throw new DevError("La invitación no existe o ya no está vigente.", 404, "invitation_not_found");
    inv = check(await db.from("player_invitations").select("*").eq("id", invitationId).eq("status", "pending").maybeSingle());
  } else if (String(token || "").trim()) {
    inv = check(await db.from("player_invitations").select("*").eq("token_hash", hashToken(String(token).trim())).eq("status", "pending").maybeSingle());
  } else {
    throw new DevError("Falta el código de la invitación.", 400, "invalid_invitation");
  }
  if (!inv) throw new DevError("La invitación no existe o ya no está vigente.", 404, "invitation_not_found");
  if (isExpired(inv, now)) {
    await db.from("player_invitations").update({ status: "expired" }).eq("id", inv.id);
    throw new DevError("La invitación venció. Pedile a quien te invitó que te mande una nueva.", 410, "invitation_expired");
  }
  if (normEmail(userEmail) !== normEmail(inv.email)) {
    // Por id no se revela nada de una invitación ajena.
    if (invitationId) throw new DevError("La invitación no existe o ya no está vigente.", 404, "invitation_not_found");
    throw new DevError(`Esta invitación es para otro email. Entrá con la cuenta de ${inv.email} para aceptarla.`, 403, "invitation_email_mismatch");
  }
  return inv;
}

/** Acepta por código (enlace) o por id (desde la lista de invitaciones pendientes). */
export async function acceptInvitation(db, userId, userEmail, input, { onActivity, now = new Date() } = {}) {
  const inv = await findPending(db, userEmail, input || {}, now);
  const stamp = now.toISOString();
  // Si ya tiene acceso, nunca se le baja el permiso por aceptar una invitación menor.
  const existing = check(await db.from("player_members").select("*").eq("player_id", inv.player_id).eq("user_id", userId).maybeSingle());
  const rank = { viewer: 1, editor: 2, admin: 3 };
  const keepLevel = existing?.status === "active" && rank[existing.access_level] > rank[inv.access_level];
  const member = check(
    await db
      .from("player_members")
      .upsert(
        {
          player_id: inv.player_id,
          user_id: userId,
          relationship_type: keepLevel ? existing.relationship_type : inv.relationship_type,
          access_level: keepLevel ? existing.access_level : inv.access_level,
          status: "active",
          invited_by_user_id: inv.invited_by_user_id,
          accepted_at: stamp,
          created_by_user_id: existing?.created_by_user_id || userId,
          updated_by_user_id: userId
        },
        { onConflict: "player_id,user_id" }
      )
      .select("*")
      .single()
  );
  check(await db.from("player_invitations").update({ status: "accepted", accepted_at: stamp }).eq("id", inv.id).select("id").single());
  await activity(onActivity, {
    playerId: inv.player_id,
    eventType: "member.joined",
    entityType: "player_member",
    entityId: member.id,
    summary: "Nuevo colaborador vinculado al perfil"
  });
  return { member, player_id: inv.player_id };
}

/** La persona invitada rechaza: la invitación queda anulada (no se borra). */
export async function declineInvitation(db, userEmail, invitationId, { now = new Date() } = {}) {
  const inv = await findPending(db, userEmail, { invitationId }, now);
  check(await db.from("player_invitations").update({ status: "revoked" }).eq("id", inv.id).select("id").single());
  return { declined: inv.id };
}

/** Invitaciones pendientes de un jugador (editor o admin: quienes pueden invitar). */
export async function listPlayerInvitations(db, userId, playerId, { now = new Date() } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const rows = check(await db.from("player_invitations").select("*").eq("player_id", playerId).eq("status", "pending").order("created_at", { ascending: false })) || [];
  return { invitations: rows.map((r) => ({ ...toDto(r), expired: isExpired(r, now) })) };
}

/** Anula una invitación pendiente. El admin anula cualquiera; el editor, solo las que mandó él. */
export async function revokeInvitation(db, userId, playerId, invitationId) {
  const level = await requireAccess(db, userId, playerId, "editor");
  if (!isUuid(invitationId)) throw new DevError("Invitación inexistente.", 404, "invitation_not_found");
  const inv = check(await db.from("player_invitations").select("*").eq("id", invitationId).eq("player_id", playerId).maybeSingle());
  if (!inv || inv.status !== "pending") throw new DevError("Invitación inexistente.", 404, "invitation_not_found");
  if (level !== "admin" && inv.invited_by_user_id !== userId) throw new DevError("Solo podés anular las invitaciones que mandaste vos.", 403, "forbidden");
  check(await db.from("player_invitations").update({ status: "revoked" }).eq("id", inv.id).select("id").single());
  return { revoked: inv.id };
}
