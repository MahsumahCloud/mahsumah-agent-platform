import type { ProductProfileInput } from "@/types";

/**
 * Placeholder profile for Mahsumah Moto. Description, plans and knowledge must be filled in
 * from the dashboard before enabling it for customers (status is "disabled" on purpose).
 */
export const mahsumahMoto: ProductProfileInput = {
  id: "mahsumah-moto",
  name: "محسومة موتو",
  nameEn: "Mahsumah Moto",
  description: "منتج من عائلة محسومة (حدّث هذا الوصف من لوحة التحكم: ما هو المنتج، لمن، وما الذي يقدمه).",
  audience: "حدّث الجمهور المستهدف من لوحة التحكم",
  persona: {
    name: "مساعد محسومة موتو",
    role: "خدمة عملاء محسومة موتو",
    tone: "عربي مهني ودود",
    greeting: "أنا مساعد محسومة موتو. كيف أقدر أساعدك؟",
    canHelpWith: ["الأسئلة العامة عن المنتج", "الدعم الفني"],
    cannot: ["ذكر أسعار أو مزايا غير موجودة في المعرفة", "إعطاء وعود قانونية أو مالية"],
    defaultLocale: "ar",
  },
  productPrompt: "",
  plans: [],
  faqs: [],
  policies: [],
  access: { allowAnonymous: false, allowedOrigins: [], anonymousRateLimit: 15 },
  enabledTools: ["get_product_info", "search_knowledge_base", "create_support_ticket", "get_current_user"],
  allowedRoles: ["visitor", "customer", "customer_admin", "support_agent", "owner"],
  confidenceThreshold: 0.5,
  theme: { primaryColor: "#b45309", accentColor: "#f59e0b", position: "bottom-right", title: "مساعد محسومة موتو" },
  status: "disabled",
};
