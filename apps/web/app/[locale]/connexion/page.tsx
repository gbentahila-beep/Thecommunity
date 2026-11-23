import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard, DisabledSubmit, Field } from "@/components/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/connexion">) {
  const { locale } = await params;
  // Audit 23/11 : l'événement choisi suit la personne entre connexion et inscription.
  const suite = (await searchParams).suite;
  const keep = typeof suite === "string" && suite.startsWith("/") && !suite.startsWith("//") ? `?suite=${encodeURIComponent(suite)}` : "";
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
          <Link href={`/inscription${keep}`} className="font-semibold text-brand-900 underline underline-offset-4">
            {t("goSignup")}
          </Link>
          {!FIREBASE_ENABLED && (
            <Link href="/espace" className="mt-3 block font-medium text-brand-900 underline underline-offset-4">
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
