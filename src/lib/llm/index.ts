import fs from "node:fs";
import path from "node:path";
import type { LlmProvider } from "@/types";
import { MockProvider } from "./mock";

/**
 * Resolves a secret with a sanity check. Shell variables take precedence over `.env` in Next,
 * so a stale/broken `export ANTHROPIC_API_KEY=…` in a shell profile would silently win; when the
 * shell value is malformed we fall back to the value in `.env` and say so.
 */
function resolveSecret(name: string, valid: (v: string) => boolean): string | undefined {
  const fromEnv = process.env[name];
  if (fromEnv && valid(fromEnv)) return fromEnv;
  const fromFile = readEnvFile(name);
  if (fromFile && valid(fromFile)) {
    if (fromEnv) console.warn(`[llm] ${name} from the shell environment is malformed; using the value from .env instead.`);
    return fromFile;
  }
  return undefined;
}

function readEnvFile(name: string): string | undefined {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)\\s*$`, "m"));
    if (m?.[1]) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return undefined;
}

const isAsciiKey = (v: string) => /^[\x21-\x7e]+$/.test(v);

let cached: Promise<LlmProvider> | undefined;

/**
 * Provider factory. Selection is environment-driven so the same build can run against
 * Anthropic in production and the mock provider in CI. Provider modules are loaded lazily
 * so the SDK of an unused provider is never imported.
 */
export function getLlmProvider(): Promise<LlmProvider> {
  if (!cached) cached = create();
  return cached;
}

async function create(): Promise<LlmProvider> {
  const kind = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();
  if (kind === "anthropic") {
    const apiKey = resolveSecret("ANTHROPIC_API_KEY", (v) => v.startsWith("sk-ant-") && isAsciiKey(v));
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing or malformed (must start with sk-ant- and contain only ASCII). Check .env and any `export ANTHROPIC_API_KEY` in your shell profile.");
    const { AnthropicProvider } = await import("./anthropic");
    return new AnthropicProvider({ apiKey, model: process.env.ANTHROPIC_MODEL });
  }
  if (kind === "openai") {
    const apiKey = resolveSecret("OPENAI_API_KEY", isAsciiKey);
    if (!apiKey) throw new Error("OPENAI_API_KEY is missing or malformed when LLM_PROVIDER=openai");
    const { OpenAiProvider } = await import("./openai");
    return new OpenAiProvider({ apiKey, model: process.env.OPENAI_MODEL, baseUrl: process.env.OPENAI_BASE_URL });
  }
  return new MockProvider();
}

export { MockProvider };
