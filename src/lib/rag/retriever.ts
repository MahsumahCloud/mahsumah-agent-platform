import type { RetrievedChunk, SourceCitation } from "@/types";
import { getEmbeddingProvider } from "./embeddings";
import { getVectorStore } from "./vector-store";
import { ORGANIZATION_ID } from "@/lib/products/repository";

export interface RetrieveOptions { topK?: number; minScore?: number; /** false = product knowledge only */ includeOrganization?: boolean }

/** Searches the product's knowledge plus the shared organization knowledge (unless disabled). */
export async function retrieve(productId: string, query: string, opts: RetrieveOptions = {}): Promise<RetrievedChunk[]> {
  const embedder = getEmbeddingProvider();
  const [vector] = await embedder.embed([query]);
  if (!vector) return [];
  const productIds = opts.includeOrganization === false || productId === ORGANIZATION_ID ? [productId] : [productId, ORGANIZATION_ID];
  return getVectorStore().query({ productIds, vector, text: query, topK: opts.topK ?? 6, minScore: opts.minScore ?? 0.08 });
}

export function toCitations(chunks: RetrievedChunk[]): SourceCitation[] {
  const seen = new Set<string>();
  const out: SourceCitation[] = [];
  for (const c of chunks) {
    if (seen.has(c.sourceId)) continue;
    seen.add(c.sourceId);
    out.push({
      sourceId: c.sourceId,
      chunkId: c.id,
      title: c.heading ? `${c.sourceTitle} › ${c.heading}` : c.sourceTitle,
      type: c.sourceType,
      reference: c.sourceReference,
      excerpt: c.content.length > 220 ? `${c.content.slice(0, 220)}…` : c.content,
      score: c.score,
    });
  }
  return out;
}
