import fs from "node:fs";
import path from "node:path";

/**
 * Cache-busts local brand assets: `/brand/logo.svg` → `/brand/logo.svg?v=<mtime>` so a
 * replaced file shows immediately without a hard refresh. External URLs pass through.
 */
export function assetUrl(url: string | undefined): string | undefined {
  if (!url || !url.startsWith("/")) return url;
  try {
    const stat = fs.statSync(path.join(process.cwd(), "public", url.split("?")[0] ?? ""));
    return `${url}?v=${Math.floor(stat.mtimeMs)}`;
  } catch {
    return url;
  }
}
