import { LOGO_SRC } from "@/components/logo";

/** Logo Wenzy non cliquable, pour les supports imprimables (marque-place, chevalet, carte de bienvenue). */
export function BrandLogo({ className = "", tone = "ink", alt = "" }: { className?: string; tone?: keyof typeof LOGO_SRC; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- SVG statique
  return <img src={LOGO_SRC[tone]} alt={alt} width={105} height={40} className={`w-auto ${className}`} />;
}
