import { NextResponse } from "next/server";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";

export async function requireApiUser() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

export function handleApiError(error) {
  const status = error?.status || 500;
  const message = error?.message || "Internal server error";
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function jsonOk(data, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}
