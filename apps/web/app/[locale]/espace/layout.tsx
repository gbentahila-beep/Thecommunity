import { Info } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountNav } from "@/components/account/account-nav";
import { PageShell } from "@/components/ui";
import { getMemberSpace } from "@/lib/data/member";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Espace membre. Phase 3 : ce layout vérifiera le cookie de session et redirigera vers /connexion
 * si l'utilisateur n'est pas connecté (en plus des règles Firestore, qui restent la vraie barrière).
 */
export default async function AccountLayout({ children }: LayoutProps<"/[locale]/espace">) {
  const [t, space] = await Promise.all([getTranslations("account"), getMemberSpace()]);
  return (
    <PageShell className="py-6 lg:py-10">
      <p role="note" className="mb-6 flex items-start gap-2.5 rounded-2xl bg-plum-50 px-4 py-3 text-sm text-plum-900">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("demoNotice")}
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <AccountNav unreadCount={space.unreadCount} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </PageShell>
  );
}
