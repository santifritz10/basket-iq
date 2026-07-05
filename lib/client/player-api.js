const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPlayerUuid(id) {
  return UUID_RE.test(String(id || ""));
}

export function mapGoalStatusToLegacy(status) {
  if (status === "completed") return "completado";
  if (status === "archived") return "archivado";
  if (status === "active") return "pendiente";
  return status || "pendiente";
}

export function mapGoalStatusFromLegacy(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completado" || s === "completed") return "completed";
  if (s === "archivado" || s === "archived") return "archived";
  return "active";
}

function playerPatchBody(patch) {
  const body = {};
  if (patch.name !== undefined || patch.display_name !== undefined) {
    body.display_name = patch.name ?? patch.display_name;
  }
  ["position", "age", "height", "level", "team", "category", "photo_url", "club_shield_url"].forEach((k) => {
    if (patch[k] !== undefined) body[k] = patch[k];
  });
  if (patch.fundamentals !== undefined) body.fundamentals = patch.fundamentals;
  if (patch.stats !== undefined) body.game_stats = patch.stats;
  if (patch.game_stats !== undefined) body.game_stats = patch.game_stats;
  return body;
}

async function parseJson(res) {
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function fetchPlayers() {
  const data = await parseJson(await fetch("/api/players", { credentials: "same-origin" }));
  return data.items || [];
}

export async function fetchShootingPayload() {
  const data = await parseJson(await fetch("/api/shooting", { credentials: "same-origin" }));
  return data.payload || {};
}

export async function createPlayer(body) {
  const data = await parseJson(
    await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body)
    })
  );
  return data.player;
}

export async function patchPlayer(playerId, patch) {
  const data = await parseJson(
    await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(playerPatchBody(patch))
    })
  );
  return data.player;
}

export async function archivePlayer(playerId) {
  await parseJson(
    await fetch(`/api/players/${playerId}`, {
      method: "DELETE",
      credentials: "same-origin"
    })
  );
}

export async function createNote(playerId, text) {
  const data = await parseJson(
    await fetch(`/api/players/${playerId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ body: text })
    })
  );
  return data.item;
}

export async function createGoal(playerId, text) {
  const data = await parseJson(
    await fetch(`/api/players/${playerId}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ body: text, status: "active" })
    })
  );
  return data.item;
}

export async function updateGoal(playerId, goalId, patch) {
  const body = { ...patch };
  if (patch.status !== undefined) body.status = mapGoalStatusFromLegacy(patch.status);
  const data = await parseJson(
    await fetch(`/api/players/${playerId}/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body)
    })
  );
  return data.item;
}

export async function deleteGoal(playerId, goalId) {
  await parseJson(
    await fetch(`/api/players/${playerId}/goals/${goalId}`, {
      method: "DELETE",
      credentials: "same-origin"
    })
  );
}

export async function createEvolution(playerId, message) {
  const data = await parseJson(
    await fetch(`/api/players/${playerId}/evolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ message })
    })
  );
  return data.item;
}

export async function createShootingSession(playerId, session) {
  const data = await parseJson(
    await fetch(`/api/players/${playerId}/shooting-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(session)
    })
  );
  return data.session;
}

export async function patchShootingSession(sessionId, patch) {
  const data = await parseJson(
    await fetch(`/api/shooting-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(patch)
    })
  );
  return data.session;
}

export async function deleteShootingSession(sessionId) {
  await parseJson(
    await fetch(`/api/shooting-sessions/${sessionId}`, {
      method: "DELETE",
      credentials: "same-origin"
    })
  );
}

export async function inviteMember(playerId, { email, relationship_type = "coach", access_level = "editor" }) {
  const data = await parseJson(
    await fetch(`/api/players/${playerId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, relationship_type, access_level })
    })
  );
  return data;
}

export async function acceptInvitation(token) {
  const data = await parseJson(
    await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token })
    })
  );
  return data.member;
}
