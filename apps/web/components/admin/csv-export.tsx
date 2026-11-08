"use client";

import { httpsCallable } from "firebase/functions";
import { Download } from "lucide-react";
import { firebase } from "@/lib/firebase/client";

/**
 * Export CSV compatible Excel (séparateur « ; » et BOM UTF-8 pour les accents en version française d'Excel).
 * En mode Firebase, chaque export de données personnelles est journalisé (auditLogs) avant d'être produit.
 */
export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}

export function CsvExportButton({
  filename,
  rows,
  label = "Exporter (CSV / Excel)",
  log,
}: {
  filename: string;
  rows: (string | number)[][];
  label?: string;
  /** Mode Firebase : l'export est journalisé (auditLogs) avant le téléchargement. */
  log?: { kind: "participants" | "reservations" | "users" | "two_part"; targetId?: string };
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (log) {
          try {
            await firebase().auth.authStateReady();
            await httpsCallable(firebase().functions, "adminLogExport")({ kind: log.kind, targetId: log.targetId ?? "", rows: Math.max(0, rows.length - 1) });
          } catch {
            window.alert("Export impossible : la journalisation a échoué. Réessayez.");
            return;
          }
        }
        const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-plum-900 bg-white px-4 py-2.5 text-sm font-semibold text-plum-900 hover:bg-plum-900 hover:text-white"
    >
      <Download className="size-4" aria-hidden />
      {label}
    </button>
  );
}
