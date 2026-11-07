import type { ReactNode } from "react";

// La mise en page réelle (balise <html>, langue, direction) est dans app/[locale]/layout.tsx.
// Ce fichier permet d'avoir une page 404 globale pour les URLs hors langue.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
