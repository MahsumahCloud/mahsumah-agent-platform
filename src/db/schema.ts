import { sqliteTable, text, integer, real, blob, index } from "drizzle-orm/sqlite-core";

/**
 * Schema is written against Drizzle's SQLite dialect. Every column type used here has a
 * 1:1 equivalent in drizzle-orm/pg-core (text, integer, real, bytea/vector), so upgrading to
 * PostgreSQL is a matter of swapping the dialect import and the driver in client.ts.
 */

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  /** Full ProductProfile JSON (persona, plans, faqs, policies, prompt, theme...). */
  profile: text("profile", { mode: "json" }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    /** sha256 of the raw key. Raw key is shown once on creation. */
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull(),
    lastUsedAt: text("last_used_at"),
  },
  (t) => [index("api_keys_hash_idx").on(t.keyHash)],
);

export const knowledgeSources = sqliteTable(
  "knowledge_sources",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    reference: text("reference"),
    chunkCount: integer("chunk_count").notNull().default(0),
    status: text("status").notNull().default("processing"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("knowledge_sources_product_idx").on(t.productId)],
);

export const knowledgeChunks = sqliteTable(
  "knowledge_chunks",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull().references(() => knowledgeSources.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    heading: text("heading"),
    content: text("content").notNull(),
    tokenEstimate: integer("token_estimate").notNull(),
    /** Float32Array bytes. In PostgreSQL this becomes a pgvector column. */
    embedding: blob("embedding", { mode: "buffer" }).notNull(),
    embeddingModel: text("embedding_model").notNull(),
  },
  (t) => [index("knowledge_chunks_product_idx").on(t.productId)],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    locale: text("locale").notNull().default("ar"),
    metadata: text("metadata", { mode: "json" }),
    createdAt: text("created_at").notNull(),
    lastMessageAt: text("last_message_at").notNull(),
  },
  (t) => [
    index("conversations_product_idx").on(t.productId, t.lastMessageAt),
    index("conversations_tenant_idx").on(t.tenantId, t.userId),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    confidence: real("confidence"),
    sources: text("sources", { mode: "json" }),
    toolCalls: text("tool_calls", { mode: "json" }),
    handoffRequired: integer("handoff_required", { mode: "boolean" }).notNull().default(false),
    pageContext: text("page_context", { mode: "json" }),
    usage: text("usage", { mode: "json" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("messages_conversation_idx").on(t.conversationId, t.createdAt),
    index("messages_confidence_idx").on(t.productId, t.confidence),
  ],
);

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  productId: text("product_id"),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  details: text("details", { mode: "json" }),
  createdAt: text("created_at").notNull(),
});
