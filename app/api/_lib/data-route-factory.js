import { NextResponse } from "next/server";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType, saveUserDataByType } from "@/services/server/user-data-service";

export function createDataTypeRoute(dataType) {
  async function GET() {
    const user = await getAuthenticatedUserFromCookies();
    if (!user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    try {
      const payload = await getUserDataByType(user.id, dataType);
      return NextResponse.json({ ok: true, items: payload ?? [] });
    } catch (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  async function POST(req) {
    const user = await getAuthenticatedUserFromCookies();
    if (!user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    try {
      const body = await req.json();
      const items = body?.items ?? body?.payload ?? [];
      await saveUserDataByType(user.id, dataType, items);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
  }

  return { GET, POST };
}
