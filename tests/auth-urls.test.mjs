import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSiteConfig,
  pickRedirectOrigin,
  sanitizeNextPath,
  normalizeOrigin,
  buildRedirectUrl,
  DEFAULT_PRODUCTION_URL
} from "../lib/auth/site-url.js";
import { cookieMaxAgeForToken, readJwtExpiry } from "../lib/auth/jwt.js";
import { checkPassword, isPasswordValid, isValidEmail, maskEmail } from "../lib/auth/password.js";
import { describeAuthError } from "../lib/auth/messages.js";

test("producción nunca usa localhost", () => {
  const cfg = buildSiteConfig({ siteUrl: "http://localhost:3000", vercelEnv: "production" });
  assert.equal(cfg.siteUrl, DEFAULT_PRODUCTION_URL);
  assert.equal(pickRedirectOrigin(cfg, "http://localhost:3000"), DEFAULT_PRODUCTION_URL);
});

test("producción sin variable usa la URL pública conocida", () => {
  const cfg = buildSiteConfig({ vercelEnv: "production" });
  assert.equal(cfg.siteUrl, "https://basket-iq.vercel.app");
  assert.equal(pickRedirectOrigin(cfg, "https://basket-iq.vercel.app"), "https://basket-iq.vercel.app");
});

test("producción respeta NEXT_PUBLIC_SITE_URL y quita la barra final", () => {
  const cfg = buildSiteConfig({ siteUrl: "https://app.basketlab.com/", vercelEnv: "production" });
  assert.equal(cfg.siteUrl, "https://app.basketlab.com");
});

test("desarrollo local usa el origen local", () => {
  const cfg = buildSiteConfig({ nodeEnv: "development" });
  assert.equal(pickRedirectOrigin(cfg, "http://localhost:3000"), "http://localhost:3000");
});

test("preview solo usa orígenes autorizados", () => {
  const cfg = buildSiteConfig({
    siteUrl: "https://basket-iq.vercel.app",
    allowedOrigins: "https://basket-iq-staging.vercel.app",
    vercelEnv: "preview"
  });
  assert.equal(pickRedirectOrigin(cfg, "https://basket-iq-staging.vercel.app"), "https://basket-iq-staging.vercel.app");
  assert.equal(pickRedirectOrigin(cfg, "https://otro-preview.vercel.app"), "https://basket-iq.vercel.app");
});

test("normalizeOrigin rechaza http remoto y credenciales", () => {
  assert.equal(normalizeOrigin("http://evil.com"), "");
  assert.equal(normalizeOrigin("https://user:pw@evil.com"), "");
  assert.equal(normalizeOrigin("javascript:alert(1)"), "");
});

test("sanitizeNextPath evita redirecciones abiertas", () => {
  const opts = { allowedOrigins: ["https://basket-iq.vercel.app"] };
  assert.equal(sanitizeNextPath("/assistant", opts), "/assistant");
  assert.equal(sanitizeNextPath("/players?id=3#x", opts), "/players?id=3#x");
  assert.equal(sanitizeNextPath("https://basket-iq.vercel.app/plays", opts), "/plays");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com/x", "javascript:alert(1)", "evil.com", "/%0d%0a", "\t/x"]) {
    const out = sanitizeNextPath(bad, opts);
    assert.ok(out.startsWith("/") && !out.startsWith("//"), `${bad} -> ${out}`);
    assert.ok(!out.includes("evil"), `${bad} -> ${out}`);
  }
  assert.equal(sanitizeNextPath("/login?next=/x", opts), "/");
  assert.equal(sanitizeNextPath("", opts), "/");
});

test("buildRedirectUrl arma la URL de retorno", () => {
  assert.equal(
    buildRedirectUrl("https://basket-iq.vercel.app", "/auth/confirm", "/nueva-contrasena"),
    "https://basket-iq.vercel.app/auth/confirm?next=%2Fnueva-contrasena"
  );
});

function fakeJwt(payload) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.firma`;
}

test("la cookie dura lo que le queda al token, máximo 1 hora", () => {
  const now = 1_000_000;
  assert.equal(readJwtExpiry(fakeJwt({ exp: now + 10 })), now + 10);
  assert.equal(cookieMaxAgeForToken(fakeJwt({ exp: now + 300 }), now), 300);
  assert.equal(cookieMaxAgeForToken(fakeJwt({ exp: now + 99999 }), now), 3600);
  assert.equal(cookieMaxAgeForToken(fakeJwt({ exp: now - 1 }), now), 0);
  assert.equal(cookieMaxAgeForToken("basura", now), 0);
});

test("reglas de contraseña y correo", () => {
  assert.equal(isPasswordValid("abc12345"), true);
  assert.equal(isPasswordValid("abcdefgh"), false);
  assert.equal(isPasswordValid("1234567"), false);
  assert.deepEqual(checkPassword("a1").map((r) => r.ok), [false, true, true]);
  assert.equal(isValidEmail("coach@club.com.ar"), true);
  assert.equal(isValidEmail("coach@club"), false);
  assert.equal(maskEmail("pilar@gmail.com"), "pi•••@gmail.com");
});

test("errores de Supabase se traducen sin exponer detalles", () => {
  assert.equal(describeAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }).key, "invalidCredentials");
  assert.equal(describeAuthError({ message: "Email not confirmed" }).key, "emailNotConfirmed");
  assert.equal(describeAuthError({ code: "otp_expired" }).message, "Este enlace venció o ya se usó. Solicitá uno nuevo.");
  assert.equal(describeAuthError({ status: 429 }).key, "rateLimited");
  assert.equal(describeAuthError({ name: "AuthRetryableFetchError" }).key, "network");
  const weird = describeAuthError({ message: "duplicate key value violates unique constraint" });
  assert.equal(weird.key, "generic");
  assert.ok(!weird.message.includes("duplicate"));
});

import { sanitizeProfileInput, baseUsernameFromEmail } from "../lib/auth/profile.js";

test("el perfil ignora campos de permisos y limpia valores", () => {
  const out = sanitizeProfileInput({
    full_name: "  Pili   Fritz ",
    sport_role: "admin",
    is_admin: true,
    role: "service_role",
    club: "x".repeat(300),
    categories: ["U13", "U13", " U15 ", "", 5]
  });
  assert.deepEqual(Object.keys(out).sort(), ["categories", "club", "full_name", "sport_role"]);
  assert.equal(out.full_name, "Pili Fritz");
  assert.equal(out.sport_role, null);
  assert.equal(out.club.length, 120);
  assert.deepEqual(out.categories, ["U13", "U15", "5"]);
  assert.equal(sanitizeProfileInput({ sport_role: "entrenador" }).sport_role, "entrenador");
});

test("usuario por defecto desde el correo", () => {
  assert.equal(baseUsernameFromEmail("Coach.Fritz+test@gmail.com"), "coach_fritz_test");
  assert.equal(baseUsernameFromEmail("a@b.com"), "usuario");
});
