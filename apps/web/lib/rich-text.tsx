import { Fragment, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LEGAL_INFO } from "@/lib/legal-info";

/**
 * Texte enrichi minimal des contenus éditoriaux : liens internes « [texte](/chemin) » (préfixe de langue ajouté)
 * et jetons « {{cle}} » remplacés par les informations légales, ou par une mention « à compléter » bien visible.
 */
export function richText(text: string, missing: string): ReactNode {
  return text.split(/(\[[^\]]+\]\(\/[^)]*\)|\{\{\w+\}\})/g).map((p, i) => {
    const link = p.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/);
    if (link) {
      return (
        <Link key={i} href={link[2]!} className="font-medium text-plum-900 underline decoration-plum-700/40 underline-offset-4 hover:decoration-plum-900">
          {link[1]}
        </Link>
      );
    }
    const token = p.match(/^\{\{(\w+)\}\}$/);
    if (token) {
      const value = (LEGAL_INFO as Record<string, string | null>)[token[1]!];
      return value ? <Fragment key={i}>{value}</Fragment> : <mark key={i} className="rounded bg-amber-100 px-1 text-amber-950">{missing}</mark>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** Version texte brut (recherche, métadonnées). */
export function plainText(text: string): string {
  return text.replace(/\[([^\]]+)\]\(\/[^)]*\)/g, "$1").replace(/\{\{\w+\}\}/g, "");
}
