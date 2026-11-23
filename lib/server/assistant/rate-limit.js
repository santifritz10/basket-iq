import "server-only";

/**
 * Control básico de frecuencia por usuario autenticado.
 *
 * Vive en la memoria del servidor: en Vercel cada instancia lleva su propia
 * cuenta, así que es una barrera contra el abuso, no un contador exacto.
 * La cuota gratuita de Gemini sigue siendo el tope real.
 */
export const RATE_LIMITS = {
  perMinute: 6,
  perDay: 100
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const buckets = new Map();

export function checkRateLimit(userId, now = Date.now()) {
  const key = String(userId);
  const history = (buckets.get(key) || []).filter((t) => now - t < DAY_MS);

  const lastMinute = history.filter((t) => now - t < MINUTE_MS);
  if (lastMinute.length >= RATE_LIMITS.perMinute) {
    const retryAfterMs = MINUTE_MS - (now - lastMinute[0]);
    buckets.set(key, history);
    return { allowed: false, scope: "minute", retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }
  if (history.length >= RATE_LIMITS.perDay) {
    const retryAfterMs = DAY_MS - (now - history[0]);
    buckets.set(key, history);
    return { allowed: false, scope: "day", retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  history.push(now);
  buckets.set(key, history);

  if (buckets.size > 5000) {
    for (const [k, times] of buckets) {
      if (!times.length || now - times[times.length - 1] > DAY_MS) buckets.delete(k);
    }
  }
  return { allowed: true };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
