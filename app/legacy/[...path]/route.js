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
  const requested = parts.length ? parts.join("/") : "index.html";

  // Inject runtime env for legacy Supabase config on Vercel/Next.
  if (requested === "js/supabase-config.js") {
    const supabaseUrl = String(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    );
    const supabaseAnonKey = String(
      process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ""
    );
    const script = `(function initSupabaseConfig(){var SUPABASE_URL=${JSON.stringify(
      supabaseUrl
    )};var SUPABASE_ANON_KEY=${JSON.stringify(
      supabaseAnonKey
    )};var hasValidConfig=SUPABASE_URL.indexOf("https://")===0&&SUPABASE_ANON_KEY&&SUPABASE_ANON_KEY.indexOf("TU_")!==0;if(!window.supabase||typeof window.supabase.createClient!=="function"){window.basketLabSupabase={client:null,error:"SDK de Supabase no disponible."};return;}if(!hasValidConfig){window.basketLabSupabase={client:null,error:"Configurar SUPABASE_URL y SUPABASE_ANON_KEY en variables de entorno."};return;}window.basketLabSupabase={client:window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY),error:null};})();`;
    return new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

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
