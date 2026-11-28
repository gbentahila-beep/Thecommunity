import type { ReactNode } from "react";
import { PageHeader, Section } from "./ui";

/**
 * Pages de texte (FAQ, contact, partenaires, pages légales…) : en-tête à halos, puis le contenu sur fond blanc.
 * `aside` (pages légales, étape 7c) : sommaire collant à gauche sur ordinateur, colonne de lecture à droite.
 */
export function StaticPage({ title, intro, children, aside, wideAside = false }: { title: string; intro?: ReactNode; children?: ReactNode; aside?: ReactNode; wideAside?: boolean }) {
  return (
    <>
      <PageHeader title={title} intro={intro} />
      {children && (
        <Section tone="white" className="!pt-12 sm:!pt-16">
          {aside ? (
            <div className={`grid gap-8 lg:gap-14 ${wideAside ? "lg:grid-cols-[21rem_minmax(0,1fr)]" : "lg:grid-cols-[16rem_minmax(0,1fr)]"}`}>
              <aside className="lg:sticky lg:top-28 lg:self-start">{aside}</aside>
              <div className="max-w-3xl min-w-0 space-y-8">{children}</div>
            </div>
          ) : (
            // Colonne de lecture alignée sur le titre (pas centrée), comme les pages de texte de référence.
            <div className="max-w-3xl space-y-8">{children}</div>
          )}
        </Section>
      )}
    </>
  );
}
