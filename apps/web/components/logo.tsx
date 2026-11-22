import { Link } from "@/i18n/navigation";

/** Fichiers du logo Wenzy (version « Serré », direction Coucher de soleil), recadrés au plus près. Rapport largeur / hauteur : 2,635. */
export const LOGO_SRC = { ink: "/images/brand/logo-encre.svg", cream: "/images/brand/logo-creme.svg", white: "/images/brand/logo-blanc.svg" } as const;

/** Logo cliquable vers l'accueil : « wen » net + « zy » manuscrit en dégradé, servi en fichier (mis en cache par le navigateur). */
export function Logo({ className = "", tone = "ink" }: { className?: string; tone?: keyof typeof LOGO_SRC }) {
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG statique, pas d'optimisation nécessaire */}
      <img src={LOGO_SRC[tone]} alt="Wenzy — accueil" width={105} height={40} className="h-10 w-auto max-[379px]:h-9 max-[339px]:h-8 lg:h-11" />
    </Link>
  );
}
