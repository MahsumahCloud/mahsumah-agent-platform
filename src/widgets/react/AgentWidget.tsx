"use client";

import { useEffect, useRef } from "react";

export interface AgentWidgetProps {
  productId: string;
  /** Only used when no userToken is given (same-origin session mode). */
  tenantId?: string;
  userId?: string;
  role?: string;
  locale?: "ar" | "en";
  /** Where the agent platform is hosted. Defaults to NEXT_PUBLIC_AGENT_URL or same origin. */
  baseUrl?: string;
  /**
   * Short-lived signed user token minted by YOUR backend with the product API key
   * (see docs/INTEGRATION.md). Required outside the dashboard; never pass the API key itself.
   */
  userToken?: string;
  userName?: string;
  pageContext?: Record<string, unknown>;
  primaryColor?: string;
  title?: string;
  position?: "bottom-right" | "bottom-left";
}

/**
 * React wrapper around the framework-agnostic embed script. Drop it once in your layout:
 *   <AgentWidget productId="mahsuma-cloud" userToken={tokenFromYourBackend} />
 */
export function AgentWidget(props: AgentWidgetProps) {
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const base = props.baseUrl ?? process.env.NEXT_PUBLIC_AGENT_URL ?? "";
    const script = document.createElement("script");
    script.src = `${base}/widget.js`;
    script.async = true;
    const data: Record<string, string | undefined> = {
      productId: props.productId, tenantId: props.tenantId, userId: props.userId, role: props.role, locale: props.locale,
      baseUrl: base || undefined, userToken: props.userToken, userName: props.userName, primaryColor: props.primaryColor, title: props.title, position: props.position,
      pageContext: props.pageContext ? JSON.stringify(props.pageContext) : undefined,
    };
    for (const [k, v] of Object.entries(data)) if (v !== undefined) script.dataset[k] = v;
    document.body.appendChild(script);
    return () => { script.remove(); document.querySelector(".mah-root")?.remove(); mounted.current = false; };
    // Props are read once at mount by design: re-mount the component to change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default AgentWidget;
