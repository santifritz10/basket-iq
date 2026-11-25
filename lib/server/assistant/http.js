import "server-only";
import { NextResponse } from "next/server";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { AssistantError } from "@/lib/server/assistant/gemini";

export function errorResponse(status, error, code, extra = {}, headers) {
  return NextResponse.json({ ok: false, error, code, ...extra }, { status, headers });
}

export function unauthorized() {
  return errorResponse(401, "Tu sesión expiró. Volvé a iniciar sesión.", "unauthorized");
}

/** Usuario autenticado según las cookies httpOnly, validado contra Supabase. */
export async function requireUser() {
  const user = await getAuthenticatedUserFromCookies();
  return user?.id ? user : null;
}

export async function readJson(req, maxBytes = 50_000) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    throw new AssistantError("too_large", "El mensaje es demasiado grande.", 413);
  }
  try {
    return await req.json();
  } catch {
    throw new AssistantError("invalid_json", "El pedido no es válido.", 400);
  }
}

export function handleRouteError(error, extra = {}) {
  if (error instanceof AssistantError) {
    return errorResponse(error.httpStatus, error.message, error.code, extra);
  }
  console.error("[assistant] unexpected error", { name: error?.name, message: String(error?.message || "").slice(0, 200) });
  return errorResponse(500, "Ocurrió un error inesperado. Probá de nuevo.", "internal_error", extra);
}
