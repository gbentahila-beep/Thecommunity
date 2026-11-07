import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationsList } from "@/components/account/notifications-list";
import { getMemberSpace } from "@/lib/data/member";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/notifications">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "notificationsPage" }))("title") };
}

export default async function NotificationsPage({ params }: PageProps<"/[locale]/espace/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, space] = await Promise.all([getTranslations("notificationsPage"), getMemberSpace()]);
  const sorted = [...space.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-2">
      <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
      <NotificationsList initial={sorted} nowIso={space.now.toISOString()} uid={space.session?.uid} />
    </div>
  );
}
