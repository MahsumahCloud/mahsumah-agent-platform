export interface ChunkInput { content: string; heading?: string; ordinal: number; tokenEstimate: number }

export interface ChunkOptions {
  /** Approx. target size in characters (Arabic ≈ 2.5 chars/token, English ≈ 4). */
  maxChars?: number;
  overlapChars?: number;
}

export function estimateTokens(text: string): number {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  const other = text.length - arabic;
  return Math.ceil(arabic / 2.5 + other / 4);
}

/**
 * Markdown-aware chunker: splits on headings first so each chunk carries its section
 * heading (used as citation context), then splits long sections by paragraph with overlap.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): ChunkInput[] {
  const maxChars = opts.maxChars ?? 1200;
  const overlap = opts.overlapChars ?? 150;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections: { heading?: string; body: string }[] = [];
  let current: { heading?: string; body: string } = { body: "" };
  for (const line of normalized.split("\n")) {
    const h = line.match(/^#{1,4}\s+(.+)$/);
    if (h) {
      if (current.body.trim()) sections.push(current);
      current = { heading: h[1]?.trim(), body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.body.trim()) sections.push(current);

  const chunks: ChunkInput[] = [];
  for (const section of sections) {
    const paragraphs = section.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    let buffer = "";
    const flush = () => {
      const content = (section.heading ? `${section.heading}\n${buffer}` : buffer).trim();
      if (!content) return;
      chunks.push({ content, heading: section.heading, ordinal: chunks.length, tokenEstimate: estimateTokens(content) });
      buffer = buffer.length > overlap ? buffer.slice(-overlap) : "";
    };
    for (const p of paragraphs) {
      if (p.length > maxChars) {
        // Very long paragraph: hard split on sentence boundaries.
        const sentences = p.split(/(?<=[.!?؟।])\s+/);
        for (const s of sentences) {
          if ((buffer + " " + s).length > maxChars && buffer) flush();
          buffer = buffer ? `${buffer} ${s}` : s;
        }
        continue;
      }
      if ((buffer + "\n\n" + p).length > maxChars && buffer) flush();
      buffer = buffer ? `${buffer}\n\n${p}` : p;
    }
    if (buffer.trim()) {
      const content = (section.heading ? `${section.heading}\n${buffer}` : buffer).trim();
      chunks.push({ content, heading: section.heading, ordinal: chunks.length, tokenEstimate: estimateTokens(content) });
    }
  }
  return chunks;
}
