import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InvoiceList } from "@/components/account/invoice-list";
import { getMyInvoices } from "@/lib/data/invoices";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/factures">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invoices" });
  return { title: t("title") };
}

export default async function InvoicesPage({ params }: PageProps<"/[locale]/espace/factures">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { invoices, isDemo }] = await Promise.all([getTranslations("invoices"), getMyInvoices()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
        <p className="mt-2 text-ink/75">{t("intro")}</p>
      </div>
      {isDemo ? (
        <p className="rounded-2xl bg-plum-50 p-4 text-sm text-plum-900">{t("demo")}</p>
      ) : invoices.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white p-5 text-ink/80 shadow-card">{t("empty")}</p>
      ) : (
        <>
          {invoices.some((i) => i.test) && <p className="text-sm text-muted">{t("testNote")}</p>}
          <InvoiceList invoices={invoices} />
        </>
      )}
    </div>
  );
}
