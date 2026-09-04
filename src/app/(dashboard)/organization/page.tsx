import { getOrganization, ORGANIZATION_ID } from "@/lib/products/repository";
import { listSources } from "@/lib/rag/ingest";
import { KnowledgeManager } from "@/components/dashboard/KnowledgeManager";
import { OrganizationForm } from "@/components/dashboard/OrganizationForm";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function OrganizationPage() {
  const org = getOrganization();
  return (
    <>
      <PageHeader title="معرفة المؤسسة المشتركة" subtitle="كل ما يُضاف هنا (تعريف محسومة، دليل المنتجات، القيم، قنوات التواصل) يرثه كل وكيل تلقائياً بجانب معرفة منتجه، فيعرف العائلة كاملة ويوجّه العميل للمنتج الصحيح." />
      {!org ? (
        <EmptyState title="لا يوجد ملف مؤسسة" description="شغّل npm run db:seed لإنشاء ملف المؤسسة الافتراضي." />
      ) : (
        <div className="space-y-6">
          <OrganizationForm initial={org} />
          <KnowledgeManager productId={ORGANIZATION_ID} initialSources={listSources(ORGANIZATION_ID)} faqCount={org.faqs.length} />
        </div>
      )}
    </>
  );
}
