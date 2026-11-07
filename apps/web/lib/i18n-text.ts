import type { LocalizedText } from "@thecommunity/shared";

/** Texte dans la langue demandée, avec repli sur le français (langue de référence). */
export function tr(text: LocalizedText | undefined, locale: string): string {
  if (!text) return "";
  return (text as Record<string, string | undefined>)[locale] || text.fr;
}
