import { NextResponse } from "next/server";
import { getAccessTokenFromCookies, getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { env } from "@/lib/server/env";
import { playerDomainFlags } from "@/lib/server/player-domain-flags";

export async function GET() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!playerDomainFlags.realtime) {
    return NextResponse.json({ ok: true, enabled: false });
  }

  const accessToken = await getAccessTokenFromCookies();
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "No access token" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    enabled: true,
    accessToken,
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY
  });
}
