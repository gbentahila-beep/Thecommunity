import Image from "next/image";
import type { ReactNode } from "react";
import { Swash, TitleSparks } from "@/components/brand/doodles";

/**
 * En-tête des pages vitrines (direction artistique « Soleil de Casa », docs/29, étape 7c) : le même dessin que
 * l'accueil, en plus court. Sur ordinateur, la photo en forme libre part du coin haut droit et passe derrière le menu ;
 * sur téléphone, elle occupe le haut avec un bord ondulé et le texte suit, centré. Les formes viennent de PhotoShapes
 * (posées une fois dans la mise en page).
 */
export function PageHero({
  eyebrow,
  title,
  accent,
  intro,
  children,
  photo,
  photoAlt,
  position = "50% 40%",
  compact = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Deuxième ligne du titre, au dégradé de la marque. */
  accent?: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  photo: string;
  photoAlt: string;
  position?: string;
  /** Plus court (Abonnement, Avis) : le contenu utile arrive plus vite. */
  compact?: boolean;
}) {
  return (
    <section
      data-hero-bleed
      className="relative -mt-16 overflow-hidden bg-[radial-gradient(520px_420px_at_0%_0%,#fff_0%,transparent_70%),radial-gradient(620px_460px_at_8%_100%,var(--color-peach)_0%,transparent_62%)] bg-cream-light lg:-mt-20"
    >
      <div className="absolute inset-y-0 end-0 hidden w-[50%] lg:block">
        <div className="absolute inset-0 [clip-path:url(#shape-hero)]">
          <Image src={photo} alt={photoAlt} fill priority sizes="50vw" className="object-cover" style={{ objectPosition: position }} />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/20 to-transparent to-25%" />
        </div>
      </div>
      <div className={`relative lg:hidden ${compact ? "h-[260px]" : "h-[330px]"}`}>
        <div className="absolute inset-0 [clip-path:url(#shape-hero-m)]">
          <Image src={photo} alt={photoAlt} fill priority sizes="100vw" className="object-cover" style={{ objectPosition: position }} />
        </div>
      </div>
      <div className={`container-page relative z-10 lg:flex lg:items-center ${compact ? "lg:min-h-[520px]" : "lg:min-h-[600px]"}`}>
        <div className={`pt-2 text-center lg:max-w-[500px] lg:pt-32 lg:text-start ${compact ? "pb-10 lg:pb-20" : "pb-14 lg:pb-24"}`}>
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="page-title">
            {/* Une étincelle par page, collée au dernier mot du titre (docs/29, 28/11). */}
            {accent ? title : typeof title === "string" ? <TitleSparks text={title} /> : title}
            {accent && <span className="block text-gradient">{typeof accent === "string" ? <TitleSparks text={accent} /> : accent}</span>}
          </h1>
          <Swash className="mx-auto mt-1 block h-3.5 w-44 lg:ms-0 lg:w-56" />
          {intro && <div className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink/75 lg:mx-0 lg:text-lg">{intro}</div>}
          {children}
        </div>
      </div>
    </section>
  );
}
