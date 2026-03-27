import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8"
};

function resolveLegacyPath(parts) {
  const repoRoot = process.cwd();
  const requested = parts.length ? parts.join("/") : "index.html";
  const full = path.resolve(repoRoot, requested);
  if (!full.startsWith(repoRoot)) return null;
  return full;
}

export async function GET(_req, context) {
  const parts = context.params.path || [];
  const filePath = resolveLegacyPath(parts);
  if (!filePath) return new NextResponse("Forbidden", { status: 403 });
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
