import type { RetrievedChunk, ToolCallRecord } from "@/types";
import type { MetaBlock } from "./guardrails";

/**
 * Confidence = blend of model self-report and retrieval signal. Retrieval quality caps the
 * score: a model cannot be "very confident" about a product fact no document supports,
 * unless a tool supplied the data.
 */
export function computeConfidence(meta: MetaBlock | null, chunks: RetrievedChunk[], toolCalls: ToolCallRecord[]): number {
  const topScore = chunks[0]?.score ?? 0;
  const retrievalSignal = Math.min(1, topScore / 0.6); // 0.6+ hybrid score ≈ strong match with local embeddings
  const successfulTools = toolCalls.filter((t) => !t.error).length;
  const toolSignal = successfulTools > 0 ? 0.85 : 0;
  const evidence = Math.max(retrievalSignal, toolSignal);
  const self = meta?.confidence ?? 0.5;
  // Conversational turns (greetings, "what can you do") need no evidence: the model explicitly
  // reported it used no sources and no handoff is needed.
  if (meta && meta.usedSources === false && meta.handoff === false && toolCalls.length === 0) return Number(Math.min(self, 0.9).toFixed(2));
  const blended = 0.55 * self + 0.45 * evidence;
  const capped = evidence < 0.25 ? Math.min(blended, 0.45) : blended;
  return Number(Math.max(0, Math.min(1, capped)).toFixed(2));
}
