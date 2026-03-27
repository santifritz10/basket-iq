import { NextResponse } from "next/server";
import { fetchNews } from "@/services/news-service";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "basket";
    const items = await fetchNews(q);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "News fetch failed" }, { status: 500 });
  }
}
