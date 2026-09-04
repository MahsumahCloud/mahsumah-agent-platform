import "@/db/env";
import { getLlmProvider } from "@/lib/llm";

/** Sends one tiny request to the configured LLM provider and prints the outcome. */
async function main() {
  const p = await getLlmProvider();
  console.log("provider:", p.id, "model:", p.model);
  try {
    const r = await p.complete({ system: "أجب بكلمة واحدة.", messages: [{ role: "user", content: [{ type: "text", text: "قل مرحبا" }] }], tools: [], maxTokens: 50 });
    console.log("OK", r.model, JSON.stringify(r.content).slice(0, 200), r.usage);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    console.log("ERR", err.status, (err.message ?? String(e)).slice(0, 700));
  }
  process.exit(0);
}
main();
