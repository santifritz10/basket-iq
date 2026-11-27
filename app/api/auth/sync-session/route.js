import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAnonServerClient } from "@/lib/server/supabase";
import { isSameOriginRequest, setAuthCookies } from "@/lib/server/auth";

const bodySchema = z.object({
  access_token: z.string().min(1).max(8192),
  // Se acepta por compatibilidad con pestañas abiertas con la versión
  // anterior, pero ya no se guarda en el servidor.
  refresh_token: z.string().max(8192).optional()
});

export async function POST(req) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  try {
    const supabase = createSupabaseAnonServerClient();
    const { data, error } = await supabase.auth.getUser(parsed.access_token);
    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 401 });
    }
    const stored = await setAuthCookies({ access_token: parsed.access_token });
    if (!stored) {
      return NextResponse.json({ ok: false, error: "expired_session" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "auth_unavailable" }, { status: 503 });
  }
}
