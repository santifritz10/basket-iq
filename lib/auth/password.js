export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = [
  { id: "length", label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`, test: (v) => v.length >= PASSWORD_MIN_LENGTH },
  { id: "letter", label: "Al menos una letra", test: (v) => /[A-Za-zÀ-ÿ]/.test(v) },
  { id: "number", label: "Al menos un número", test: (v) => /\d/.test(v) }
];

export function checkPassword(value) {
  const v = String(value || "");
  return PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, ok: rule.test(v) }));
}

export function isPasswordValid(value) {
  return String(value || "").length <= 72 && checkPassword(value).every((r) => r.ok);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const v = normalizeEmail(value);
  return v.length <= 254 && EMAIL_RE.test(v);
}

export function maskEmail(value) {
  const v = normalizeEmail(value);
  const [user, domain] = v.split("@");
  if (!user || !domain) return v;
  const visible = user.length <= 2 ? user.charAt(0) : user.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(1, Math.min(6, user.length - visible.length)))}@${domain}`;
}
