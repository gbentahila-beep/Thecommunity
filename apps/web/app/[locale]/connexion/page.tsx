import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard, DisabledSubmit, Field } from "@/components/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage({ params }: PageProps<"/[locale]/connexion">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      notice={FIREBASE_ENABLED ? undefined : t("demoNotice")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/inscription" className="font-semibold text-plum-900 underline underline-offset-4">
            {t("goSignup")}
          </Link>
          {!FIREBASE_ENABLED && (
            <Link href="/espace" className="mt-3 block font-medium text-plum-900 underline underline-offset-4">
              {t("demoSpace")}
            </Link>
          )}
        </>
      }
    >
      {FIREBASE_ENABLED ? (
        <Suspense>
          <LoginForm />
        </Suspense>
      ) : (
        <form className="space-y-4">
          <Field label={t("email")} type="email" name="email" autoComplete="email" required />
          <Field label={t("password")} type="password" name="password" autoComplete="current-password" required />
          <p className="text-end text-sm text-muted">{t("forgot")}</p>
          <DisabledSubmit>{t("loginCta")}</DisabledSubmit>
        </form>
      )}
    </AuthCard>
  );
}
