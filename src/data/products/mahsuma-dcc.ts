import type { ProductProfileInput } from "@/types";

export const mahsumaDcc: ProductProfileInput = {
  id: "mahsuma-dcc",
  name: "محسومة DCC",
  nameEn: "Mahsuma DCC",
  description: "منصة قيادة رقمية وإدارة مؤسسية (Digital Command Center): لوحات قيادة تنفيذية، مؤشرات أداء، إدارة المبادرات والمهام، وتقارير للإدارة العليا.",
  audience: "الإدارة التنفيذية، مكاتب إدارة المشاريع (PMO)، ومديرو الإدارات في الشركات والجهات الحكومية",
  website: "https://dcc.mahsuma.sa",
  persona: {
    name: "مساعد محسومة DCC",
    role: "مستشار القيادة الرقمية والإدارة المؤسسية",
    tone: "مهني، رصين، موجّه للقرار، يشرح بلغة الأعمال ويستخدم المصطلحات الإدارية بدقة",
    greeting: "أنا مساعد محسومة DCC. أساعدك في إعداد لوحات القيادة، تعريف مؤشرات الأداء، إدارة المبادرات، الصلاحيات، أو اختيار الباقة المناسبة لمنشأتك.",
    greetingEn: "I'm the Mahsuma DCC assistant. I can help with executive dashboards, KPI definitions, initiative tracking, permissions, or choosing the right plan.",
    canHelpWith: ["لوحات القيادة التنفيذية", "مؤشرات الأداء KPIs", "إدارة المبادرات والمهام", "الصلاحيات والهيكل التنظيمي", "الباقات والتراخيص", "التقارير الدورية"],
    cannot: ["تقديم استشارات قانونية أو مالية ملزمة", "اختراع مؤشرات أو تقارير غير موجودة في المنصة", "الاطلاع على بيانات منشآت أخرى", "الحديث عن محسومة كلاود كجزء من DCC"],
    defaultLocale: "ar",
  },
  productPrompt: `- الجمهور غالباً غير تقني: تجنب المصطلحات البرمجية إلا إذا كان الدور developer.
- عند سؤال عن "كيف أقيس X" اقترح مؤشرات من الوثائق فقط، ووضّح أن تعريف المؤشر النهائي قرار إداري للمنشأة.
- إذا سُئلت عن التكامل مع أنظمة أخرى، اعتمد على قائمة التكاملات الموثقة.`,
  plans: [
    { id: "team", name: "الفريق", nameEn: "Team", price: 999, currency: "SAR", billingCycle: "monthly", description: "لإدارة واحدة أو فريق حتى 25 مستخدم", features: ["25 مستخدم", "3 لوحات قيادة", "50 مؤشر أداء", "إدارة المبادرات", "تقارير شهرية"], limits: { seats: 25, dashboards: 3, kpis: 50 }, recommendedFor: ["starter", "فرق", "إدارة واحدة"] },
    { id: "organization", name: "المنشأة", nameEn: "Organization", price: 3999, currency: "SAR", billingCycle: "monthly", description: "لمنشأة كاملة بعدة إدارات", features: ["200 مستخدم", "لوحات غير محدودة", "500 مؤشر", "هيكل تنظيمي متعدد المستويات", "تكاملات (Excel، Power BI، API)", "دعم أولوية"], limits: { seats: 200, dashboards: -1, kpis: 500 }, recommendedFor: ["growth", "شركات متوسطة", "منشآت"] },
    { id: "government", name: "الجهات", nameEn: "Government / Enterprise", price: 0, currency: "SAR", billingCycle: "yearly", description: "عرض سعر حسب حجم الجهة ومتطلبات الاستضافة", features: ["مستخدمون غير محدودون", "استضافة خاصة داخل المملكة", "SSO وتدقيق كامل", "مدير نجاح مخصص", "تدريب وتأهيل"], limits: { seats: -1, dashboards: -1, kpis: -1 }, recommendedFor: ["enterprise", "مؤسسات", "جهات حكومية"] },
  ],
  faqs: [
    { id: "faq-kpi", question: "كم عدد المؤشرات التي يمكن تعريفها؟", answer: "حسب الباقة: 50 في باقة الفريق، 500 في باقة المنشأة، وغير محدود في باقة الجهات." },
    { id: "faq-integrations", question: "ما التكاملات المتاحة؟", answer: "استيراد Excel/CSV، Power BI، وواجهة REST API (متاحة من باقة المنشأة)." },
    { id: "faq-trial", question: "هل توجد فترة تجريبية؟", answer: "نعم، 14 يوماً مجاناً على باقة الفريق بدون بطاقة ائتمانية." },
  ],
  policies: [
    { id: "data-residency", title: "توطين البيانات", content: "تُستضاف بيانات الجهات داخل المملكة، ويمكن للجهات الحكومية طلب استضافة خاصة." },
    { id: "access", title: "سياسة الوصول", content: "الصلاحيات تُدار وفق الهيكل التنظيمي؛ لا يرى المستخدم إلا بيانات الإدارات المصرّح له بها." },
  ],
  access: { allowAnonymous: true, allowedOrigins: [], anonymousRateLimit: 15 },
  enabledTools: ["get_current_user", "get_product_info", "get_pricing_plans", "search_knowledge_base", "create_support_ticket", "suggest_plan", "fetch_billing_summary", "create_onboarding_checklist"],
  allowedRoles: ["visitor", "customer", "customer_admin", "support_agent", "owner"],
  confidenceThreshold: 0.55,
  theme: { primaryColor: "#1e3a8a", accentColor: "#3b82f6", position: "bottom-right", title: "مساعد محسومة DCC" },
  status: "active",
};
