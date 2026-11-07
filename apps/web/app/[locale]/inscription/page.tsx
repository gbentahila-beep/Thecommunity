import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard, DisabledSubmit, Field } from "@/components/auth-card";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false } };

export default async function SignupPage({ params }: PageProps<"/[locale]/inscription">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tf] = await Promise.all([getTranslations("auth"), getTranslations("footer")]);
  return (
    <AuthCard
      title={t("signupTitle")}
      subtitle={t("signupSubtitle")}
      notice={t("demoNotice")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link href="/connexion" className="font-semibold text-plum-900 underline underline-offset-4">
            {t("goLogin")}
          </Link>
          <Link href="/bienvenue" className="mt-3 block font-medium text-plum-900 underline underline-offset-4">
            {t("demoOnboarding")}
          </Link>
        </>
      }
    >
      <form className="space-y-4">
        <Field label={t("firstName")} name="firstName" autoComplete="given-name" required />
        <Field label={t("email")} type="email" name="email" autoComplete="email" required />
        <Field label={t("password")} type="password" name="password" autoComplete="new-password" minLength={8} required />
        <label className="flex items-start gap-3 text-sm text-ink/80">
          <input type="checkbox" name="consent" required className="mt-0.5 size-5 accent-plum-900" />
          <span>
            {t("consent")}
            <span className="mt-1 flex flex-wrap gap-x-3 text-plum-900">
              <Link href="/cgu" className="underline underline-offset-2">{tf("terms")}</Link>
              <Link href="/confidentialite" className="underline underline-offset-2">{tf("privacy")}</Link>
              <Link href="/charte" className="underline underline-offset-2">{tf("charter")}</Link>
            </span>
          </span>
        </label>
        <DisabledSubmit>{t("signupCta")}</DisabledSubmit>
      </form>
    </AuthCard>
  );
}
