import "./env";
import fs from "node:fs";
import path from "node:path";
import { seedProducts } from "@/data/products";
import { getProduct, upsertProduct } from "@/lib/products/repository";
import { ingestDocument, listSources } from "@/lib/rag/ingest";
import { createApiKey, listApiKeys } from "@/lib/tenancy/api-keys";
import { getSqlite } from "./client";

async function main() {
  getSqlite();
  const lines: string[] = [];
  for (const profile of seedProducts) {
    // Existing dashboard edits win; the seed only fills fields that were added since (e.g. access policy).
    const current = getProduct(profile.id);
    const product = upsertProduct(current ? { ...profile, ...current, access: current.access ?? profile.access } : profile);
    lines.push(`✔ product ${product.id}`);

    const existing = new Set(listSources(product.id).map((s) => s.reference));
    const dir = path.join(process.cwd(), "src", "data", "knowledge", product.id);
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
        if (existing.has(file)) continue;
        const text = fs.readFileSync(path.join(dir, file), "utf8");
        const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
        const src = await ingestDocument({ productId: product.id, type: "markdown", title, text, reference: file });
        lines.push(`  ↳ knowledge "${src.title}" (${src.chunkCount} chunks)`);
      }
    }
    // FAQs are indexed as their own knowledge source so they are citable.
    if (product.faqs.length && !existing.has("faqs")) {
      const faqText = product.faqs.map((f) => `## ${f.question}\n\n${f.answer}`).join("\n\n");
      const src = await ingestDocument({ productId: product.id, type: "faq", title: "الأسئلة الشائعة", text: `# الأسئلة الشائعة\n\n${faqText}`, reference: "faqs" });
      lines.push(`  ↳ faqs (${src.chunkCount} chunks)`);
    }

    if (product.kind !== "organization" && listApiKeys(product.id).length === 0) {
      const { raw } = createApiKey(product.id, "default");
      lines.push(`  ↳ API key (save it, shown once): ${raw}`);
    }
  }
  console.log(lines.join("\n"));
}

main().catch((err) => { console.error(err); process.exit(1); });
