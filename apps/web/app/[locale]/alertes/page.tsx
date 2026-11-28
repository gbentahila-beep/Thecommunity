import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertsLanding } from "@/components/alerts-landing";
import { PageShell } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("alerts");
  return { title: t("pageTitle"), robots: { index: false } };
}

const TOKEN = /^[a-f0-9]{48}$/;

/** Arrivée depuis un e-mail d'alerte : confirmation de l'inscription ou arrêt des alertes. */
export default async function AlertsPage({ params, searchParams }: PageProps<"/[locale]/alertes">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("alerts");
  const q = await searchParams;
  const confirm = typeof q.confirmer === "string" && TOKEN.test(q.confirmer) ? q.confirmer : null;
  const stop = typeof q.arreter === "string" && TOKEN.test(q.arreter) ? q.arreter : null;
  return (
    <PageShell className="max-w-2xl space-y-6 py-12">
      <h1 className="page-title">{t("pageTitle")}</h1>
      <AlertsLanding action={confirm ? "confirm" : stop ? "stop" : null} token={confirm ?? stop} />
    </PageShell>
  );
}
