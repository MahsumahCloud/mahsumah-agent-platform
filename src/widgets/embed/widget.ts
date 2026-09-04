/**
 * Embeddable chat widget. Built to /public/widget.js by scripts/build-widget.ts.
 * Zero dependencies, reads its config from data-* attributes on the <script> tag,
 * supports RTL/LTR and theming from the product profile.
 *
 * <script src="https://agent.example.com/widget.js"
 *   data-product-id="mahsuma-cloud" data-user-token="mat_..." data-locale="ar"></script>
 *
 * Identity comes from `data-user-token`, a short-lived token minted by the host BACKEND
 * (see src/lib/tenancy/user-token.ts). Never put a product API key (mak_…) in a page.
 * Without a token the widget relies on a same-origin session (dashboard demo only).
 */
interface WidgetConfig {
  productId: string; userToken?: string;
  /** Only used when no token is present (same-origin demo/session mode). */
  tenantId: string; userId: string; role: string;
  locale: "ar" | "en"; baseUrl: string; userName?: string; pageContext?: Record<string, unknown>;
  primaryColor?: string; title?: string; position?: "bottom-right" | "bottom-left";
}
interface RemoteConfig { name: string; greeting: string; greetingEn: string; defaultLocale: "ar" | "en"; theme: { primaryColor: string; accentColor?: string; logoUrl?: string; position?: string; title?: string } }
interface AgentReply { conversationId: string; answer: string; confidence: number; handoffRequired: boolean; sources: { title: string; reference?: string }[]; suggestedActions: { type: string; label: string; payload?: Record<string, unknown> }[] }

const STR = {
  ar: { placeholder: "اكتب سؤالك…", send: "إرسال", thinking: "جاري التفكير…", error: "تعذر الاتصال بالمساعد، حاول مرة أخرى.", sources: "المصادر", handoff: "قد يحتاج هذا السؤال لمتابعة من فريق الدعم.", open: "فتح المساعد", close: "إغلاق", poweredBy: "مدعوم بمنصة محسومة" },
  en: { placeholder: "Type your question…", send: "Send", thinking: "Thinking…", error: "Could not reach the assistant, please try again.", sources: "Sources", handoff: "This may need a follow-up from the support team.", open: "Open assistant", close: "Close", poweredBy: "Powered by Mahsuma" },
};

function readConfig(): WidgetConfig {
  const script = (document.currentScript as HTMLScriptElement | null) ?? document.querySelector<HTMLScriptElement>("script[data-product-id]");
  const d = script?.dataset ?? {};
  const base = d.baseUrl ?? (script ? new URL(script.src).origin : window.location.origin);
  let pageContext: Record<string, unknown> | undefined;
  try { pageContext = d.pageContext ? JSON.parse(d.pageContext) : { path: window.location.pathname }; } catch { pageContext = { path: window.location.pathname }; }
  if (d.apiKey) console.error("[mahsuma-widget] data-api-key is not supported in the browser; mint a user token on your backend (data-user-token).");
  return { productId: d.productId ?? "", userToken: d.userToken, tenantId: d.tenantId ?? "anonymous", userId: d.userId ?? visitorId(), role: d.role ?? "visitor", locale: (d.locale as "ar" | "en") ?? "ar", baseUrl: base, userName: d.userName, pageContext, primaryColor: d.primaryColor, title: d.title, position: d.position as WidgetConfig["position"] };
}

/** Stable per-browser id for anonymous visitors so a conversation survives page loads. Not an identity. */
function visitorId(): string {
  try {
    const k = "mah_visitor_id";
    let v = localStorage.getItem(k);
    if (!v) { v = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
    return v;
  } catch { return "v_" + Math.random().toString(36).slice(2); }
}

const CSS = `
.mah-root{position:fixed;z-index:2147483000;bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;font-size:14px;color:#0f172a}
.mah-root.right{right:20px}.mah-root.left{left:20px}
.mah-bubble{width:56px;height:56px;border-radius:999px;border:0;cursor:pointer;box-shadow:0 10px 30px rgba(2,6,23,.25);color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .15s}
.mah-bubble:hover{transform:scale(1.05)}
.mah-panel{position:absolute;bottom:70px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(2,6,23,.28);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .18s,transform .18s}
.mah-root.right .mah-panel{right:0}.mah-root.left .mah-panel{left:0}
.mah-panel.open{opacity:1;transform:none;pointer-events:auto}
.mah-head{padding:14px 16px;color:#fff;display:flex;align-items:center;gap:10px}
.mah-head .mah-logo{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700}
.mah-head .mah-title{font-weight:600;flex:1}
.mah-head .mah-sub{font-size:11px;opacity:.85}
.mah-close{background:transparent;border:0;color:#fff;cursor:pointer;font-size:18px}
.mah-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc}
.mah-msg{max-width:85%;padding:10px 12px;border-radius:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.mah-msg.user{align-self:flex-end;color:#fff;border-bottom-right-radius:4px}
[dir=rtl] .mah-msg.user{align-self:flex-start;border-bottom-right-radius:12px;border-bottom-left-radius:4px}
.mah-msg.bot{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;border-bottom-left-radius:4px}
[dir=rtl] .mah-msg.bot{align-self:flex-end;border-bottom-left-radius:12px;border-bottom-right-radius:4px}
.mah-msg.bot pre,.mah-msg.bot code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;direction:ltr;text-align:left}
.mah-msg.bot pre{background:#0f172a;color:#e2e8f0;padding:8px 10px;border-radius:8px;overflow-x:auto}
.mah-meta{font-size:11px;color:#64748b;margin-top:6px}
.mah-src{font-size:11px;color:#475569;margin-top:6px;border-top:1px dashed #e2e8f0;padding-top:6px}
.mah-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.mah-actions button{border:1px solid;background:#fff;border-radius:999px;padding:4px 10px;font-size:12px;cursor:pointer}
.mah-warn{font-size:11px;color:#b45309;margin-top:6px}
.mah-typing{align-self:flex-start;color:#64748b;font-size:12px;padding:6px 12px}
.mah-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff}
.mah-form input{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;font-family:inherit}
.mah-form input:focus{border-color:var(--mah-primary)}
.mah-form button{border:0;color:#fff;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer;font-family:inherit}
.mah-form button:disabled{opacity:.6;cursor:default}
.mah-foot{font-size:10px;color:#94a3b8;text-align:center;padding:4px 0 6px;background:#fff}
@media (max-width:480px){.mah-panel{width:calc(100vw - 20px);height:calc(100vh - 100px)}.mah-root.right{right:10px}.mah-root.left{left:10px}}
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Minimal safe markdown: code fences, inline code, bold, lists. Everything is text-node based (no innerHTML of user data). */
function renderMarkdown(target: HTMLElement, text: string) {
  const parts = text.split(/```([\s\S]*?)```/g);
  parts.forEach((part, i) => {
    if (i % 2 === 1) { const pre = el("pre"); pre.textContent = part.replace(/^\w+\n/, ""); target.appendChild(pre); return; }
    part.split("\n").forEach((line, li, arr) => {
      const segs = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      for (const s of segs) {
        if (!s) continue;
        if (s.startsWith("`")) target.appendChild(el("code", undefined, s.slice(1, -1)));
        else if (s.startsWith("**")) { const b = el("strong", undefined, s.slice(2, -2)); target.appendChild(b); }
        else target.appendChild(document.createTextNode(s));
      }
      if (li < arr.length - 1) target.appendChild(document.createElement("br"));
    });
  });
}

class MahsumaWidget {
  private cfg: WidgetConfig;
  private remote: RemoteConfig | null = null;
  private conversationId?: string;
  private root!: HTMLElement;
  private panel!: HTMLElement;
  private msgs!: HTMLElement;
  private input!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;
  private open = false;
  private t: (typeof STR)["ar"];

  constructor(cfg: WidgetConfig) {
    this.cfg = cfg;
    this.t = STR[cfg.locale] ?? STR.ar;
  }

  async mount() {
    if (!this.cfg.productId) { console.warn("[mahsuma-widget] data-product-id is required"); return; }
    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/v1/widget-config?productId=${encodeURIComponent(this.cfg.productId)}`);
      if (res.ok) this.remote = (await res.json()) as RemoteConfig;
    } catch { /* fall back to local config */ }
    const primary = this.cfg.primaryColor ?? this.remote?.theme.primaryColor ?? "#0f766e";
    const title = this.cfg.title ?? this.remote?.theme.title ?? this.remote?.name ?? "المساعد";
    const position = this.cfg.position ?? (this.remote?.theme.position as WidgetConfig["position"]) ?? "bottom-right";

    const style = el("style"); style.textContent = CSS; document.head.appendChild(style);
    this.root = el("div", `mah-root ${position === "bottom-left" ? "left" : "right"}`);
    this.root.style.setProperty("--mah-primary", primary);
    this.root.dir = this.cfg.locale === "ar" ? "rtl" : "ltr";

    const bubble = el("button", "mah-bubble"); bubble.style.background = primary; bubble.setAttribute("aria-label", this.t.open);
    bubble.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    bubble.onclick = () => this.toggle();

    this.panel = el("div", "mah-panel");
    const head = el("div", "mah-head"); head.style.background = primary;
    const logo = el("div", "mah-logo", title.slice(0, 1));
    if (this.remote?.theme.logoUrl) { const img = el("img"); img.src = this.remote.theme.logoUrl; img.style.cssText = "width:32px;height:32px;border-radius:8px"; head.appendChild(img); } else head.appendChild(logo);
    const tw = el("div", "mah-title"); tw.appendChild(el("div", undefined, title)); tw.appendChild(el("div", "mah-sub", this.cfg.locale === "ar" ? "مساعد آلي — يجيب من وثائق المنتج" : "AI assistant — answers from product docs"));
    head.appendChild(tw);
    const close = el("button", "mah-close", "✕"); close.setAttribute("aria-label", this.t.close); close.onclick = () => this.toggle(false); head.appendChild(close);

    this.msgs = el("div", "mah-msgs");
    const form = el("form", "mah-form");
    this.input = el("input"); this.input.placeholder = this.t.placeholder; this.input.maxLength = 4000;
    this.sendBtn = el("button", undefined, this.t.send); this.sendBtn.type = "submit"; this.sendBtn.style.background = primary;
    form.appendChild(this.input); form.appendChild(this.sendBtn);
    form.onsubmit = (e) => { e.preventDefault(); void this.send(); };

    this.panel.appendChild(head); this.panel.appendChild(this.msgs); this.panel.appendChild(form); this.panel.appendChild(el("div", "mah-foot", this.t.poweredBy));
    this.root.appendChild(this.panel); this.root.appendChild(bubble);
    document.body.appendChild(this.root);

    const greeting = this.cfg.locale === "en" ? this.remote?.greetingEn : this.remote?.greeting;
    this.addBot(greeting ?? (this.cfg.locale === "ar" ? "مرحباً! كيف أقدر أساعدك؟" : "Hi! How can I help?"));
  }

  toggle(force?: boolean) {
    this.open = force ?? !this.open;
    this.panel.classList.toggle("open", this.open);
    if (this.open) this.input.focus();
  }

  private addUser(text: string) {
    const m = el("div", "mah-msg user", text); m.style.background = this.root.style.getPropertyValue("--mah-primary"); this.msgs.appendChild(m); this.scroll();
  }

  private addBot(text: string, reply?: AgentReply) {
    const m = el("div", "mah-msg bot");
    renderMarkdown(m, text);
    if (reply) {
      if (reply.handoffRequired) m.appendChild(el("div", "mah-warn", this.t.handoff));
      if (reply.sources.length) {
        const s = el("div", "mah-src", `${this.t.sources}: ${reply.sources.map((x) => x.title).join(" · ")}`);
        m.appendChild(s);
      }
      if (reply.suggestedActions.length) {
        const a = el("div", "mah-actions");
        for (const act of reply.suggestedActions) {
          const b = el("button", undefined, act.label); b.style.borderColor = this.root.style.getPropertyValue("--mah-primary"); b.style.color = this.root.style.getPropertyValue("--mah-primary");
          b.onclick = () => this.handleAction(act);
          a.appendChild(b);
        }
        m.appendChild(a);
      }
    }
    this.msgs.appendChild(m); this.scroll();
  }

  private handleAction(act: AgentReply["suggestedActions"][number]) {
    window.dispatchEvent(new CustomEvent("mahsuma-agent:action", { detail: act }));
    if (act.type === "open_ticket") { this.input.value = this.cfg.locale === "ar" ? "افتح لي تذكرة دعم بخصوص هذا الموضوع" : "Please open a support ticket about this"; void this.send(); }
    else if (act.type === "view_docs" && typeof act.payload?.url === "string") window.open(act.payload.url, "_blank", "noopener");
    else if (act.type === "navigate" && typeof act.payload?.path === "string") window.location.assign(act.payload.path);
  }

  private scroll() { this.msgs.scrollTop = this.msgs.scrollHeight; }

  private async send() {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = ""; this.addUser(text);
    const typing = el("div", "mah-typing", this.t.thinking); this.msgs.appendChild(typing); this.scroll();
    this.sendBtn.disabled = true;
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.cfg.userToken) headers.authorization = `Bearer ${this.cfg.userToken}`;
      // Without a token the server treats the request as an anonymous visitor (or the dashboard session).
      const identity = this.cfg.userToken ? {} : { tenantId: this.cfg.tenantId, userId: this.cfg.userId, role: this.cfg.role };
      const res = await fetch(`${this.cfg.baseUrl}/api/v1/agent/chat`, { method: "POST", headers, credentials: this.cfg.userToken ? "omit" : "include", body: JSON.stringify({ productId: this.cfg.productId, ...identity, message: text, conversationId: this.conversationId, locale: this.cfg.locale, pageContext: this.cfg.pageContext, metadata: this.cfg.userName ? { userName: this.cfg.userName } : undefined }) });
      typing.remove();
      if (!res.ok) { const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null; this.addBot(err?.error?.message ?? this.t.error); return; }
      const reply = (await res.json()) as AgentReply;
      this.conversationId = reply.conversationId;
      this.addBot(reply.answer, reply);
    } catch { typing.remove(); this.addBot(this.t.error); }
    finally { this.sendBtn.disabled = false; this.input.focus(); }
  }
}

(function boot() {
  const cfg = readConfig();
  const start = () => { const w = new MahsumaWidget(cfg); void w.mount(); (window as unknown as { MahsumaAgent?: unknown }).MahsumaAgent = w; };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
