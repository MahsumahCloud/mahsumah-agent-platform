import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalHashEmbeddings, normalizeText } from "../src/lib/rag/embeddings";

const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);

test("local embeddings are unit vectors and similar texts score higher", async () => {
  const e = new LocalHashEmbeddings();
  const [a, b, c] = await e.embed(["كيف أنشر تطبيق Next.js", "خطوات نشر تطبيق Next.js على المنصة", "سياسة الاسترجاع والفواتير"]);
  assert.ok(Math.abs(dot(a!, a!) - 1) < 1e-6);
  assert.ok(dot(a!, b!) > dot(a!, c!));
});

test("normalizeText unifies Arabic variants", () => {
  assert.equal(normalizeText("أحمد إبراهيم آدم"), "احمد ابراهيم ادم");
  assert.equal(normalizeText("مكتبةٌ"), "مكتبه");
});
