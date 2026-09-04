import type { EmbeddingProvider } from "@/types";

/**
 * Local, dependency-free embedding: hashed character n-grams (3-5) + word unigrams,
 * L2-normalised. Works offline and handles Arabic morphology reasonably because it is
 * sub-word based. Swap for OpenAI/Voyage in production via EMBEDDING_PROVIDER.
 */
export class LocalHashEmbeddings implements EmbeddingProvider {
  readonly id = "local-hash-v1";
  readonly dimensions = 768;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedOne(t));
  }

  private embedOne(text: string): number[] {
    const vec = new Float64Array(this.dimensions);
    const norm = normalizeText(text);
    const words = norm.split(/\s+/).filter(Boolean);
    for (const w of words) {
      bump(vec, `w:${w}`, 1.5, this.dimensions);
      const padded = ` ${w} `;
      for (const n of [3, 4, 5]) {
        for (let i = 0; i + n <= padded.length; i++) bump(vec, `g${n}:${padded.slice(i, i + n)}`, 1, this.dimensions);
      }
    }
    let sum = 0;
    for (let i = 0; i < vec.length; i++) sum += (vec[i] ?? 0) ** 2;
    const inv = sum > 0 ? 1 / Math.sqrt(sum) : 0;
    return Array.from(vec, (v) => v * inv);
  }
}

function bump(vec: Float64Array, key: string, weight: number, dims: number) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % dims;
  const sign = (h >>> 31) === 0 ? 1 : -1;
  vec[idx] = (vec[idx] ?? 0) + sign * weight;
}

/** Arabic-aware normalisation: strip tashkeel, unify alef/yaa/taa-marbuta, lowercase latin. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

class OpenAiEmbeddings implements EmbeddingProvider {
  readonly id: string;
  readonly dimensions = 1536;
  constructor(private apiKey: string, private model = "text-embedding-3-small") { this.id = `openai:${model}`; }
  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data.map((d) => d.embedding);
  }
}

class VoyageEmbeddings implements EmbeddingProvider {
  readonly id: string;
  readonly dimensions = 1024;
  constructor(private apiKey: string, private model = "voyage-multilingual-2") { this.id = `voyage:${model}`; }
  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) throw new Error(`Voyage embeddings error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data.map((d) => d.embedding);
  }
}

let cached: EmbeddingProvider | undefined;
export function getEmbeddingProvider(): EmbeddingProvider {
  if (cached) return cached;
  const kind = (process.env.EMBEDDING_PROVIDER ?? "local").toLowerCase();
  if (kind === "openai" && process.env.OPENAI_API_KEY) cached = new OpenAiEmbeddings(process.env.OPENAI_API_KEY);
  else if (kind === "voyage" && process.env.VOYAGE_API_KEY) cached = new VoyageEmbeddings(process.env.VOYAGE_API_KEY);
  else cached = new LocalHashEmbeddings();
  return cached;
}
