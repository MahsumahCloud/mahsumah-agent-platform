import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText, estimateTokens } from "../src/lib/rag/chunker";

test("chunker keeps section headings and splits long sections", () => {
  const md = `# دليل\n\n## القسم الأول\n\n${"فقرة طويلة جداً. ".repeat(120)}\n\n## القسم الثاني\n\nنص قصير.`;
  const chunks = chunkText(md, { maxChars: 600 });
  assert.ok(chunks.length >= 3);
  assert.ok(chunks[0]!.content.startsWith("القسم الأول"));
  assert.equal(chunks.at(-1)!.heading, "القسم الثاني");
  assert.ok(chunks.every((c) => c.tokenEstimate > 0));
});

test("empty input yields no chunks", () => {
  assert.deepEqual(chunkText("   \n  "), []);
});

test("token estimate weights Arabic differently", () => {
  assert.ok(estimateTokens("مرحبا بكم في المنصة") > estimateTokens("hello"));
});
