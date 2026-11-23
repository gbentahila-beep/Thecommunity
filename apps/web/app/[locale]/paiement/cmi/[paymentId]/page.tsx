import { formatMoney } from "@thecommunity/shared";
import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CmiAutoSubmit } from "@/components/booking/cmi-auto-submit";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireMember } from "@/lib/data/member";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Audit du 23/11 (lot 6) — passage vers la page de paiement sécurisée du CMI. Les champs ont été préparés et signés par
 * le serveur (startCheckout) ; cette page les envoie au CMI (formulaire POST) : aucune donnée de carte ne passe par Wenzy.
 */
export default async function CmiPaymentPage({ params }: PageProps<"/[locale]/paiement/cmi/[paymentId]">) {
  const { locale, paymentId } = await params;
  setRequestLocale(locale);
  await connection();
  if (!FIREBASE_ENABLED) notFound();
  const user = await requireMember({ next: `/paiement/cmi/${paymentId}` });
  const pay = (await adminDb().doc(`payments/${paymentId}`).get()).data();
  if (!pay || pay.userId !== user.uid || pay.provider !== "cmi" || pay.type !== "payment" || !pay.cmiForm) notFound();
  const t = await getTranslations("cmi");
  const back = pay.purpose === "membership" ? "/abonnement" : `/espace/reservations/${pay.reservationId}`;
  if (pay.status !== "initiated") {
    return (
      <PageShell className="max-w-xl py-10">
        <h1 className="page-title">{t("doneTitle")}</h1>
        <Link href={back} className="btn btn-primary btn-sm mt-4">{t("back")}</Link>
      </PageShell>
    );
  }
  const form = pay.cmiForm as { action: string; fields: Record<string, string> };
  return (
    <PageShell className="max-w-xl py-10">
      <h1 className="page-title flex items-center gap-2"><Lock className="size-6 text-brand-800" aria-hidden />{t("title")}</h1>
      <p className="mt-3 text-ink/80">{t("text", { amount: formatMoney({ amount: pay.amount, currency: pay.currency }, locale as "fr" | "ar" | "en") })}</p>
      <CmiAutoSubmit action={form.action} fields={form.fields} label={t("cta")} />
      <p className="mt-4 text-xs text-muted">{t("secure")}</p>
      <Link href={back} className="mt-4 inline-block text-sm text-muted underline">{t("cancel")}</Link>
    </PageShell>
  );
}
