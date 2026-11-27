"use client";

/**
 * Marca que esta pestaña llegó desde un enlace de recuperación válido.
 * La pantalla de contraseña nueva exige esta marca además de la sesión, así
 * una sesión abierta cualquiera no alcanza para cambiar la contraseña ahí.
 */
const KEY = "bl_recovery_context";
const MAX_AGE_MS = 30 * 60 * 1000;

export function markRecoveryContext(userId) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ uid: userId || "", at: Date.now() }));
  } catch {
    /* sin almacenamiento: la pantalla pedirá un enlace nuevo */
  }
}

export function readRecoveryContext(userId) {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(KEY) || "null");
    if (!raw || !raw.at || Date.now() - raw.at > MAX_AGE_MS) return false;
    return !raw.uid || !userId || raw.uid === userId;
  } catch {
    return false;
  }
}

export function clearRecoveryContext() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}
