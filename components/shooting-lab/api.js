"use client";

/** Cliente de la API de Shooting Lab. Lanza ApiError con status y code. */
export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function call(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api/shooting-lab${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store"
    });
  } catch {
    throw new ApiError("Sin conexión. Se reintentará automáticamente.", 0, "network");
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data.ok === false) {
    throw new ApiError(data.error || "No se pudo completar la acción.", res.status, data.code || "error", data.details);
  }
  return data;
}

export const labApi = {
  overview: () => call(""),
  session: (id) => call(`/sessions/${id}`),
  create: (body) => call("/sessions", { method: "POST", body }),
  update: (id, body) => call(`/sessions/${id}`, { method: "PATCH", body }),
  duplicate: (id, body = {}) => call(`/sessions/${id}/duplicate`, { method: "POST", body }),
  remove: (id, confirmName) => call(`/sessions/${id}`, { method: "DELETE", body: { confirm_name: confirmName } }),
  addEntries: (id, entries) => call(`/sessions/${id}/entries`, { method: "POST", body: { entries } }),
  voidEntry: (id, entryId) => call(`/sessions/${id}/entries/${entryId}`, { method: "DELETE" })
};

export function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Respaldo para navegadores viejos (formato UUID v4).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function safeStorage() {
  try {
    const s = window.localStorage;
    const k = "__lab_probe__";
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y) return String(iso);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export const STATUS_LABEL = {
  draft: "Borrador",
  in_progress: "En curso",
  completed: "Finalizada",
  archived: "Archivada"
};
