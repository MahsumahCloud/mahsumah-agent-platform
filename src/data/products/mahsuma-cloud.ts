import type { ProductProfileInput } from "@/types";

export const mahsumaCloud: ProductProfileInput = {
  id: "mahsuma-cloud",
  name: "محسومة كلاود",
  nameEn: "Mahsuma Cloud",
  description: "منصة استضافة ونشر تطبيقات الويب للسوق السعودي: ربط مباشر مع Git، نشر تلقائي، نطاقات وشهادات SSL، ومراكز بيانات داخل المملكة لتلبية متطلبات توطين البيانات.",
  audience: "المطورون، الشركات الناشئة، والشركات التي تحتاج استضافة متوافقة مع متطلبات البيانات السعودية",
  website: "https://cloud.mahsumaah.sa",
  persona: {
    name: "مساعد محسومة كلاود",
    role: "مساعد المطورين والشركات",
    tone: "احترافي، واضح، سعودي، تقني عند الحاجة",
    greeting: "أنا مساعد محسومة كلاود. أقدر أساعدك في اختيار الباقة، فهم النشر، ربط GitHub، إعداد البيئة، أو فتح تذكرة دعم إذا احتجت.",
    greetingEn: "I'm the Mahsuma Cloud assistant. I can help you pick a plan, understand deployments, connect GitHub, configure environments, or open a support ticket.",
    canHelpWith: ["النشر والتوزيع", "الباقات والأسعار", "الامتثال وتوطين البيانات", "الاستضافة والنطاقات", "الدعم الفني"],
    cannot: ["إعطاء وعود قانونية أو تعاقدية", "ذكر أسعار أو مزايا غير موجودة في الباقات الرسمية", "منح صلاحيات أو تنفيذ إجراءات خارج الأدوات المتاحة", "الحديث عن منتجات محسومة الأخرى كأنها جزء من كلاود"],
    defaultLocale: "ar",
  },
  productPrompt: `- عند سؤال "هل تدعمون X؟" اعتمد على قائمة الأطر المدعومة في الوثائق فقط.
- للأسئلة عن الامتثال، اذكر أن مراكز البيانات داخل المملكة وأحل المستخدم إلى وثيقة الامتثال، ولا تؤكد اعتمادات (مثل شهادات محددة) غير مذكورة صراحة.
- إذا كان المستخدم في صفحة مشروع (pageContext.path يبدأ بـ /dashboard/projects) فاقترح الخطوة التالية ذات الصلة بالنشر.`,
  plans: [
    { id: "starter", name: "البداية", nameEn: "Starter", price: 0, currency: "SAR", billingCycle: "monthly", description: "للمشاريع الشخصية والتجارب", features: ["مشروع واحد", "نطاق فرعي مجاني", "100 GB نقل بيانات", "نشر تلقائي من Git"], limits: { maxProjects: 1, bandwidthGb: 100, seats: 1, customDomains: 0 }, recommendedFor: ["starter", "أفراد", "طلاب"] },
    { id: "growth", name: "النمو", nameEn: "Growth", price: 149, currency: "SAR", billingCycle: "monthly", description: "للشركات الناشئة والفرق الصغيرة", features: ["10 مشاريع", "نطاقات مخصصة غير محدودة", "1 TB نقل بيانات", "بيئات Preview لكل فرع", "5 مقاعد", "دعم عبر البريد خلال 24 ساعة"], limits: { maxProjects: 10, bandwidthGb: 1000, seats: 5, customDomains: -1 }, recommendedFor: ["growth", "شركات ناشئة", "startup"] },
    { id: "business", name: "الأعمال", nameEn: "Business", price: 499, currency: "SAR", billingCycle: "monthly", description: "للشركات المتوسطة التي تحتاج أداء ومراقبة", features: ["50 مشروع", "5 TB نقل بيانات", "20 مقعد", "مراقبة الأداء والتنبيهات", "دعم أولوية خلال 4 ساعات", "سجلات لمدة 30 يوم"], limits: { maxProjects: 50, bandwidthGb: 5000, seats: 20, customDomains: -1 }, recommendedFor: ["business", "شركات متوسطة"] },
    { id: "enterprise", name: "المؤسسات", nameEn: "Enterprise", price: 1999, currency: "SAR", billingCycle: "monthly", description: "للمؤسسات والجهات ذات متطلبات الامتثال", features: ["مشاريع غير محدودة", "بنية مخصصة داخل المملكة", "SSO و تدقيق الصلاحيات", "مدير حساب مخصص", "دعم 24/7", "اتفاقية مستوى خدمة حسب العقد"], limits: { maxProjects: -1, bandwidthGb: -1, seats: -1, customDomains: -1 }, recommendedFor: ["enterprise", "مؤسسات", "جهات حكومية"] },
  ],
  faqs: [
    { id: "faq-frameworks", question: "ما الأطر المدعومة؟", answer: "Next.js، React (Vite)، Node.js، Nuxt، SvelteKit، المواقع الثابتة، وحاويات Docker.", tags: ["deploy"] },
    { id: "faq-region", question: "أين توجد الخوادم؟", answer: "جميع الخوادم داخل المملكة العربية السعودية (الرياض-1 و جدة-1).", tags: ["compliance"] },
    { id: "faq-cancel", question: "هل يمكن إلغاء الاشتراك في أي وقت؟", answer: "نعم، الإلغاء متاح من صفحة الفوترة ويسري في نهاية الدورة الحالية بدون رسوم إضافية.", tags: ["billing"] },
  ],
  policies: [
    { id: "refund", title: "سياسة الاسترجاع", content: "يمكن طلب استرجاع كامل خلال 14 يوماً من أول اشتراك مدفوع إذا لم يتجاوز استهلاك نقل البيانات 10% من حد الباقة." },
    { id: "data", title: "سياسة البيانات", content: "بيانات العملاء تُخزَّن وتُعالج داخل المملكة فقط، ولا تُنقل خارجها إلا بطلب صريح من العميل." },
  ],
  access: { allowAnonymous: true, allowedOrigins: [], anonymousRateLimit: 15 },
  enabledTools: ["get_current_user", "get_product_info", "get_pricing_plans", "search_knowledge_base", "create_support_ticket", "check_project_status", "suggest_plan", "explain_deployment_steps", "fetch_billing_summary", "create_onboarding_checklist"],
  allowedRoles: ["visitor", "customer", "customer_admin", "developer", "support_agent", "owner"],
  confidenceThreshold: 0.5,
  theme: { primaryColor: "#0f766e", accentColor: "#14b8a6", position: "bottom-right", title: "مساعد محسومة كلاود" },
  status: "active",
};
