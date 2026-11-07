"use client";

import { Download } from "lucide-react";

/**
 * Export CSV compatible Excel (séparateur « ; » et BOM UTF-8 pour les accents en version française d'Excel).
 * Phase 3 : l'export sera généré par une Cloud Function et journalisé (auditLogs).
 */
export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}

export function CsvExportButton({ filename, rows, label = "Exporter (CSV / Excel)" }: { filename: string; rows: (string | number)[][]; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
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
