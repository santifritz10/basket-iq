"use client";

import { ApiError } from "@/components/shooting-lab/api";

async function call(url, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store"
    });
  } catch {
    throw new ApiError("Sin conexión. Probá de nuevo.", 0, "network");
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data.ok === false) {
    const msg = data.error === "Forbidden" ? "No tenés permiso para hacer esto." : data.error;
    throw new ApiError(msg || "No se pudo completar la acción.", res.status, data.code || "error", data.details);
  }
  return data;
}

const P = "/api/player-dev";

export const devApi = {
  roster: () => call(`${P}/roster`),
  profile: (id) => call(`${P}/players/${id}`),
  addAssessment: (id, body) => call(`${P}/players/${id}/assessments`, { method: "POST", body }),
  voidAssessment: (id, batchId) => call(`${P}/players/${id}/assessments/${batchId}`, { method: "DELETE" }),
  criteria: () => call(`${P}/criteria`),
  addCriterion: (body) => call(`${P}/criteria`, { method: "POST", body }),
  editCriterion: (cid, body) => call(`${P}/criteria/${cid}`, { method: "PATCH", body }),
  addStats: (id, body) => call(`${P}/players/${id}/stats`, { method: "POST", body }),
  editStats: (id, rid, body) => call(`${P}/players/${id}/stats/${rid}`, { method: "PATCH", body }),
  voidStats: (id, rid) => call(`${P}/players/${id}/stats/${rid}`, { method: "DELETE" }),
  addTeam: (body) => call(`${P}/teams`, { method: "POST", body }),
  editTeam: (tid, body) => call(`${P}/teams/${tid}`, { method: "PATCH", body }),
  addTeamMember: (tid, body) => call(`${P}/teams/${tid}/members`, { method: "POST", body }),
  endTeamMember: (mid, body = {}) => call(`${P}/team-members/${mid}`, { method: "PATCH", body }),
  // Etapa 3: objetivos medibles, notas clasificadas y comparación.
  createGoal: (id, body) => call(`${P}/players/${id}/goals`, { method: "POST", body }),
  editGoal: (id, gid, body) => call(`${P}/players/${id}/goals/${gid}`, { method: "PATCH", body }),
  addCheckin: (id, gid, body) => call(`${P}/players/${id}/goals/${gid}/checkins`, { method: "POST", body }),
  voidCheckin: (id, cid) => call(`${P}/players/${id}/checkins/${cid}`, { method: "DELETE" }),
  createNote: (id, body) => call(`${P}/players/${id}/notes`, { method: "POST", body }),
  editNote: (id, nid, body) => call(`${P}/players/${id}/notes/${nid}`, { method: "PATCH", body }),
  deleteNote: (id, nid) => call(`${P}/players/${id}/notes/${nid}`, { method: "DELETE" }),
  // Etapa 4: integración deportiva.
  planning: () => call(`${P}/planning`),
  addRoutine: (body) => call(`${P}/routines`, { method: "POST", body }),
  editRoutine: (rid, body) => call(`${P}/routines/${rid}`, { method: "PATCH", body }),
  addPlanItem: (id, body) => call(`${P}/players/${id}/plan`, { method: "POST", body }),
  editPlanItem: (id, iid, body) => call(`${P}/players/${id}/plan/${iid}`, { method: "PATCH", body }),
  saveAttendance: (body) => call(`${P}/attendance`, { method: "POST", body }),
  trainingOverview: (ref) => call(`${P}/trainings/${encodeURIComponent(ref)}`),
  reports: (pid) => call(`${P}/players/${pid}/reports`),
  addReport: (pid, body) => call(`${P}/players/${pid}/reports`, { method: "POST", body }),
  report: (id) => call(`${P}/reports/${id}`),
  editReport: (id, body) => call(`${P}/reports/${id}`, { method: "PATCH", body }),
  insights: (pid, { days = 90, notes = false } = {}) => call(`${P}/players/${pid}/insights?days=${days}${notes ? "&notes=1" : ""}`),
  ask: (pid, body) => call(`${P}/players/${pid}/ask`, { method: "POST", body }),
  uploadMedia: (pid, body) => call(`${P}/players/${pid}/media`, { method: "POST", body }),
  dataStatus: () => call(`${P}/data-status`),
  dataAction: (action) => call(`${P}/data-status`, { method: "POST", body: { action } }),
  compare: (ids) => call(`${P}/compare?ids=${ids.map(encodeURIComponent).join(",")}`),
  // Endpoints existentes del dominio de jugadores (se reutilizan, no se duplican).
  createPlayer: (body) => call("/api/players", { method: "POST", body }),
  updatePlayer: (id, body) => call(`/api/players/${id}`, { method: "PATCH", body }),
  archivePlayer: (id) => call(`/api/players/${id}`, { method: "DELETE" }),
  addNote: (id, text) => call(`/api/players/${id}/notes`, { method: "POST", body: { body: text } }),
  addGoal: (id, text) => call(`/api/players/${id}/goals`, { method: "POST", body: { body: text, status: "active" } }),
  updateGoal: (id, gid, body) => call(`/api/players/${id}/goals/${gid}`, { method: "PATCH", body }),
  addEvolution: (id, message) => call(`/api/players/${id}/evolution`, { method: "POST", body: { message } }),
  invite: (id, body) => call(`/api/players/${id}/invitations`, { method: "POST", body }),
  revokeMember: (id, mid) => call(`/api/players/${id}/members/${mid}`, { method: "DELETE" })
};

/** Achica una imagen a un cuadrado de `size` px en JPEG (las fotos pesan mucho menos). */
export function resizeImage(file, size = 320) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error("Elegí una imagen."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        // webp pesa bastante menos; si el navegador no lo genera, jpeg.
        const webp = canvas.toDataURL("image/webp", 0.8);
        resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export const ACCESS_LABEL = { admin: "Administrador", editor: "Editor", viewer: "Lector" };
