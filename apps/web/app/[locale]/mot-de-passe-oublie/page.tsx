import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "@/components/auth/forgot-form";
import { Link } from "@/i18n/navigation";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata: Metadata = { robots: { index: false } };

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/mot-de-passe-oublie">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("forgotTitle")}
      subtitle={t("forgotSubtitle")}
      notice={FIREBASE_ENABLED ? undefined : t("demoNotice")}
      footer={<Link href="/connexion" className="font-semibold text-plum-900 underline underline-offset-4">{t("backToLogin")}</Link>}
    >
      {FIREBASE_ENABLED ? <ForgotForm /> : null}
    </AuthCard>
  );
}
