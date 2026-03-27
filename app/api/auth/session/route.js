import { NextResponse } from "next/server";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";

export async function GET() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ ok: true, user: null });
  }
  const service = createSupabaseServiceServerClient();
  const profileRes = await service
    .from("profiles")
    .select("username, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRes.data || null;
  const appUser = {
    id: user.id,
    email: user.email || "",
    username:
      profile?.username ||
      user.user_metadata?.username ||
      (user.email ? user.email.split("@")[0] : "usuario"),
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.username ||
      (user.email ? user.email.split("@")[0] : "usuario")
  };
  return NextResponse.json({ ok: true, user: appUser });
}
