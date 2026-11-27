// Servidor falso de Supabase (Auth + tabla profiles) para pruebas de punta a
// punta sin tocar el proyecto real. Solo implementa lo que usa Basket Lab.
// Uso: node tests/e2e/mock-supabase.mjs [puerto]
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.argv[2] || 54321);
const users = new Map(); // id -> user
const tokens = new Map(); // access token -> user id
const refreshTokens = new Map();
const otps = new Map(); // token_hash -> { userId, type, used }
const outbox = [];
const profiles = new Map();
let accessTtl = 3600;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

function publicUser(u) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.confirmedAt,
    confirmed_at: u.confirmedAt,
    created_at: u.createdAt,
    updated_at: u.createdAt,
    user_metadata: u.meta,
    app_metadata: { provider: "email", providers: ["email"] },
    identities: [{ id: u.id, provider: "email", identity_data: { email: u.email } }]
  };
}

function issueSession(u) {
  const exp = Math.floor(Date.now() / 1000) + accessTtl;
  const access = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, email: u.email, role: "authenticated", exp })}.${crypto.randomBytes(8).toString("hex")}`;
  const refresh = crypto.randomBytes(12).toString("hex");
  tokens.set(access, u.id);
  refreshTokens.set(refresh, u.id);
  return { access_token: access, token_type: "bearer", expires_in: accessTtl, expires_at: exp, refresh_token: refresh, user: publicUser(u) };
}

function newOtp(u, type, redirectTo) {
  const hash = crypto.randomBytes(16).toString("hex");
  otps.set(hash, { userId: u.id, type, used: false, createdAt: Date.now() });
  outbox.push({ to: u.email, type, token_hash: hash, redirect_to: redirectTo || null, at: Date.now() });
  return hash;
}

function err(res, status, code, msg) {
  send(res, status, { code: status, error_code: code, msg });
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Expose-Headers": "*"
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function authUser(req) {
  const h = req.headers.authorization || "";
  const token = h.replace(/^Bearer\s+/i, "");
  const id = tokens.get(token);
  if (!id) return null;
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  if (payload.exp * 1000 < Date.now()) return null;
  return users.get(id) || null;
}

function findByEmail(email) {
  for (const u of users.values()) if (u.email === String(email || "").toLowerCase()) return u;
  return null;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function eqParam(url, name) {
  const v = url.searchParams.get(name);
  return v && v.startsWith("eq.") ? decodeURIComponent(v.slice(3)) : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === "OPTIONS") return send(res, 204);
  const body = await readBody(req);
  const p = url.pathname;

  // ----- ayudas para los tests
  if (p === "/__outbox") return send(res, 200, outbox);
  if (p === "/__reset") {
    users.clear(); tokens.clear(); refreshTokens.clear(); otps.clear(); outbox.length = 0; profiles.clear(); accessTtl = 3600;
    return send(res, 200, { ok: true });
  }
  if (p === "/__seed") {
    const u = { id: crypto.randomUUID(), email: body.email.toLowerCase(), password: body.password, confirmedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), meta: { full_name: body.name || "Usuario existente" } };
    users.set(u.id, u);
    if (body.profile !== false) profiles.set(u.id, { id: u.id, username: body.username || u.email.split("@")[0], full_name: u.meta.full_name, sport_role: null, club: null, categories: [], onboarding_completed_at: null });
    return send(res, 200, { id: u.id });
  }
  if (p === "/__session") {
    const u = findByEmail(body.email);
    return send(res, 200, issueSession(u));
  }
  if (p === "/__expire-otps") {
    for (const o of otps.values()) o.createdAt = 0;
    return send(res, 200, { ok: true });
  }
  if (p === "/__profiles") return send(res, 200, Array.from(profiles.values()));

  // ----- Auth
  if (p === "/auth/v1/signup" && req.method === "POST") {
    const email = String(body.email || "").toLowerCase();
    const existing = findByEmail(email);
    if (existing) {
      // Igual que Supabase con confirmación activa: respuesta sin pistas.
      return send(res, 200, { id: crypto.randomUUID(), email, identities: [], user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() });
    }
    if (String(body.password || "").length < 6) return err(res, 422, "weak_password", "Password should be at least 6 characters");
    const u = { id: crypto.randomUUID(), email, password: body.password, confirmedAt: null, createdAt: new Date().toISOString(), meta: body.data || {} };
    users.set(u.id, u);
    newOtp(u, "signup", url.searchParams.get("redirect_to"));
    return send(res, 200, publicUser(u));
  }
  if (p === "/auth/v1/token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const u = findByEmail(body.email);
      if (!u || u.password !== body.password) return err(res, 400, "invalid_credentials", "Invalid login credentials");
      if (!u.confirmedAt) return err(res, 400, "email_not_confirmed", "Email not confirmed");
      return send(res, 200, issueSession(u));
    }
    if (grant === "refresh_token") {
      const id = refreshTokens.get(body.refresh_token);
      if (!id) return err(res, 400, "refresh_token_not_found", "Invalid Refresh Token");
      refreshTokens.delete(body.refresh_token);
      return send(res, 200, issueSession(users.get(id)));
    }
    return err(res, 400, "validation_failed", "unsupported grant");
  }
  if (p === "/auth/v1/verify" && req.method === "POST") {
    const o = otps.get(body.token_hash);
    const typeOk = o && (o.type === body.type || (o.type === "signup" && body.type === "email"));
    if (!o || o.used || !typeOk || Date.now() - o.createdAt > 3600_000) return err(res, 403, "otp_expired", "Email link is invalid or has expired");
    o.used = true;
    const u = users.get(o.userId);
    if (!u.confirmedAt) u.confirmedAt = new Date().toISOString();
    return send(res, 200, issueSession(u));
  }
  if (p === "/auth/v1/recover" && req.method === "POST") {
    const u = findByEmail(body.email);
    if (u) newOtp(u, "recovery", url.searchParams.get("redirect_to"));
    return send(res, 200, {});
  }
  if (p === "/auth/v1/resend" && req.method === "POST") {
    const u = findByEmail(body.email);
    if (u && !u.confirmedAt) newOtp(u, "signup", url.searchParams.get("redirect_to"));
    return send(res, 200, {});
  }
  if (p === "/auth/v1/user") {
    const u = authUser(req);
    if (!u) return err(res, 403, "bad_jwt", "invalid JWT");
    if (req.method === "PUT") {
      if (body.password) {
        if (body.password === u.password) return err(res, 422, "same_password", "New password should be different from the old password.");
        u.password = body.password;
      }
      if (body.data) u.meta = { ...u.meta, ...body.data };
    }
    return send(res, 200, publicUser(u));
  }
  if (p === "/auth/v1/logout") {
    const u = authUser(req);
    const scope = url.searchParams.get("scope") || "global";
    if (u && scope !== "local") {
      for (const [t, id] of tokens) if (id === u.id && (scope === "global" || t !== (req.headers.authorization || "").slice(7))) tokens.delete(t);
    } else if (u) {
      tokens.delete((req.headers.authorization || "").slice(7));
    }
    return send(res, 204);
  }

  // ----- PostgREST: profiles (RLS simulada: solo la fila propia)
  if (p === "/rest/v1/profiles") {
    const u = authUser(req);
    if (!u) return send(res, 200, []);
    const id = eqParam(url, "id");
    if (req.method === "GET") {
      const row = id === u.id ? profiles.get(u.id) : null;
      return send(res, 200, row ? [row] : []);
    }
    if (req.method === "PATCH") {
      const row = id === u.id ? profiles.get(u.id) : null;
      if (!row) return send(res, 200, []);
      const allowed = ["full_name", "sport_role", "club", "categories", "onboarding_completed_at", "username"];
      for (const k of Object.keys(body)) if (allowed.includes(k)) row[k] = body[k];
      return send(res, 200, [row]);
    }
    if (req.method === "POST") {
      const rows = Array.isArray(body) ? body : [body];
      for (const r of rows) {
        if (r.id !== u.id) return send(res, 403, { code: "42501", message: "rls" });
        const ignore = String(req.headers.prefer || "").includes("ignore-duplicates");
        if (profiles.has(r.id) && ignore) continue;
        for (const other of profiles.values()) if (other.username === r.username && other.id !== r.id) return send(res, 409, { code: "23505", message: "duplicate key" });
        profiles.set(r.id, { categories: [], sport_role: null, club: null, onboarding_completed_at: null, ...(profiles.get(r.id) || {}), ...r });
      }
      return send(res, 201, rows);
    }
  }
  if (p.startsWith("/rest/v1/")) return send(res, 200, []);
  return send(res, 404, { msg: "not found" });
});

server.listen(PORT, "127.0.0.1", () => console.log(`mock supabase on ${PORT}`));
