/** Lee la fecha de vencimiento (exp, en segundos) de un JWT sin validarlo. */
export function readJwtExpiry(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? decodeURIComponent(
            Array.from(atob(padded))
              .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
              .join("")
          )
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json);
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Segundos de vida para la cookie de acceso: lo que le queda al token,
 * con un máximo de una hora. Devuelve 0 si ya venció.
 */
export function cookieMaxAgeForToken(token, nowSeconds = Math.floor(Date.now() / 1000)) {
  const exp = readJwtExpiry(token);
  if (!exp) return 0;
  const remaining = exp - nowSeconds;
  if (remaining <= 0) return 0;
  return Math.min(remaining, 3600);
}
