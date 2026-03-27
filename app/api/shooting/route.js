import { NextResponse } from "next/server";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType, saveUserDataByType } from "@/services/server/user-data-service";

const TYPE = "shooting_heatmap";

export async function GET() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const payload = (await getUserDataByType(user.id, TYPE)) || {};
    return NextResponse.json({ ok: true, payload });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const payload = body?.payload ?? {};
    await saveUserDataByType(user.id, TYPE, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
