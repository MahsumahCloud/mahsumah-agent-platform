import { test } from "node:test";
import assert from "node:assert/strict";
import { detectLocale, extractMeta, mentionsOtherProduct } from "../src/lib/agent/guardrails";
import { computeConfidence } from "../src/lib/agent/confidence";

test("extractMeta strips the meta block and parses it", () => {
  const { answer, meta } = extractMeta('الإجابة هنا.\n\n<meta>{"confidence":0.8,"handoff":false,"usedSources":true}</meta>');
  assert.equal(answer, "الإجابة هنا.");
  assert.deepEqual(meta, { confidence: 0.8, handoff: false, usedSources: true });
});

test("extractMeta tolerates missing or broken meta", () => {
  assert.equal(extractMeta("plain").meta, null);
  assert.equal(extractMeta("x <meta>{bad</meta>").meta, null);
});

test("locale detection", () => {
  assert.equal(detectLocale("كيف أبدأ؟", "en"), "ar");
  assert.equal(detectLocale("How do I start?", "ar"), "en");
  assert.equal(detectLocale("123", "ar"), "ar");
});

test("cross-product mention flagged", () => {
  const dir = [{ id: "mahsumah-cloud", name: "محسومة كلاود", nameEn: "Mahsumah Cloud" }, { id: "mahsumah-dcc", name: "محسومة DCC", nameEn: "Mahsumah DCC" }];
  assert.equal(mentionsOtherProduct("mahsumah-cloud", "هل محسومة DCC تدعم Power BI؟", dir)?.id, "mahsumah-dcc");
  assert.equal(mentionsOtherProduct("mahsumah-cloud", "هل كلاود تدعم Docker؟", dir), undefined);
});

test("confidence is capped without evidence and lifted by tools", () => {
  const noEvidence = computeConfidence({ confidence: 0.95, handoff: false, usedSources: true }, [], []);
  assert.ok(noEvidence <= 0.45);
  const withTool = computeConfidence({ confidence: 0.8, handoff: false, usedSources: false }, [], [{ toolId: "suggest_plan", input: {}, output: {}, durationMs: 1 }]);
  assert.ok(withTool > 0.7);
});
