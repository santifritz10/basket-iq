import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType, saveUserDataByType } from "@/services/server/user-data-service";

const DATA_TYPES = new Set([
  "plays",
  "trainings",
  "annual_plans",
  "shooting_heatmap",
  "players_tracking"
]);

const saveSchema = z.object({
  payload: z.any()
});

function validateType(type) {
  return DATA_TYPES.has(type);
}

export async function GET(_req, { params }) {
  const dataType = String(params.type || "");
  if (!validateType(dataType)) {
    return NextResponse.json({ ok: false, error: "Invalid data type" }, { status: 400 });
  }
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const payload = await getUserDataByType(user.id, dataType);
    return NextResponse.json({ ok: true, payload });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const dataType = String(params.type || "");
  if (!validateType(dataType)) {
    return NextResponse.json({ ok: false, error: "Invalid data type" }, { status: 400 });
  }
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const parsed = saveSchema.parse(await req.json());
    await saveUserDataByType(user.id, dataType, parsed.payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Invalid body" }, { status: 400 });
  }
}
