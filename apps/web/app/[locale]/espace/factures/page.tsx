import { TitleSparks } from "@/components/brand/doodles";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InvoiceList } from "@/components/account/invoice-list";
import { EmptyState } from "@/components/empty-state";
import { getMyInvoices } from "@/lib/data/invoices";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/factures">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invoices" });
  return { title: t("title") };
}

export default async function InvoicesPage({ params }: PageProps<"/[locale]/espace/factures">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, te, { invoices, isDemo }] = await Promise.all([getTranslations("invoices"), getTranslations("emptyStates"), getMyInvoices()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title"><TitleSparks text={t("title")} /></h1>
        <p className="mt-2 max-w-2xl text-ink/75">{t("intro")}</p>
      </div>
      {isDemo ? (
        <p className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{t("demo")}</p>
      ) : invoices.length === 0 ? (
        <EmptyState bab="pixel" mood="wink" prop="receipt" titleAs="h2" title={te("invoicesTitle")} text={t("empty")} action={{ href: "/experiences", label: te("browse") }} />
      ) : (
        <>
          {invoices.some((i) => i.test) && <p className="text-sm text-muted">{t("testNote")}</p>}
          <InvoiceList invoices={invoices} />
        </>
      )}
    </div>
  );
}
