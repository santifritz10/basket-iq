import { NextResponse } from "next/server";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";

export async function withLabUser(handler) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) return NextResponse.json({ ok: false, error: "Iniciá sesión para continuar.", code: "unauthorized" }, { status: 401 });
  try {
    const data = await handler(user);
    return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500 && !/_not_installed$/.test(String(error?.code || ""))) console.error("[ShootingLab]", error);
    return NextResponse.json(
      {
        ok: false,
        error: status >= 500 && !/_not_installed$/.test(String(error?.code || "")) ? "Error del servidor. Probá de nuevo." : error.message,
        code: error?.code || "server_error",
        details: error?.details
      },
      { status }
    );
  }
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
