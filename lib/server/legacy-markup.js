import "server-only";

import { promises as fs } from "fs";
import path from "path";

function rewriteAssetPaths(html) {
  return html.replace(
    /(src|href)=["'](images|js|css)\/([^"']+)["']/gi,
    (_m, attr, folder, file) => `${attr}="/assets/${folder}/${file}"`
  );
}

export async function getLegacyBodyMarkup() {
  const sourcePath = path.resolve(process.cwd(), "index.html");
  const fullHtml = await fs.readFile(sourcePath, "utf8");
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return "";

  const withoutScripts = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, "");
  return rewriteAssetPaths(withoutScripts).trim();
}
