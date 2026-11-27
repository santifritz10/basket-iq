// Pruebas de punta a punta de autenticación contra el servidor falso de
// Supabase (tests/e2e/mock-supabase.mjs) y la app compilada (next start).
// Uso: BASE=http://localhost:3100 MOCK=http://127.0.0.1:54321 node tests/e2e/auth-flows.mjs [carpeta-capturas]
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const MOCK = process.env.MOCK || "http://127.0.0.1:54321";
const SHOTS = process.argv[2] || "";
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok   - ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`FAIL - ${name}\n       ${e.message.split("\n")[0]}`);
  }
}

const mock = async (path, body) =>
  (await fetch(`${MOCK}${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })).json();
const lastMail = async (to, type) => (await mock("/__outbox")).filter((m) => m.to === to && m.type === type).pop();
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

async function noHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `desborde horizontal de ${overflow}px`);
}

const SUPABASE_UMD = fs.readFileSync(new URL("../../node_modules/@supabase/supabase-js/dist/umd/supabase.js", import.meta.url));
// Sin internet en el entorno de pruebas: servimos la misma versión fijada
// de supabase-js desde node_modules, y un lucide vacío.
async function prepare(context) {
  await context.route("https://cdn.jsdelivr.net/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: SUPABASE_UMD }));
  await context.route("https://unpkg.com/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "window.lucide={createIcons:function(){}};" }));
  return context;
}

const _launch = await chromium.launch();
const browser = {
  newContext: async (opts) => prepare(await _launch.newContext(opts)),
  close: () => _launch.close()
};
await mock("/__reset", {});
const EMAIL = "coach.nuevo@example.com";
const PASS = "Cancha2026";
const NEW_PASS = "Tablero2027";

let ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
let page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

await step("18. Ruta protegida sin sesión manda al login (servidor)", async () => {
  await page.goto(`${BASE}/assistant`);
  await page.waitForURL(/\/login\?next=%2Fassistant/);
  await page.getByRole("heading", { name: "Iniciar sesión" }).waitFor();
  await shot(page, "01-login-desktop");
});

await step("18b. La página principal sin sesión manda al login", async () => {
  await page.goto(`${BASE}/`);
  await page.waitForURL(/\/login/);
});

await step("Logo oficial visible en el login", async () => {
  const ok = await page.locator('img[src="/assets/images/logo-basketlab.svg"]').first().evaluate((img) => img.complete && img.naturalWidth > 0);
  assert.ok(ok, "el logo no cargó");
});

await step("Validación del registro (campos y requisitos)", async () => {
  await page.goto(`${BASE}/registro`);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByText("Ingresá tu nombre").waitFor();
  await page.getByLabel("Contraseña", { exact: true }).fill("abc");
  await page.getByLabel("Confirmar contraseña").fill("abd");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByText("Las contraseñas no coinciden.").waitFor();
  await page.getByText("La contraseña no cumple los requisitos.").waitFor();
  await shot(page, "02-registro-errores");
});

await step("1-2. Registro de usuario nuevo y pantalla «Revisá tu correo»", async () => {
  await page.getByLabel("Nombre").fill("Coach Nuevo");
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASS);
  await page.getByLabel("Confirmar contraseña").fill(PASS);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL(/\/verificar-correo/);
  await page.getByRole("heading", { name: "Revisá tu correo" }).waitFor();
  await page.getByText(EMAIL).waitFor();
  await page.getByRole("button", { name: /Reenviar correo \(\d+ s\)/ }).waitFor();
  await shot(page, "03-revisa-tu-correo");
});

await step("24. El enlace de confirmación vuelve a la app, no a localhost de otro puerto", async () => {
  const mail = await lastMail(EMAIL, "signup");
  assert.ok(mail, "no se pidió el correo");
  assert.equal(mail.redirect_to, `${BASE}/auth/confirm?next=%2Fbienvenida`);
});

await step("8. Usuario pendiente de confirmación no puede entrar", async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASS);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByText("Tu cuenta todavía no está confirmada").waitFor();
  await page.getByRole("link", { name: "Reenviar el correo de confirmación" }).click();
  await page.waitForURL(/\/verificar-correo\?email=/);
});

await step("9. Reenvío de confirmación (con límite)", async () => {
  await fetch(`${BASE}/`); // nada
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("bl_resend_")).forEach((k) => localStorage.removeItem(k)));
  await page.reload();
  const before = (await mock("/__outbox")).length;
  await page.getByRole("button", { name: "Reenviar correo" }).click();
  await page.getByText("Pedimos un nuevo envío").waitFor();
  assert.equal((await mock("/__outbox")).length, before + 1);
  await page.getByRole("button", { name: /Reenviar correo \(\d+ s\)/ }).waitFor();
  assert.ok(await page.getByRole("button", { name: /Reenviar correo \(/ }).isDisabled());
});

await step("4-5. Abrir el enlace de confirmación (token_hash) y llegar a la bienvenida", async () => {
  const mail = await lastMail(EMAIL, "signup");
  await page.goto(`${BASE}/auth/confirm?token_hash=${mail.token_hash}&type=email`);
  await page.waitForURL(/\/bienvenida/);
  await page.getByRole("heading", { name: /Bienvenido\/a, Coach/ }).waitFor();
  await shot(page, "04-bienvenida");
});

await step("Onboarding: rol, club y categorías (sin privilegios)", async () => {
  await page.getByRole("button", { name: "Entrenador/a" }).click();
  await page.getByLabel("Club o institución").fill("Club Atlético Ejemplo");
  await page.getByRole("button", { name: "U15" }).click();
  await page.getByRole("button", { name: "Guardar y empezar" }).click();
  await page.waitForURL(`${BASE}/`);
  const rows = await mock("/__profiles");
  const row = rows.find((r) => r.full_name === "Coach Nuevo");
  assert.ok(row, "no se creó el perfil");
  assert.equal(row.sport_role, "entrenador");
  assert.deepEqual(row.categories, ["U15"]);
  assert.ok(row.onboarding_completed_at);
});

await step("17. Persistencia: la app principal abre con la sesión y sobrevive a recargar", async () => {
  await page.locator("#app-container").waitFor({ state: "visible", timeout: 15000 });
  await page.reload();
  await page.locator("#app-container").waitFor({ state: "visible", timeout: 15000 });
  assert.ok(!page.url().includes("/login"));
});

await step("Ruta protegida con sesión (cookie del servidor)", async () => {
  await page.goto(`${BASE}/cuenta`);
  await page.getByRole("heading", { name: "Mi cuenta" }).waitFor();
  const res = await page.request.get(`${BASE}/plays`);
  assert.equal(res.url().includes("/login"), false, "el servidor no reconoció la sesión");
});

await step("Usuario con sesión que entra a /login vuelve a la app", async () => {
  await page.goto(`${BASE}/login?next=/cuenta`);
  await page.waitForURL(/\/cuenta/);
});

await step("Abrir redirección: next externo se ignora", async () => {
  await page.goto(`${BASE}/login?next=https://evil.example.com/robar`);
  await page.waitForURL((u) => u.origin === new URL(BASE).origin && !u.pathname.startsWith("/login"));
});

await step("15. Reutilizar el enlace de confirmación muestra «venció»", async () => {
  const mail = await lastMail(EMAIL, "signup"); // ya usado en el paso 4
  await page.goto(`${BASE}/auth/confirm?token_hash=${mail.token_hash}&type=email`);
  await page.getByRole("heading", { name: "Este enlace venció" }).waitFor();
  assert.ok(!page.url().includes("token_hash"), "el token quedó en la barra de direcciones");
  await shot(page, "05-enlace-vencido");
});

await step("15b. Enlace sin token muestra «Enlace no válido»", async () => {
  await page.goto(`${BASE}/auth/confirm`);
  await page.getByRole("heading", { name: "Enlace no válido" }).waitFor();
});

await step("16. Cerrar sesión", async () => {
  await page.goto(`${BASE}/cerrar-sesion`);
  await page.waitForURL(/\/login\?motivo=sesion-cerrada/);
  await page.getByText("Cerraste sesión correctamente.").waitFor();
  const res = await page.request.get(`${BASE}/plays`, { maxRedirects: 0 });
  assert.equal(res.status(), 307);
});

await step("7. Contraseña incorrecta: mensaje claro sin detalles técnicos", async () => {
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill("Equivocada99");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByText("No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.").waitFor();
  assert.equal(await page.getByText("Invalid login credentials").count(), 0);
  await shot(page, "06-login-error");
});

await step("6. Inicio de sesión correcto", async () => {
  await page.getByLabel("Contraseña", { exact: true }).fill(PASS);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.locator("#app-container").waitFor({ state: "visible", timeout: 15000 });
  await page.goto(`${BASE}/cerrar-sesion`);
  await page.waitForURL(/\/login/);
});

await step("Recuperación: no revela si el correo existe", async () => {
  await page.goto(`${BASE}/recuperar-contrasena`);
  await page.getByLabel("Correo electrónico").fill("no.existe@example.com");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByText("Si hay una cuenta de Basket Lab asociada a").waitFor();
  await shot(page, "07-recuperar-enviado");
});

await step("Contraseña nueva sin enlace válido: pide uno nuevo", async () => {
  await page.goto(`${BASE}/nueva-contrasena`);
  await page.getByRole("heading", { name: "Necesitamos un enlace nuevo" }).waitFor();
});

await step("10-11. Pedir recuperación y abrir el enlace (en otro navegador)", async () => {
  await page.goto(`${BASE}/recuperar-contrasena`);
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByRole("heading", { name: "Revisá tu correo" }).waitFor();
  const mail = await lastMail(EMAIL, "recovery");
  assert.equal(mail.redirect_to, `${BASE}/auth/confirm?next=%2Fnueva-contrasena`);
  // Otro "dispositivo": contexto nuevo, sin almacenamiento compartido.
  await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
  page = await ctx.newPage();
  await page.goto(`${BASE}/auth/confirm?token_hash=${mail.token_hash}&type=recovery`);
  await page.waitForURL(/\/nueva-contrasena/);
  await page.getByRole("heading", { name: "Creá una contraseña nueva" }).waitFor();
  await shot(page, "08-nueva-contrasena");
});

await step("12. Cambio de contraseña: valida coincidencia y guarda", async () => {
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(NEW_PASS);
  await page.getByLabel("Confirmar contraseña nueva").fill("Otra12345");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await page.getByText("Las contraseñas no coinciden.").waitFor();
  await page.getByLabel("Confirmar contraseña nueva").fill(NEW_PASS);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await page.getByRole("heading", { name: "Contraseña actualizada" }).waitFor();
  await shot(page, "09-contrasena-actualizada");
});

await step("13. Inicio de sesión con la contraseña nueva (y la vieja ya no sirve)", async () => {
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page.waitForURL(/\/login\?motivo=contrasena-actualizada/);
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASS);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByText("No pudimos iniciar sesión.").waitFor();
  await page.getByLabel("Contraseña", { exact: true }).fill(NEW_PASS);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/cerrar-sesion`);
  await page.waitForURL(/\/login/);
});

await step("14. Enlace de recuperación vencido ofrece pedir otro", async () => {
  await mock("/__expire-otps", {});
  await page.goto(`${BASE}/recuperar-contrasena`);
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("bl_resend_")).forEach((k) => localStorage.removeItem(k)));
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByRole("heading", { name: "Revisá tu correo" }).waitFor();
  await mock("/__expire-otps", {});
  const mail = await lastMail(EMAIL, "recovery");
  await page.goto(`${BASE}/auth/confirm?token_hash=${mail.token_hash}&type=recovery`);
  await page.getByRole("heading", { name: "Este enlace venció" }).waitFor();
  await page.getByRole("link", { name: "Pedir un enlace nuevo" }).click();
  await page.waitForURL(/\/recuperar-contrasena\?motivo=vencido/);
});

await step("Enlace de plantilla por defecto (#access_token, type=recovery) en la raíz", async () => {
  const session = await mock("/__session", { email: EMAIL });
  const hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: "3600",
    expires_at: String(session.expires_at),
    token_type: "bearer",
    type: "recovery"
  });
  await page.goto(`${BASE}/#${hash.toString()}`);
  await page.waitForURL(/\/nueva-contrasena/, { timeout: 15000 });
  assert.ok(!page.url().includes("access_token"));
});

await step("22. Usuario existente (creado antes) entra y conserva su perfil", async () => {
  await page.goto(`${BASE}/cerrar-sesion`);
  await page.waitForURL(/\/login/);
  await mock("/__seed", { email: "veterano@example.com", password: "Viejo123", name: "Coach Veterano", username: "veterano" });
  await page.getByLabel("Correo electrónico").fill("veterano@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("Viejo123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.locator("#app-container").waitFor({ state: "visible", timeout: 15000 });
  const rows = await mock("/__profiles");
  const vet = rows.filter((r) => r.full_name === "Coach Veterano");
  assert.equal(vet.length, 1);
  assert.equal(vet[0].username, "veterano");
});

await step("Usuario existente sin perfil: se crea sin duplicar", async () => {
  await page.goto(`${BASE}/cerrar-sesion`);
  await page.waitForURL(/\/login/);
  await mock("/__seed", { email: "veterano2@example.com", password: "Viejo123", name: "Sin Perfil", profile: false });
  await mock("/__seed", { email: "otro@example.com", password: "Viejo123", name: "Otro", username: "veterano2" });
  await page.getByLabel("Correo electrónico").fill("veterano2@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("Viejo123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.locator("#app-container").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);
  const rows = (await mock("/__profiles")).filter((r) => r.full_name === "Sin Perfil");
  assert.equal(rows.length, 1);
  assert.match(rows[0].username, /^veterano2_/);
});

await step("Sync de sesión rechaza pedidos de otro sitio (CSRF)", async () => {
  const res = await fetch(`${BASE}/api/auth/sync-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://evil.example.com" },
    body: JSON.stringify({ access_token: "x" })
  });
  assert.equal(res.status, 403);
});

await step("Encabezados: páginas privadas sin caché", async () => {
  const res = await fetch(`${BASE}/login`);
  assert.match(res.headers.get("cache-control") || "", /no-store/);
});

await ctx.close();

// ---------------------------------------------------------------- celular
const phone = await browser.newContext({ ...devices["iPhone 13"] });
const m = await phone.newPage();
for (const [path, name, heading] of [
  ["/login", "10-login-celular", "Iniciar sesión"],
  ["/registro", "11-registro-celular", "Creá tu cuenta"],
  ["/recuperar-contrasena", "12-recuperar-celular", "Recuperar contraseña"],
  ["/verificar-correo?email=coach%40example.com", "13-verificar-celular", "Revisá tu correo"],
  ["/auth/confirm", "14-enlace-invalido-celular", "Enlace no válido"]
]) {
  await step(`20. Celular: ${path} sin desbordes y con logo`, async () => {
    await m.goto(`${BASE}${path}`);
    await m.getByRole("heading", { name: heading }).waitFor();
    await noHorizontalOverflow(m);
    const logoVisible = (await m.locator('img[src="/assets/images/logo-basketlab.svg"]:visible').count()) > 0;
    assert.ok(logoVisible, "logo no visible");
    const main = m.locator('a[class*="button"], button[class*="button"]').first();
    const btn = (await main.count()) ? await main.boundingBox() : null;
    assert.ok(btn && btn.height >= 44, "botón principal chico para tocar");
    await shot(m, name);
  });
}
await phone.close();

// ------------------------------------------------------- computadora extra
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const d = await desk.newPage();
await step("21. Computadora: registro y recuperación en dos columnas", async () => {
  await d.goto(`${BASE}/registro`);
  await d.getByRole("heading", { name: "Creá tu cuenta" }).waitFor();
  assert.ok(await d.locator("aside").isVisible(), "falta la columna de marca");
  await noHorizontalOverflow(d);
  await shot(d, "15-registro-desktop");
  await d.goto(`${BASE}/recuperar-contrasena`);
  await shot(d, "16-recuperar-desktop");
});
await desk.close();
await browser.close();

const failed = results.filter((r) => !r.ok);
const relevantErrors = consoleErrors.filter((e) => !/favicon|Failed to load resource.*(lucide|jsdelivr|unpkg)|ERR_NAME_NOT_RESOLVED|ERR_TUNNEL|net::ERR/.test(e));
console.log(`\n${results.length - failed.length}/${results.length} pasos superados`);
if (relevantErrors.length) console.log("Errores de consola:", relevantErrors.slice(0, 5));
process.exit(failed.length ? 1 : 0);
