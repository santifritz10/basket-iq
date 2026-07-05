import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAnonServerClient } from "@/lib/server/supabase";
import { setAuthCookies } from "@/lib/server/auth";

const bodySchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1)
});

export async function POST(req) {
  try {
    const { access_token, refresh_token } = bodySchema.parse(await req.json());
    const supabase = createSupabaseAnonServerClient();
    const { data, error } = await supabase.auth.getUser(access_token);
    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    await setAuthCookies({
      access_token,
      refresh_token,
      expires_in: 3600
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Invalid request" }, { status: 400 });
  }
}
