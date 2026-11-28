import { Sparks } from "@/components/brand/doodles";
import { ArrowRight, Star } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * En-tête de section (audit du 25/11) : sur-titre facultatif, titre, une phrase d'introduction, et le lien « Voir tout »
 * à droite sur ordinateur. Aligné à gauche ; `centered` pour les grandes phrases (avis, appel final).
 */
export function SectionHeading({
  title,
  eyebrow,
  intro,
  action,
  as: Tag = "h2",
  id,
  centered = false,
  className = "",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  action?: { href: string; label: string };
  as?: "h1" | "h2";
  id?: string;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div className={`section-head flex flex-col gap-4 ${centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"} ${className}`}>
      <div className={`container-text ${centered ? "mx-auto" : ""}`}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <Tag id={id} className={Tag === "h1" ? "page-title" : "section-title"}>{title}</Tag>
        {intro && <p className="lead mt-3">{intro}</p>}
      </div>
      {action && (
        <Link href={action.href} className="group hidden shrink-0 items-center gap-1.5 pb-1 text-sm font-semibold text-brand-900 sm:inline-flex">
          {action.label}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function PrimaryLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group btn btn-primary ${className}`}
    >
      {children}
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-4 ${i <= Math.round(value) ? "fill-brand-700 text-brand-700" : "text-brand-200"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function PageShell({ children, className = "", ...rest }: { children: ReactNode; className?: string; "data-testid"?: string }) {
  return <div className={`container-page ${className}`} {...rest}>{children}</div>;
}

/** Section pleine largeur : fond (crème, blanc ou encre), espacement vertical fixe, contenu dans la largeur commune. */
export function Section({
  children,
  tone = "cream",
  className = "",
  innerClassName = "",
  ...rest
}: {
  children: ReactNode;
  tone?: "cream" | "white" | "night";
  className?: string;
  innerClassName?: string;
  id?: string;
  "aria-labelledby"?: string;
  "data-testid"?: string;
}) {
  const bg = tone === "white" ? "section-white" : tone === "night" ? "section-night" : "";
  return (
    <section className={`section ${bg} ${className}`} {...rest}>
      <div className={`container-page reveal ${innerClassName}`}>{children}</div>
    </section>
  );
}

/**
 * En-tête de page commun (audit du 25/11) : bande crème, sur-titre, titre, introduction, aligné à gauche
 * (`centered` pour les pages d'accueil de rubrique comme le centre d'aide). Le contenu suit dans une `Section`.
 */
export function PageHeader({
  title,
  eyebrow,
  intro,
  children,
  centered = false,
  tone = "cream",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  centered?: boolean;
  tone?: "cream" | "white";
}) {
  return (
    // Piste A (docs/29, étape 7c) : halos pêche et lilas, petits traits corail.
    <header className={`page-header halo-top relative ${tone === "white" ? "section-white" : ""}`}>
      <Sparks className="pointer-events-none absolute end-6 top-6 w-12 sm:end-[8%] sm:top-10 sm:w-14" />
      <div className={`container-page relative ${centered ? "text-center" : ""}`}>
        <div className={`container-text ${centered ? "mx-auto" : ""}`}>
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
          {intro && <p className="lead mt-4">{intro}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
