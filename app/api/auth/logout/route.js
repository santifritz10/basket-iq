import { NextResponse } from "next/server";
import { clearAuthCookies, isSameOriginRequest } from "@/lib/server/auth";

export async function POST(req) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  await clearAuthCookies();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
