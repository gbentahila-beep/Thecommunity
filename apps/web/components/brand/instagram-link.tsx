import { getTranslations } from "next-intl/server";
import { INSTAGRAM_HANDLE } from "@/lib/site";

/**
 * Pastille « Suivez-nous sur Instagram » (direction artistique, docs/29, étape 7c) : pied de page et Menu du téléphone.
 * Tant que l'identifiant n'est pas renseigné (lib/site.ts), elle s'affiche sans lien.
 */
export async function InstagramLink({ className = "" }: { className?: string }) {
  const t = await getTranslations("footer");
  const inner = (
    <>
      <span className="grid size-8 place-items-center rounded-full bg-gradient-brand text-white" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" /></svg>
      </span>
      <span>{INSTAGRAM_HANDLE ? `@${INSTAGRAM_HANDLE}` : t("instagram")}</span>
    </>
  );
  const cls = `inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 ps-1.5 pe-4 text-sm font-semibold text-ink shadow-card ring-1 ring-line transition hover:ring-brand-200 ${className}`;
  return INSTAGRAM_HANDLE ? (
    <a href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`} target="_blank" rel="noopener noreferrer" className={cls} aria-label={t("instagram")} data-testid="footer-instagram">{inner}</a>
  ) : (
    <span className={cls} data-testid="footer-instagram">{inner}</span>
  );
}
