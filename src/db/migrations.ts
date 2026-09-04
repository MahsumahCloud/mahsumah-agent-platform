import type Database from "better-sqlite3";

/**
 * Plain SQL migrations, applied in order and tracked in `_migrations`.
 * Kept as SQL strings (not drizzle-kit generated) so the app is self-bootstrapping
 * on first start. Add new entries at the end; never edit an applied one.
 */
const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "0001_init",
    sql: `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  profile TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash);
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  reference TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_sources_product_idx ON knowledge_sources(product_id);
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  token_estimate INTEGER NOT NULL,
  embedding BLOB NOT NULL,
  embedding_model TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_product_idx ON knowledge_chunks(product_id);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ar',
  metadata TEXT,
  created_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS conversations_product_idx ON conversations(product_id, last_message_at);
CREATE INDEX IF NOT EXISTS conversations_tenant_idx ON conversations(tenant_id, user_id);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL,
  sources TEXT,
  tool_calls TEXT,
  handoff_required INTEGER NOT NULL DEFAULT 0,
  page_context TEXT,
  usage TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_confidence_idx ON messages(product_id, confidence);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);
`,
  },
];

export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const applied = new Set(
    (sqlite.prepare(`SELECT id FROM _migrations`).all() as { id: string }[]).map((r) => r.id),
  );
  const insert = sqlite.prepare(`INSERT INTO _migrations (id, applied_at) VALUES (?, ?)`);
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    sqlite.transaction(() => {
      sqlite.exec(m.sql);
      insert.run(m.id, new Date().toISOString());
    })();
  }
}
