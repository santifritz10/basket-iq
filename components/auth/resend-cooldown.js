"use client";

/** Límite de reenvío por correo (Supabase también limita del lado servidor). */
export const RESEND_COOLDOWN_SECONDS = 60;
const PREFIX = "bl_resend_";

function key(scope, email) {
  return `${PREFIX}${scope}_${String(email || "").toLowerCase()}`;
}

export function markResendCooldown(email, scope = "signup") {
  try {
    window.localStorage.setItem(key(scope, email), String(Date.now()));
  } catch {
    /* almacenamiento bloqueado: el límite del servidor sigue vigente */
  }
}

export function remainingCooldown(email, scope = "signup") {
  try {
    const at = Number(window.localStorage.getItem(key(scope, email)) || 0);
    if (!at) return 0;
    return Math.max(0, Math.ceil((at + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
  } catch {
    return 0;
  }
}
