export type KnowledgeSourceType = "markdown" | "pdf" | "url" | "text" | "faq";

export interface KnowledgeSource {
  id: string;
  productId: string;
  type: KnowledgeSourceType;
  title: string;
  /** Original URL or filename for citation. */
  reference?: string;
  chunkCount: number;
  status: "processing" | "ready" | "failed";
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  productId: string;
  ordinal: number;
  content: string;
  /** Section heading if extracted from markdown. */
  heading?: string;
  tokenEstimate: number;
}

export interface RetrievedChunk extends KnowledgeChunk {
  score: number;
  sourceTitle: string;
  sourceType: KnowledgeSourceType;
  sourceReference?: string;
}

export interface SourceCitation {
  sourceId: string;
  chunkId: string;
  title: string;
  type: KnowledgeSourceType;
  reference?: string;
  excerpt: string;
  score: number;
}
