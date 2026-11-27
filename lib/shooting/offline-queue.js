/**
 * Cola local de registros pendientes de enviar (sin conexión o con error de red).
 * Cada registro lleva su client_entry_id: reenviarlo nunca duplica en el servidor.
 * `storage` se inyecta (localStorage en el navegador) y todo acceso está protegido.
 */
const PREFIX = "shootingLab.pending.";

export function queueKey(sessionId) {
  return `${PREFIX}${sessionId}`;
}

export function readQueue(storage, sessionId) {
  try {
    const raw = storage?.getItem(queueKey(sessionId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((e) => e && e.client_entry_id) : [];
  } catch {
    return [];
  }
}

export function writeQueue(storage, sessionId, list) {
  try {
    if (!list.length) storage?.removeItem(queueKey(sessionId));
    else storage?.setItem(queueKey(sessionId), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Agrega sin repetir client_entry_id. */
export function enqueue(list, entry) {
  if (list.some((e) => e.client_entry_id === entry.client_entry_id)) return list;
  return [...list, entry];
}

/** Quita de la cola lo que el servidor ya confirmó. */
export function removeConfirmed(list, confirmedIds) {
  const set = new Set(confirmedIds);
  return list.filter((e) => !set.has(e.client_entry_id));
}

/** Espera antes del próximo reintento: 2 s, 4 s, 8 s… hasta 60 s. */
export function backoffMs(attempt) {
  return Math.min(60000, 2000 * 2 ** Math.max(0, attempt));
}

/** ¿El error vale la pena reintentarlo? (red caída o error temporal del servidor) */
export function isRetryable(status) {
  return !status || status === 408 || status === 429 || status >= 500;
}

/** Une los registros del servidor con los pendientes, sin duplicar. */
export function mergeEntries(serverEntries, pending) {
  const seen = new Set((serverEntries || []).map((e) => e.client_entry_id));
  return [...(serverEntries || []), ...(pending || []).filter((e) => !seen.has(e.client_entry_id)).map((e) => ({ ...e, pending: true }))];
}

/** Próximo número de orden para lanzamientos individuales de la sesión. */
export function nextSeq(entries) {
  let max = -1;
  (entries || []).forEach((e) => {
    if (Number.isInteger(e.seq) && e.seq > max) max = e.seq;
  });
  return max + 1;
}
