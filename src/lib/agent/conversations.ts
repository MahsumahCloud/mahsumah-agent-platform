import { and, desc, eq, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/db/client";
import type { ConversationSummary, Locale, PageContext, Principal, SourceCitation, StoredMessage, ToolCallRecord } from "@/types";

export function getOrCreateConversation(input: { id?: string; productId: string; principal: Principal; locale: Locale; metadata?: Record<string, unknown> }): { id: string; isNew: boolean } {
  const db = getDb();
  const now = new Date().toISOString();
  if (input.id) {
    const row = db.select({ id: schema.conversations.id, tenantId: schema.conversations.tenantId, userId: schema.conversations.userId, productId: schema.conversations.productId }).from(schema.conversations).where(eq(schema.conversations.id, input.id)).get();
    // A conversation belongs to exactly one product+tenant+user; anything else is rejected, never merged.
    if (row && row.tenantId === input.principal.tenantId && row.userId === input.principal.userId && row.productId === input.productId) return { id: row.id, isNew: false };
  }
  const id = nanoid();
  db.insert(schema.conversations).values({ id, productId: input.productId, tenantId: input.principal.tenantId, userId: input.principal.userId, role: input.principal.role, locale: input.locale, metadata: input.metadata ?? null, createdAt: now, lastMessageAt: now }).run();
  return { id, isNew: true };
}

export function appendMessage(input: { conversationId: string; productId: string; role: "user" | "assistant"; content: string; confidence?: number; sources?: SourceCitation[]; toolCalls?: ToolCallRecord[]; handoffRequired?: boolean; pageContext?: PageContext; usage?: Record<string, unknown> }): string {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();
  db.insert(schema.messages).values({ id, conversationId: input.conversationId, productId: input.productId, role: input.role, content: input.content, confidence: input.confidence ?? null, sources: input.sources ?? null, toolCalls: input.toolCalls ?? null, handoffRequired: input.handoffRequired ?? false, pageContext: input.pageContext ?? null, usage: input.usage ?? null, createdAt: now }).run();
  db.update(schema.conversations).set({ lastMessageAt: now }).where(eq(schema.conversations.id, input.conversationId)).run();
  return id;
}

export function getHistory(conversationId: string, limit = 12): StoredMessage[] {
  const rows = getDb().select().from(schema.messages).where(eq(schema.messages.conversationId, conversationId)).orderBy(desc(schema.messages.createdAt)).limit(limit).all();
  return rows.reverse().map(rowToMessage);
}

export function listConversations(productId: string, opts: { limit?: number; lowConfidenceBelow?: number } = {}): ConversationSummary[] {
  const db = getDb();
  const rows = db
    .select({
      id: schema.conversations.id,
      productId: schema.conversations.productId,
      tenantId: schema.conversations.tenantId,
      userId: schema.conversations.userId,
      role: schema.conversations.role,
      createdAt: schema.conversations.createdAt,
      lastMessageAt: schema.conversations.lastMessageAt,
      messageCount: sql<number>`(select count(*) from messages m where m.conversation_id = ${schema.conversations.id})`,
      lowestConfidence: sql<number | null>`(select min(m.confidence) from messages m where m.conversation_id = ${schema.conversations.id} and m.role = 'assistant')`,
    })
    .from(schema.conversations)
    .where(eq(schema.conversations.productId, productId))
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(opts.limit ?? 50)
    .all();
  return rows.filter((r) => opts.lowConfidenceBelow === undefined || (r.lowestConfidence !== null && r.lowestConfidence < opts.lowConfidenceBelow));
}

export function getConversation(id: string): { summary: ConversationSummary; messages: StoredMessage[] } | undefined {
  const db = getDb();
  const row = db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).get();
  if (!row) return undefined;
  const msgs = db.select().from(schema.messages).where(eq(schema.messages.conversationId, id)).orderBy(schema.messages.createdAt).all().map(rowToMessage);
  const confidences = msgs.filter((m) => m.role === "assistant" && m.confidence !== null).map((m) => m.confidence as number);
  return {
    summary: { id: row.id, productId: row.productId, tenantId: row.tenantId, userId: row.userId, role: row.role, createdAt: row.createdAt, lastMessageAt: row.lastMessageAt, messageCount: msgs.length, lowestConfidence: confidences.length ? Math.min(...confidences) : null },
    messages: msgs,
  };
}

/** Assistant answers below the product threshold — the "questions we couldn't answer confidently" feed. */
export function listLowConfidenceAnswers(productId: string, threshold: number, limit = 50): { message: StoredMessage; question: string | null }[] {
  const db = getDb();
  const rows = db
    .select()
    .from(schema.messages)
    .where(and(eq(schema.messages.productId, productId), eq(schema.messages.role, "assistant"), lt(schema.messages.confidence, threshold)))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit)
    .all();
  return rows.map((r) => {
    const q = db.select({ content: schema.messages.content }).from(schema.messages).where(and(eq(schema.messages.conversationId, r.conversationId), eq(schema.messages.role, "user"), lt(schema.messages.createdAt, r.createdAt))).orderBy(desc(schema.messages.createdAt)).limit(1).get();
    return { message: rowToMessage(r), question: q?.content ?? null };
  });
}

export function productAnalytics(productId: string, threshold: number) {
  const db = getDb();
  const total = db.select({ n: sql<number>`count(*)` }).from(schema.conversations).where(eq(schema.conversations.productId, productId)).get()?.n ?? 0;
  const answers = db.select({ n: sql<number>`count(*)`, avg: sql<number | null>`avg(confidence)`, handoffs: sql<number>`sum(case when handoff_required = 1 then 1 else 0 end)`, low: sql<number>`sum(case when confidence < ${threshold} then 1 else 0 end)` }).from(schema.messages).where(and(eq(schema.messages.productId, productId), eq(schema.messages.role, "assistant"))).get();
  return { conversations: total, answers: answers?.n ?? 0, avgConfidence: answers?.avg ? Number(answers.avg.toFixed(2)) : null, handoffs: answers?.handoffs ?? 0, lowConfidence: answers?.low ?? 0 };
}

function rowToMessage(r: typeof schema.messages.$inferSelect): StoredMessage {
  return { id: r.id, conversationId: r.conversationId, role: r.role as "user" | "assistant", content: r.content, confidence: r.confidence, sources: (r.sources as SourceCitation[] | null) ?? null, toolCalls: (r.toolCalls as ToolCallRecord[] | null) ?? null, handoffRequired: r.handoffRequired, createdAt: r.createdAt };
}
