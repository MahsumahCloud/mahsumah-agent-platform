import type { Principal } from "./auth";
import type { ProductProfile, Locale } from "./product";
import type { SourceCitation } from "./knowledge";
import type { ToolCallRecord } from "./tool";

export interface PageContext {
  path?: string;
  projectType?: string;
  [key: string]: unknown;
}

export interface AgentRequest {
  productId: string;
  tenantId: string;
  userId: string;
  role: string;
  message: string;
  conversationId?: string;
  pageContext?: PageContext;
  metadata?: Record<string, unknown>;
  locale?: Locale;
}

export interface SuggestedAction {
  type: "open_ticket" | "navigate" | "upgrade_plan" | "view_docs" | "contact_sales" | "run_tool";
  label: string;
  payload?: Record<string, unknown>;
}

export interface AgentResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  confidence: number;
  sources: SourceCitation[];
  suggestedActions: SuggestedAction[];
  handoffRequired: boolean;
  toolCalls: ToolCallRecord[];
  locale: Locale;
  usage?: { inputTokens: number; outputTokens: number; model: string };
}

/** Everything a single agent run knows about its environment. */
export interface AgentContext {
  product: ProductProfile;
  principal: Principal;
  locale: Locale;
  pageContext?: PageContext;
  conversationId: string;
  requestId: string;
  /** Tool ids resolved after product config + RBAC filtering. */
  availableToolIds: string[];
}

export interface ConversationSummary {
  id: string;
  productId: string;
  tenantId: string;
  userId: string;
  role: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  lowestConfidence: number | null;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  confidence: number | null;
  sources: SourceCitation[] | null;
  toolCalls: ToolCallRecord[] | null;
  handoffRequired: boolean;
  createdAt: string;
}
