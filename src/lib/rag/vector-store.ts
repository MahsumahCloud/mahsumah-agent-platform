import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { KnowledgeSourceType, RetrievedChunk } from "@/types";
import { normalizeText } from "./embeddings";

export interface VectorRecord {
  id: string;
  sourceId: string;
  productId: string;
  ordinal: number;
  heading?: string;
  content: string;
  tokenEstimate: number;
  embedding: number[];
  embeddingModel: string;
}

export interface VectorQuery {
  /** Knowledge scopes to search: the product itself plus any inherited scopes (organization). */
  productIds: string[];
  vector: number[];
  /** Raw query text, used for lexical re-ranking (hybrid search). */
  text: string;
  topK: number;
  minScore?: number;
}

/**
 * Storage abstraction. The SQLite implementation does brute-force cosine similarity in
 * process, which is fine up to ~50k chunks per product. Swap for pgvector/Chroma/Pinecone by
 * implementing this interface; the retriever and ingest pipeline never touch SQL directly.
 */
export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  deleteBySource(sourceId: string): Promise<void>;
  query(q: VectorQuery): Promise<RetrievedChunk[]>;
  countByProduct(productId: string): Promise<number>;
}

export class SqliteVectorStore implements VectorStore {
  async upsert(records: VectorRecord[]): Promise<void> {
    const db = getDb();
    const rows = records.map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      productId: r.productId,
      ordinal: r.ordinal,
      heading: r.heading ?? null,
      content: r.content,
      tokenEstimate: r.tokenEstimate,
      embedding: Buffer.from(new Float32Array(r.embedding).buffer),
      embeddingModel: r.embeddingModel,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      db.insert(schema.knowledgeChunks).values(rows.slice(i, i + 200)).onConflictDoNothing().run();
    }
  }

  async deleteBySource(sourceId: string): Promise<void> {
    getDb().delete(schema.knowledgeChunks).where(eq(schema.knowledgeChunks.sourceId, sourceId)).run();
  }

  async countByProduct(productId: string): Promise<number> {
    return getDb().select({ id: schema.knowledgeChunks.id }).from(schema.knowledgeChunks).where(eq(schema.knowledgeChunks.productId, productId)).all().length;
  }

  async query(q: VectorQuery): Promise<RetrievedChunk[]> {
    const db = getDb();
    // Product isolation is enforced here, at the storage boundary, not only in the prompt.
    const rows = db
      .select({
        id: schema.knowledgeChunks.id,
        sourceId: schema.knowledgeChunks.sourceId,
        productId: schema.knowledgeChunks.productId,
        ordinal: schema.knowledgeChunks.ordinal,
        heading: schema.knowledgeChunks.heading,
        content: schema.knowledgeChunks.content,
        tokenEstimate: schema.knowledgeChunks.tokenEstimate,
        embedding: schema.knowledgeChunks.embedding,
      })
      .from(schema.knowledgeChunks)
      .where(inArray(schema.knowledgeChunks.productId, q.productIds))
      .all();

    const queryTerms = new Set(normalizeText(q.text).split(" ").filter((t) => t.length > 1));
    const scored = rows.map((r) => {
      const emb = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4);
      const cosine = dot(q.vector, emb);
      const lexical = lexicalOverlap(queryTerms, r.content);
      // Hybrid score: semantic similarity + lexical overlap. Weights tuned for the local embedder;
      // with real embeddings the semantic part dominates naturally.
      const score = 0.65 * cosine + 0.35 * lexical;
      return { r, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, q.topK).filter((s) => s.score >= (q.minScore ?? 0));
    if (top.length === 0) return [];

    const sourceIds = [...new Set(top.map((s) => s.r.sourceId))];
    const sources = db
      .select({ id: schema.knowledgeSources.id, title: schema.knowledgeSources.title, type: schema.knowledgeSources.type, reference: schema.knowledgeSources.reference })
      .from(schema.knowledgeSources)
      .where(and(inArray(schema.knowledgeSources.productId, q.productIds), inArray(schema.knowledgeSources.id, sourceIds)))
      .all();
    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    return top.map(({ r, score }) => {
      const src = sourceMap.get(r.sourceId);
      return {
        id: r.id,
        sourceId: r.sourceId,
        productId: r.productId,
        ordinal: r.ordinal,
        heading: r.heading ?? undefined,
        content: r.content,
        tokenEstimate: r.tokenEstimate,
        score: Number(score.toFixed(4)),
        sourceTitle: src?.title ?? "Unknown source",
        sourceType: (src?.type ?? "text") as KnowledgeSourceType,
        sourceReference: src?.reference ?? undefined,
      };
    });
  }
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

function lexicalOverlap(queryTerms: Set<string>, content: string): number {
  if (queryTerms.size === 0) return 0;
  const words = new Set(normalizeText(content).split(" "));
  let hits = 0;
  for (const t of queryTerms) if (words.has(t)) hits++;
  return hits / queryTerms.size;
}

let store: VectorStore | undefined;
export function getVectorStore(): VectorStore {
  if (!store) store = new SqliteVectorStore();
  return store;
}
