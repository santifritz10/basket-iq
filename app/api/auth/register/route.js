import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAnonServerClient } from "@/lib/server/supabase";
import { setAuthCookies } from "@/lib/server/auth";

const bodySchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6)
});

export async function POST(req) {
  try {
    const parsed = bodySchema.parse(await req.json());
    const supabase = createSupabaseAnonServerClient();
    const signUp = await supabase.auth.signUp({
      email: parsed.email.trim(),
      password: parsed.password,
      options: {
        data: {
          username: parsed.username.trim().toLowerCase(),
          full_name: String(parsed.name || "").trim()
        }
      }
    });
    if (signUp.error) {
      return NextResponse.json({ ok: false, error: signUp.error.message }, { status: 400 });
    }
    const user = signUp.data?.user || null;
    const session = signUp.data?.session || null;
    if (session?.access_token && session?.refresh_token) {
      await setAuthCookies(session);
    }
    return NextResponse.json({
      ok: true,
      user,
      pendingEmailConfirmation: !session
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Invalid request" }, { status: 400 });
  }
}
