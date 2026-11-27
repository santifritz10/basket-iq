/**
 * Resolución centralizada de URLs para autenticación.
 *
 * Es código puro (sin dependencias de Next ni del navegador) para poder
 * usarlo en el servidor, en el cliente y en los tests.
 *
 * Reglas:
 *  - Producción: siempre la URL configurada (NEXT_PUBLIC_SITE_URL) o, si
 *    falta, la URL pública conocida. Nunca localhost.
 *  - Desarrollo local: el origen desde el que se abrió la app (localhost).
 *  - Entornos de prueba (preview): solo orígenes listados explícitamente en
 *    AUTH_ALLOWED_ORIGINS. Si no está listado, se usa la URL de producción.
 */

export const DEFAULT_PRODUCTION_URL = "https://basket-iq.vercel.app";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLocalHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
}

/** Devuelve el origen normalizado ("https://dominio") o "" si no es válido. */
export function normalizeOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let url;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return "";
  }
  if (url.username || url.password) return "";
  if (url.protocol === "https:") return url.origin;
  if (url.protocol === "http:" && isLocalHostname(url.hostname)) return url.origin;
  return "";
}

export function isLocalOrigin(origin) {
  try {
    return isLocalHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function parseOriginList(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
}

/**
 * Configuración que el servidor le pasa al cliente.
 * @param {{ siteUrl?: string, allowedOrigins?: string, vercelEnv?: string, nodeEnv?: string }} env
 */
export function buildSiteConfig({ siteUrl, allowedOrigins, vercelEnv, nodeEnv } = {}) {
  const isProduction = vercelEnv ? vercelEnv === "production" : nodeEnv === "production";
  let resolvedSite = normalizeOrigin(siteUrl);
  // En producción nunca aceptamos una URL local como URL del sitio.
  if (isProduction && (!resolvedSite || isLocalOrigin(resolvedSite))) {
    resolvedSite = DEFAULT_PRODUCTION_URL;
  }
  const origins = new Set(parseOriginList(allowedOrigins));
  if (resolvedSite) origins.add(resolvedSite);
  return {
    siteUrl: resolvedSite,
    allowedOrigins: Array.from(origins),
    isProduction
  };
}

/**
 * Elige el origen al que deben volver los enlaces de los correos.
 * @param {{ siteUrl: string, allowedOrigins: string[], isProduction: boolean }} config
 * @param {string} currentOrigin origen de la página actual (window.location.origin)
 */
export function pickRedirectOrigin(config, currentOrigin) {
  const current = normalizeOrigin(currentOrigin);
  const allowed = new Set(config?.allowedOrigins || []);
  if (current && allowed.has(current)) return current;
  if (current && !config?.isProduction && isLocalOrigin(current)) return current;
  return config?.siteUrl || DEFAULT_PRODUCTION_URL;
}

/** Rutas a las que nunca tiene sentido volver después de autenticarse. */
const AUTH_ONLY_PATHS = [
  "/login",
  "/registro",
  "/verificar-correo",
  "/recuperar-contrasena",
  "/nueva-contrasena",
  "/auth/confirm",
  "/cerrar-sesion"
];

/**
 * Valida un destino de retorno ("next"). Solo acepta rutas internas o URLs
 * absolutas de orígenes permitidos (que se convierten en ruta). Evita
 * redirecciones abiertas a dominios externos.
 */
export function sanitizeNextPath(next, { allowedOrigins = [], fallback = "/" } = {}) {
  const raw = String(next ?? "").trim();
  if (!raw || raw.length > 512) return fallback;
  // Caracteres de control o barras invertidas permiten trucos tipo "/\evil.com".
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;

  let path;
  if (raw.startsWith("/")) {
    if (raw.startsWith("//")) return fallback;
    path = raw;
  } else {
    let url;
    try {
      url = new URL(raw);
    } catch {
      return fallback;
    }
    const origin = normalizeOrigin(url.origin);
    if (!origin || !allowedOrigins.includes(origin)) return fallback;
    path = `${url.pathname}${url.search}${url.hash}`;
  }

  let parsed;
  try {
    parsed = new URL(path, "https://basket-lab.invalid");
  } catch {
    return fallback;
  }
  if (parsed.origin !== "https://basket-lab.invalid") return fallback;
  const pathname = parsed.pathname;
  if (AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return fallback;
  return `${pathname}${parsed.search}${parsed.hash}`;
}

/** Construye una URL absoluta de retorno: origen + ruta (+ ?next=). */
export function buildRedirectUrl(origin, path, next) {
  const url = new URL(path, origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}
