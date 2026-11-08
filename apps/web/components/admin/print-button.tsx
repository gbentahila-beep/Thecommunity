"use client";

import { Printer } from "lucide-react";

/** Imprimer la page (ou l'enregistrer en PDF depuis la fenêtre d'impression du navigateur). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-800 print:hidden">
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
