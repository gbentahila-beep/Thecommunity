import type { ReactNode } from "react";
import { Bab, type BabMood, type BabName, type BabProp } from "@/components/brand/bab";
import { babGlow } from "@/components/brand/bab-art";
import { Link } from "@/i18n/navigation";

type Action = { href: string; label: string };

type Props = {
  bab: BabName;
  mood?: BabMood;
  prop?: BabProp;
  eyebrow?: string;
  title?: string;
  text: ReactNode;
  action?: Action;
  secondary?: Action;
  /** « card » : carte blanche ; « plain » : sans fond (déjà dans une carte) ; « compact » : une ligne avec un petit Bab. */
  variant?: "card" | "plain" | "compact";
  /** Niveau du titre : h3 dans une section (par défaut), h2 sous le titre de page, h1 sur une page d'erreur. */
  titleAs?: "h1" | "h2" | "h3";
  className?: string;
  "data-testid"?: string;
};

/**
 * État vide (docs/22-babs.md) : un Bab dans une humeur précise, une phrase claire et, si possible,
 * une action pour repartir. Jamais d'impasse.
 */
export function EmptyState({ bab, mood = "happy", prop, eyebrow, title, text, action, secondary, variant = "card", titleAs: Title = "h3", className = "", ...rest }: Props) {
  if (variant === "compact") {
    return (
      <div className={`card flex items-center gap-4 px-5 py-4 ${className}`} {...rest}>
        <Bab name={bab} mood={mood} className="w-14 shrink-0" />
        <div className="min-w-0 text-sm text-muted">
          <p>{text}</p>
          {action && (
            <Link href={action.href} className="mt-1 inline-block font-semibold text-brand-900 underline underline-offset-4">
              {action.label}
            </Link>
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      className={`grid justify-items-center px-6 py-8 text-center ${variant === "card" ? "card" : ""} ${className}`}
      {...rest}
    >
      <div
        className="grid w-full place-items-center"
        style={{ background: `radial-gradient(52% 62% at 44% 60%, color-mix(in oklab, ${babGlow(bab)} 15%, transparent), transparent 72%)` }}
      >
        <Bab name={bab} mood={mood} prop={prop} className={prop ? "w-52" : "w-32"} />
      </div>
      {eyebrow && <p className="eyebrow mt-3">{eyebrow}</p>}
      {title && <Title className="mt-2 font-display text-[26px] leading-tight font-medium text-balance text-ink">{title}</Title>}
      <div className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{text}</div>
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {action && (
            <Link href={action.href} className="btn btn-primary btn-sm">
              {action.label}
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="btn btn-secondary btn-sm">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
