import "server-only";
import { validateInvitation } from "@/lib/player-domain/membership-rules";
import { createHash, randomBytes } from "crypto";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { requirePlayerAccess } from "@/services/server/player-permissions";
import { recordActivityEvent } from "@/services/server/activity-service";

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function listPlayerMembers(userId, playerId) {
  await requirePlayerAccess(userId, playerId, "admin");
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_members")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: true });
  if (result.error) throw result.error;
  return result.data || [];
}

export async function createInvitation(userId, playerId, body) {
  const membership = await requirePlayerAccess(userId, playerId, "editor");

  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) {
    const err = new Error("email is required");
    err.status = 400;
    throw err;
  }

  // El rol deportivo no otorga permisos: el permiso se valida aparte y nunca
  // puede superar el de quien invita (antes un editor podía invitar admins).
  const rules = validateInvitation({
    inviterLevel: membership.access_level,
    relationshipType: body?.relationship_type,
    accessLevel: body?.access_level
  });
  if (!rules.ok) {
    const err = new Error(rules.error);
    err.status = 403;
    throw err;
  }
  const relationshipType = rules.value.relationship_type;
  const accessLevel = rules.value.access_level;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("player_invitations")
    .insert({
      player_id: playerId,
      email,
      relationship_type: relationshipType,
      access_level: accessLevel,
      token_hash: hashToken(token),
      invited_by_user_id: userId,
      expires_at: expiresAt,
      status: "pending"
    })
    .select("*")
    .single();
  if (result.error) throw result.error;

  await recordActivityEvent({
    playerId,
    actorUserId: userId,
    eventType: "member.invited",
    entityType: "player_invitation",
    entityId: result.data.id,
    summary: `Invitación enviada a ${email}`,
    metadata: { email, relationship_type: relationshipType }
  });

  return { invitation: result.data, token };
}

export async function acceptInvitation(userId, userEmail, token) {
  const service = createSupabaseServiceServerClient();
  const tokenHash = hashToken(String(token || ""));
  const inviteResult = await service
    .from("player_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();
  if (inviteResult.error) throw inviteResult.error;

  const invitation = inviteResult.data;
  if (!invitation) {
    const err = new Error("Invalid or expired invitation");
    err.status = 400;
    throw err;
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    await service.from("player_invitations").update({ status: "expired" }).eq("id", invitation.id);
    const err = new Error("Invitation expired");
    err.status = 400;
    throw err;
  }

  const normalizedEmail = String(userEmail || "").trim().toLowerCase();
  if (normalizedEmail !== invitation.email) {
    const err = new Error("Invitation email does not match authenticated user");
    err.status = 403;
    throw err;
  }

  const memberRow = {
    player_id: invitation.player_id,
    user_id: userId,
    relationship_type: invitation.relationship_type,
    access_level: invitation.access_level,
    status: "active",
    invited_by_user_id: invitation.invited_by_user_id,
    accepted_at: new Date().toISOString(),
    created_by_user_id: userId,
    updated_by_user_id: userId
  };

  const memberResult = await service
    .from("player_members")
    .upsert(memberRow, { onConflict: "player_id,user_id" })
    .select("*")
    .single();
  if (memberResult.error) throw memberResult.error;

  await service
    .from("player_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  await recordActivityEvent({
    playerId: invitation.player_id,
    actorUserId: userId,
    eventType: "member.joined",
    entityType: "player_member",
    entityId: memberResult.data.id,
    summary: "Nuevo miembro vinculado al perfil"
  });

  return memberResult.data;
}

export async function revokeMember(userId, playerId, memberId) {
  await requirePlayerAccess(userId, playerId, "admin");
  const service = createSupabaseServiceServerClient();

  // Nunca dejar a un jugador sin administrador: nadie podría gestionarlo.
  const members = await service
    .from("player_members")
    .select("id, access_level, status")
    .eq("player_id", playerId)
    .eq("status", "active");
  if (members.error) throw members.error;
  const target = (members.data || []).find((m) => m.id === memberId);
  const admins = (members.data || []).filter((m) => m.access_level === "admin");
  if (target?.access_level === "admin" && admins.length <= 1) {
    const err = new Error("No se puede quitar al único administrador del jugador.");
    err.status = 409;
    throw err;
  }
  const result = await service
    .from("player_members")
    .update({ status: "revoked", updated_by_user_id: userId })
    .eq("id", memberId)
    .eq("player_id", playerId)
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data;
}
