import { Link } from "@/i18n/navigation";

/** Logo cliquable vers l'accueil : logotype vectoriel (identité 10b), servi en fichier (mis en cache par le navigateur). */
export function Logo({ className = "", tone = "plum" }: { className?: string; tone?: "plum" | "cream" }) {
  const src = tone === "cream" ? "/images/brand/logo-horizontal-creme.svg" : "/images/brand/logo-horizontal-prune.svg";
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG statique, pas d'optimisation nécessaire */}
      <img src={src} alt="The Host Club — accueil" width={180} height={25} className="h-[1.55rem] w-auto lg:h-[1.85rem]" />
    </Link>
  );
}
