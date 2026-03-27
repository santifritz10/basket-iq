import "server-only";
import { env } from "@/lib/server/env";

export async function fetchNews(query = "basketball") {
  if (!env.NEWS_API_BASE_URL || !env.NEWS_API_KEY) {
    return [];
  }
  const url = new URL("/top-headlines", env.NEWS_API_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("language", "es");
  url.searchParams.set("pageSize", "12");
  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": env.NEWS_API_KEY },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error("News provider request failed with status " + res.status);
  }
  const data = await res.json();
  const list = Array.isArray(data.articles) ? data.articles : [];
  return list.map((a) => ({
    title: a.title || "",
    description: a.description || "",
    source: a.source?.name || "",
    publishedAt: a.publishedAt || "",
    url: a.url || ""
  }));
}
