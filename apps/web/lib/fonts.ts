import { Amiri, IBM_Plex_Sans_Arabic, Instrument_Serif, Inter } from "next/font/google";

/** Polices de la charte Wenzy (brand book, planche 02) : Instrument Serif pour les titres, Inter pour le texte, Amiri et IBM Plex Sans Arabic pour l'arabe. */
export const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});
export const arabicDisplay = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-arabic-display", display: "swap" });

export const fontVariables = `${instrument.variable} ${inter.variable} ${arabic.variable} ${arabicDisplay.variable}`;
