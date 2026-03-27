import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAnonServerClient } from "@/lib/server/supabase";
import { setAuthCookies } from "@/lib/server/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req) {
  try {
    const parsed = bodySchema.parse(await req.json());
    const supabase = createSupabaseAnonServerClient();
    const result = await supabase.auth.signInWithPassword({
      email: parsed.email.trim(),
      password: parsed.password
    });
    if (result.error || !result.data?.session || !result.data?.user) {
      return NextResponse.json(
        { ok: false, error: result.error?.message || "Credenciales inválidas" },
        { status: 401 }
      );
    }
    await setAuthCookies(result.data.session);
    return NextResponse.json({ ok: true, user: result.data.user });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Invalid request" }, { status: 400 });
  }
}
