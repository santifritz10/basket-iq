/**
 * Fotos y escudos en Supabase Storage (bucket PRIVADO "player-media").
 * - Solo el servidor sube y lee; el navegador recibe enlaces firmados que vencen.
 * - Migración progresiva: las imágenes viejas (base64 en players.photo_url / club_shield_url)
 *   se COPIAN y se verifican; recién después, y solo si el entrenador lo pide, se libera el texto viejo.
 */
import { DevError, check, requireAccess } from "./core.js";
import { accessMap } from "../shooting/lab-core.js";
import { legacyFundamentalsView } from "./model.js";

export const MEDIA_BUCKET = "player-media";
export const SIGNED_TTL = 3600;
const MAX_BYTES = 1024 * 1024;
const KINDS = { photo: { path: "photo_path", legacy: "photo_url" }, shield: { path: "shield_path", legacy: "club_shield_url" } };
const EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export function isMediaNotInstalledError(error) {
  const code = String(error?.code || "");
  return (code === "42703" || code === "PGRST204") && /photo_path|shield_path/.test(String(error?.message || ""));
}

function notInstalled() {
  return new DevError("Falta correr la migración docs/sql/016-player-media-storage.sql en Supabase.", 503, "media_not_installed");
}

function check16(result) {
  if (result.error && isMediaNotInstalledError(result.error)) throw notInstalled();
  return check(result);
}

/** data:image/...;base64,... → { mime, bytes } (solo webp/jpeg/png, hasta 1 MB). */
export function parseImageDataUrl(value) {
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(value || ""));
  if (!m) return null;
  const bytes = Buffer.from(m[2].replace(/\s+/g, ""), "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  return { mime: m[1], bytes };
}

function storageError(error) {
  const msg = String(error?.message || error || "");
  if (/bucket not found/i.test(msg)) return notInstalled();
  return new DevError("No se pudo guardar la imagen. Probá de nuevo.", 502, "storage_error");
}

async function uploadBytes(storage, path, img) {
  const { error } = await storage.from(MEDIA_BUCKET).upload(path, img.bytes, { contentType: img.mime, upsert: false, cacheControl: "3600" });
  if (error) throw storageError(error);
}

/** Comprueba que el archivo guardado tenga exactamente los mismos bytes. */
async function verifyBytes(storage, path, img) {
  const { data, error } = await storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) return false;
  const buf = Buffer.from(typeof data.arrayBuffer === "function" ? await data.arrayBuffer() : data);
  return buf.length === img.bytes.length && buf.equals(img.bytes);
}

function newPath(playerId, kind, mime, now) {
  return `${playerId}/${kind}-${now.getTime()}.${EXT[mime]}`;
}

/** Sube una foto o escudo nuevo (editor del jugador). Reemplaza la imagen vigente; no borra archivos. */
export async function uploadPlayerImage(db, storage, userId, playerId, body, { now = new Date() } = {}) {
  await requireAccess(db, userId, playerId, "editor");
  const kind = KINDS[body?.kind] ? body.kind : null;
  if (!kind) throw new DevError("Tipo de imagen inválido.", 400, "invalid_media");
  if (body?.remove === true) {
    // Quitar la imagen: deja de mostrarse (el archivo queda en Storage, no se borra).
    check16(await db.from("players").update({ [KINDS[kind].path]: null, [KINDS[kind].legacy]: null, updated_by_user_id: userId }).eq("id", playerId).select("id").single());
    return { kind, path: null, url: null };
  }
  const img = parseImageDataUrl(body?.data_url);
  if (!img) throw new DevError("La imagen tiene que ser webp, jpeg o png y pesar menos de 1 MB.", 400, "invalid_media");
  // Comprueba que la migración esté instalada antes de subir nada.
  check16(await db.from("players").select("id, photo_path").eq("id", playerId).maybeSingle());
  const path = newPath(playerId, kind, img.mime, now);
  await uploadBytes(storage, path, img);
  if (!(await verifyBytes(storage, path, img))) throw new DevError("No se pudo verificar la imagen guardada. Probá de nuevo.", 502, "storage_error");
  const patch = { [KINDS[kind].path]: path, updated_by_user_id: userId };
  // La imagen anterior en base64 queda reemplazada por una nueva elegida por el entrenador.
  patch[KINDS[kind].legacy] = null;
  check16(await db.from("players").update(patch).eq("id", playerId).select("id").single());
  const url = await signedUrl(storage, path);
  return { kind, path, url };
}

export async function signedUrl(storage, path) {
  const { data, error } = await storage.from(MEDIA_BUCKET).createSignedUrl(path, SIGNED_TTL);
  return error ? null : data?.signedUrl || null;
}

/** Enlaces firmados para varias rutas: { path: url }. */
export async function signedUrls(storage, paths) {
  const list = [...new Set((paths || []).filter(Boolean))];
  if (!list.length || !storage) return {};
  const { data, error } = await storage.from(MEDIA_BUCKET).createSignedUrls(list, SIGNED_TTL);
  if (error || !Array.isArray(data)) return {};
  return Object.fromEntries(data.filter((d) => d.signedUrl && !d.error).map((d) => [d.path, d.signedUrl]));
}

/**
 * Reemplaza en los jugadores photo_url/club_shield_url por enlaces firmados cuando la imagen ya está en
 * Storage. Las que siguen en base64 se devuelven igual (compatibilidad).
 */
export async function withMediaUrls(storage, players) {
  const paths = [];
  players.forEach((p) => paths.push(p.photo_path, p.shield_path));
  const urls = storage ? await signedUrls(storage, paths) : {};
  return players.map((p) => {
    const out = { ...p };
    if (p.photo_path) out.photo_url = urls[p.photo_path] || null;
    if (p.shield_path) out.club_shield_url = urls[p.shield_path] || null;
    out.media_in_storage = Boolean(p.photo_path || p.shield_path);
    return out;
  });
}

// ---------------------------------------------------------------------------
// Migración progresiva de imágenes viejas
// ---------------------------------------------------------------------------

async function adminPlayerIds(db, userId) {
  const access = await accessMap(db, userId);
  return Object.keys(access).filter((id) => access[id] === "admin");
}

/** Estado: cuántas imágenes viejas hay, cuántas ya se copiaron y cuánto pesan (solo jugadores que administrás). */
export async function mediaStatus(db, userId) {
  const ids = await adminPlayerIds(db, userId);
  const empty = { installed: true, players: ids.length, pending: 0, copied: 0, releasable: 0, pendingBytes: 0 };
  if (!ids.length) return empty;
  const res = await db.from("players").select("id, photo_url, club_shield_url, photo_path, shield_path").in("id", ids);
  if (res.error && isMediaNotInstalledError(res.error)) return { ...empty, installed: false };
  const rows = check(res) || [];
  const out = { ...empty };
  rows.forEach((r) => {
    Object.values(KINDS).forEach((k) => {
      const legacy = String(r[k.legacy] || "");
      if (!legacy.startsWith("data:image")) return;
      if (r[k.path]) {
        out.copied += 1;
        out.releasable += 1;
      } else {
        out.pending += 1;
        out.pendingBytes += Math.round((legacy.length * 3) / 4);
      }
    });
  });
  return out;
}

/** Copia a Storage las imágenes base64 de los jugadores que administrás. Verifica cada copia. No borra nada. */
export async function migrateLegacyImages(db, storage, userId, { limit = 25, now = new Date() } = {}) {
  const ids = await adminPlayerIds(db, userId);
  const result = { copied: 0, skipped: 0, failed: 0 };
  if (!ids.length) return { ...result, remaining: 0 };
  const rows = check16(await db.from("players").select("id, photo_url, club_shield_url, photo_path, shield_path").in("id", ids)) || [];
  let done = 0;
  for (const r of rows) {
    for (const [kind, k] of Object.entries(KINDS)) {
      if (done >= limit) break;
      if (r[k.path] || !String(r[k.legacy] || "").startsWith("data:image")) continue;
      const img = parseImageDataUrl(r[k.legacy]);
      if (!img) {
        result.skipped += 1; // formato no soportado o demasiado grande: queda como está
        continue;
      }
      done += 1;
      const path = newPath(r.id, kind, img.mime, new Date(now.getTime() + done));
      try {
        await uploadBytes(storage, path, img);
        if (!(await verifyBytes(storage, path, img))) {
          result.failed += 1;
          continue;
        }
        // Solo se guarda la ruta: el texto viejo sigue intacto.
        check16(await db.from("players").update({ [k.path]: path }).eq("id", r.id).select("id").single());
        result.copied += 1;
      } catch {
        result.failed += 1;
      }
    }
  }
  const status = await mediaStatus(db, userId);
  return { ...result, remaining: status.pending };
}

/**
 * Libera el espacio de las imágenes viejas YA copiadas: vuelve a verificar cada archivo en Storage contra
 * el base64 original y, solo si coincide byte a byte, vacía el campo viejo. Lo pide el entrenador.
 */
export async function releaseLegacyImages(db, storage, userId) {
  const ids = await adminPlayerIds(db, userId);
  const result = { released: 0, kept: 0 };
  if (!ids.length) return result;
  const rows = check16(await db.from("players").select("id, photo_url, club_shield_url, photo_path, shield_path").in("id", ids)) || [];
  for (const r of rows) {
    for (const k of Object.values(KINDS)) {
      if (!r[k.path] || !String(r[k.legacy] || "").startsWith("data:image")) continue;
      const img = parseImageDataUrl(r[k.legacy]);
      if (img && (await verifyBytes(storage, r[k.path], img))) {
        check16(await db.from("players").update({ [k.legacy]: null }).eq("id", r.id).select("id").single());
        result.released += 1;
      } else {
        result.kept += 1;
      }
    }
  }
  return result;
}

/**
 * Datos del sistema anterior que todavía esperan una decisión del entrenador (no se convierten solos):
 * fundamentos viejos sin confirmar, objetivos de solo texto y sesiones grupales históricas no atribuidas.
 */
export async function legacyStatus(db, userId) {
  const access = await accessMap(db, userId);
  const ids = Object.keys(access).filter((id) => access[id] === "admin" || access[id] === "editor");
  const out = { fundamentalsToConfirm: 0, fundamentalsDefaultOnly: 0, textGoals: 0, groupLegacySessions: 0 };
  if (!ids.length) return out;
  const players = check(await db.from("players").select("id, fundamentals, status").in("id", ids)) || [];
  const assessed = new Set();
  const a = await db.from("player_assessments").select("player_id").in("player_id", ids).is("voided_at", null);
  if (!a.error) (a.data || []).forEach((r) => assessed.add(r.player_id));
  players
    .filter((p) => p.status !== "archived" && !assessed.has(p.id))
    .forEach((p) => {
      const v = legacyFundamentalsView(p.fundamentals);
      if (v.status === "values") out.fundamentalsToConfirm += 1;
      if (v.status === "default_only") out.fundamentalsDefaultOnly += 1;
    });
  const goals = check(await db.from("player_goals").select("player_id, status, goal_type, metric_key, title").in("player_id", ids).eq("status", "active")) || [];
  out.textGoals = goals.filter((g) => !g.goal_type && !g.metric_key && !g.title).length;
  const links = check(await db.from("shooting_session_players").select("session_id, player_id").in("player_id", ids)) || [];
  const counts = {};
  links.forEach((l) => (counts[l.session_id] = (counts[l.session_id] || 0) + 1));
  const sessionIds = Object.keys(counts);
  if (sessionIds.length) {
    const sessions = check(await db.from("shooting_sessions").select("id, recording_mode").in("id", sessionIds)) || [];
    out.groupLegacySessions = sessions.filter((s) => (s.recording_mode || "legacy_zones") === "legacy_zones" && counts[s.id] > 1).length;
  }
  return out;
}
