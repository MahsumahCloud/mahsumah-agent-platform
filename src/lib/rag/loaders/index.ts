import type { KnowledgeSourceType } from "@/types";

export interface LoadedDocument { text: string; title: string; reference?: string }

export async function loadPdf(buffer: Buffer, filename: string): Promise<LoadedDocument> {
  // pdf-parse v2 exposes a class-based API; import lazily so the dashboard bundle stays light.
  const mod = (await import("pdf-parse")) as unknown as { PDFParse?: new (o: { data: Buffer }) => { getText(): Promise<{ text: string }>; destroy(): Promise<void> } };
  if (!mod.PDFParse) throw new Error("pdf-parse PDFParse class not available");
  const parser = new mod.PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, title: filename.replace(/\.pdf$/i, ""), reference: filename };
  } finally {
    await parser.destroy();
  }
}

export function loadMarkdown(text: string, filename: string): LoadedDocument {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? filename.replace(/\.(md|markdown|txt)$/i, "");
  return { text, title, reference: filename };
}

export async function loadUrl(url: string): Promise<LoadedDocument> {
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http(s) URLs are supported");
  await assertPublicHost(parsed.hostname);
  // No redirects: a redirect could point at an internal address after the check above.
  const res = await fetch(url, { headers: { "user-agent": "MahsumahAgentBot/1.0" }, signal: AbortSignal.timeout(15000), redirect: "manual" });
  if (res.status >= 300 && res.status < 400) throw new Error(`URL redirects (${res.status}); add the final URL directly`);
  if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
  const html = await res.text();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? parsed.hostname;
  return { text: htmlToText(html), title, reference: url };
}

/** Rejects loopback, private, link-local and metadata ranges for both IPv4 and IPv6 (after DNS resolution). */
export async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private network URLs are not allowed");
  const { lookup } = await import("node:dns/promises");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Error("Host could not be resolved");
  for (const { address } of addresses) if (isPrivateAddress(address)) throw new Error("Private network URLs are not allowed");
}

function isIP(s: string): boolean { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) || s.includes(":"); }

export function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase();
    if (v6 === "::1" || v6 === "::" ) return true;
    if (v6.startsWith("fe80:") || v6.startsWith("fc") || v6.startsWith("fd")) return true;
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped?.[1] ? isPrivateAddress(mapped[1]) : false;
  }
  const parts = ip.split(".").map(Number);
  const [a, b] = parts;
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255) || a === undefined || b === undefined) return true;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, t) => `\n${"#".repeat(Number(l))} ${stripTags(t)}\n`)
    .replace(/<(p|div|li|br|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

function stripTags(s: string) { return s.replace(/<[^>]+>/g, "").trim(); }

export function typeFromFilename(name: string): KnowledgeSourceType {
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.(md|markdown)$/i.test(name)) return "markdown";
  return "text";
}
