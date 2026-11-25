import type { ReactNode } from "react";
import { PageHeader, Section } from "./ui";

/** Pages de texte (FAQ, contact, partenaires, pages légales…) : en-tête crème, puis le contenu sur fond blanc. */
export function StaticPage({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} intro={intro} />
      {children && (
        <Section tone="white">
          {/* Colonne de lecture alignée sur le titre (pas centrée), comme les pages de texte de référence. */}
          <div className="max-w-3xl space-y-8">{children}</div>
        </Section>
      )}
    </>
  );
}
