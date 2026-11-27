/**
 * Traduce errores de Supabase Auth a mensajes claros en español.
 * Nunca devuelve el texto técnico al usuario: el código sanitizado se
 * conserva aparte (para diagnóstico) sin tokens ni datos personales.
 */

export const AUTH_MESSAGES = {
  generic: "No pudimos procesar la solicitud. Intentá nuevamente más tarde.",
  network: "No pudimos conectarnos con el servicio. Revisá tu conexión e intentá nuevamente.",
  invalidCredentials: "No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.",
  emailNotConfirmed: "Tu cuenta todavía no está confirmada. Revisá tu correo para continuar con la confirmación.",
  rateLimited: "Hiciste varios intentos seguidos. Esperá unos minutos y volvé a intentar.",
  emailRateLimited: "Ya pedimos varios correos en poco tiempo. Esperá unos minutos antes de pedir otro.",
  linkExpired: "Este enlace venció o ya se usó. Solicitá uno nuevo.",
  linkInvalid: "Este enlace no es válido. Solicitá uno nuevo.",
  weakPassword: "La contraseña es demasiado débil. Usá una más larga, con letras y números.",
  samePassword: "La nueva contraseña tiene que ser distinta de la anterior.",
  sessionMissing: "Tu sesión expiró. Volvé a iniciar sesión.",
  signupUnavailable: "No pudimos crear la cuenta con esos datos. Si ya tenés una cuenta, iniciá sesión o recuperá tu contraseña.",
  emailNotAuthorized: "No pudimos enviar el correo en este momento. Intentá nuevamente más tarde.",
  invalidEmail: "Ingresá un correo electrónico válido.",
  providerDisabled: "Este método de acceso no está disponible por ahora."
};

const CODE_MAP = {
  invalid_credentials: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  over_request_rate_limit: "rateLimited",
  over_email_send_rate_limit: "emailRateLimited",
  over_sms_send_rate_limit: "rateLimited",
  otp_expired: "linkExpired",
  flow_state_expired: "linkExpired",
  flow_state_not_found: "linkInvalid",
  bad_code_verifier: "linkInvalid",
  bad_jwt: "sessionMissing",
  weak_password: "weakPassword",
  same_password: "samePassword",
  session_not_found: "sessionMissing",
  session_expired: "sessionMissing",
  refresh_token_not_found: "sessionMissing",
  refresh_token_already_used: "sessionMissing",
  user_not_found: "sessionMissing",
  user_already_exists: "signupUnavailable",
  email_exists: "signupUnavailable",
  signup_disabled: "signupUnavailable",
  email_address_invalid: "invalidEmail",
  email_address_not_authorized: "emailNotAuthorized",
  provider_disabled: "providerDisabled",
  email_provider_disabled: "providerDisabled"
};

/** Código técnico sanitizado (solo letras, números y guiones bajos). */
export function authErrorCode(error) {
  if (!error) return "unknown";
  const code = String(error.code || error.error_code || "").toLowerCase();
  if (code) return code.replace(/[^a-z0-9_]/g, "").slice(0, 60) || "unknown";
  const name = String(error.name || "").toLowerCase();
  const message = String(error.message || error.error_description || "").toLowerCase();
  if (name.includes("retryablefetch") || message.includes("failed to fetch") || message.includes("network")) return "network";
  if (message.includes("invalid login credentials")) return "invalid_credentials";
  if (message.includes("email not confirmed")) return "email_not_confirmed";
  if (message.includes("expired")) return "otp_expired";
  if (message.includes("rate limit")) return "over_request_rate_limit";
  if (message.includes("auth session missing")) return "session_not_found";
  const status = Number(error.status || 0);
  if (status === 429) return "over_request_rate_limit";
  if (status >= 500) return "server_error";
  return status ? `http_${status}` : "unknown";
}

/**
 * @param {unknown} error
 * @returns {{ code: string, key: string, message: string }}
 */
export function describeAuthError(error) {
  const code = authErrorCode(error);
  let key = CODE_MAP[code];
  if (!key) key = code === "network" ? "network" : "generic";
  return { code, key, message: AUTH_MESSAGES[key] };
}

/** Log de diagnóstico sin datos sensibles (sin correo, token ni contraseña). */
export function logAuthIssue(action, error) {
  const { code } = describeAuthError(error);
  const status = Number(error?.status || 0) || undefined;
  if (typeof console !== "undefined") {
    console.warn("[BasketLab][auth]", { action, code, status });
  }
  return code;
}
