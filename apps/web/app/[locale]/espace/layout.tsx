import { Sparks } from "@/components/brand/doodles";
import { Info } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountBack } from "@/components/account/account-back";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { PageShell } from "@/components/ui";
import { getMemberSpace } from "@/lib/data/member";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Espace membre. En mode Firebase, getMemberSpace() vérifie le cookie de session côté serveur et
 * redirige vers /connexion (ou /bienvenue si le questionnaire n'est pas terminé).
 * Chaque rubrique a sa propre page (docs/16) : Accueil (tableau de bord), Réservations et Mon groupe depuis la
 * barre du bas ; Mon profil regroupe le reste (préférences, notifications, historique, factures, déconnexion).
 */
export default async function AccountLayout({ children }: LayoutProps<"/[locale]/espace">) {
  const [t, space] = await Promise.all([getTranslations("account"), getMemberSpace()]);
  return (
    // Étape 7c (docs/29, piste A) : halos pêche et lilas en haut de l'espace membre.
    <div className="halo-top relative">
    <Sparks className="pointer-events-none absolute end-6 top-6 hidden w-12 sm:end-[8%] sm:top-10 sm:block sm:w-14" />
    <PageShell className="relative max-w-3xl py-6 lg:py-10">
      {space.isDemo && (
        <p role="note" className="mb-6 flex items-start gap-2.5 rounded-2xl bg-white/80 px-4 py-3 text-sm text-brand-900 ring-1 ring-line/60">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("demoNotice")}
        </p>
      )}
      {space.session && !space.session.emailVerified && <VerifyEmailBanner />}
      <AccountBack />
      {children}
    </PageShell>
    </div>
  );
}
