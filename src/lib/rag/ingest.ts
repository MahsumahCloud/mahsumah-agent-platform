import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/db/client";
import type { KnowledgeSource, KnowledgeSourceType } from "@/types";
import { chunkText } from "./chunker";
import { getEmbeddingProvider } from "./embeddings";
import { getVectorStore } from "./vector-store";

export interface IngestInput {
  productId: string;
  type: KnowledgeSourceType;
  title: string;
  text: string;
  reference?: string;
  /** Re-use an existing source id (re-index). */
  sourceId?: string;
}

/** Full pipeline: chunk → embed → store, all scoped to one product. */
export async function ingestDocument(input: IngestInput): Promise<KnowledgeSource> {
  const db = getDb();
  const now = new Date().toISOString();
  const sourceId = input.sourceId ?? nanoid();

  if (input.sourceId) {
    await getVectorStore().deleteBySource(sourceId);
    db.update(schema.knowledgeSources).set({ status: "processing", error: null, updatedAt: now, title: input.title, reference: input.reference ?? null }).where(eq(schema.knowledgeSources.id, sourceId)).run();
  } else {
    db.insert(schema.knowledgeSources).values({ id: sourceId, productId: input.productId, type: input.type, title: input.title, reference: input.reference ?? null, chunkCount: 0, status: "processing", createdAt: now, updatedAt: now }).run();
  }

  try {
    const chunks = chunkText(input.text);
    if (chunks.length === 0) throw new Error("Document produced no chunks (empty content)");
    const embedder = getEmbeddingProvider();
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += 64) {
      vectors.push(...(await embedder.embed(chunks.slice(i, i + 64).map((c) => c.content))));
    }
    await getVectorStore().upsert(
      chunks.map((c, i) => ({
        id: `${sourceId}_${c.ordinal}`,
        sourceId,
        productId: input.productId,
        ordinal: c.ordinal,
        heading: c.heading,
        content: c.content,
        tokenEstimate: c.tokenEstimate,
        embedding: vectors[i] ?? [],
        embeddingModel: embedder.id,
      })),
    );
    db.update(schema.knowledgeSources).set({ status: "ready", chunkCount: chunks.length, updatedAt: new Date().toISOString() }).where(eq(schema.knowledgeSources.id, sourceId)).run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.update(schema.knowledgeSources).set({ status: "failed", error: message, updatedAt: new Date().toISOString() }).where(eq(schema.knowledgeSources.id, sourceId)).run();
    throw err;
  }
  return getSource(sourceId)!;
}

export function listSources(productId: string): KnowledgeSource[] {
  return getDb().select().from(schema.knowledgeSources).where(eq(schema.knowledgeSources.productId, productId)).all().map(rowToSource);
}

export function getSource(id: string): KnowledgeSource | undefined {
  const row = getDb().select().from(schema.knowledgeSources).where(eq(schema.knowledgeSources.id, id)).get();
  return row ? rowToSource(row) : undefined;
}

export async function deleteSource(id: string): Promise<void> {
  await getVectorStore().deleteBySource(id);
  getDb().delete(schema.knowledgeSources).where(eq(schema.knowledgeSources.id, id)).run();
}

function rowToSource(r: typeof schema.knowledgeSources.$inferSelect): KnowledgeSource {
  return { id: r.id, productId: r.productId, type: r.type as KnowledgeSourceType, title: r.title, reference: r.reference ?? undefined, chunkCount: r.chunkCount, status: r.status as KnowledgeSource["status"], error: r.error, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
