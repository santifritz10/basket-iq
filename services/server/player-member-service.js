import "server-only";
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
  await requirePlayerAccess(userId, playerId, "admin");

  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) {
    const err = new Error("email is required");
    err.status = 400;
    throw err;
  }

  const relationshipType = body?.relationship_type || "coach";
  const accessLevel = body?.access_level || "editor";
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
