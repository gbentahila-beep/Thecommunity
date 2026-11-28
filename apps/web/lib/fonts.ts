import { Amiri, Caveat, IBM_Plex_Sans_Arabic, Inter, Newsreader } from "next/font/google";

/** Polices de la charte Wenzy : Newsreader pour les titres (vraies graisses, gras pour les grands titres), Inter pour le texte, Amiri et IBM Plex Sans Arabic pour l'arabe. */
export const display = Newsreader({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-display-serif", display: "swap" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});
export const arabicDisplay = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-arabic-display", display: "swap" });

/** Écriture manuscrite de la marque (le « zy » du logo) : signatures et petites légendes seulement (direction artistique, docs/29). */
export const hand = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat", display: "swap" });

export const fontVariables = `${display.variable} ${inter.variable} ${arabic.variable} ${arabicDisplay.variable} ${hand.variable}`;
