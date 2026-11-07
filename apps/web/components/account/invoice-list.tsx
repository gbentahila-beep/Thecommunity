import { formatMoney } from "@thecommunity/shared";
import { Download, FileText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { MemberInvoice } from "@/lib/data/invoices";
import { formatCalendarDate } from "@/lib/format";

/** Liste de documents (factures, avoirs, reçus) avec téléchargement du PDF. */
export async function InvoiceList({ invoices }: { invoices: MemberInvoice[] }) {
  const [t, locale] = await Promise.all([getTranslations("invoices"), getLocale()]);
  const lang = locale as "fr" | "ar" | "en";
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-white shadow-card">
      {invoices.map((i) => {
        const kind = i.kind === "credit_note" ? (i.legal ? t("creditNote") : t("refundReceipt")) : i.legal ? t("invoice") : t("receipt");
        const amount = formatMoney({ amount: i.kind === "credit_note" ? -i.total : i.total, currency: i.currency as "MAD" }, lang);
        return (
          <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 sm:p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-plum-50 text-plum-900">
              <FileText className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {kind}
                {i.test && <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-medium text-amber-900">{t("test")}</span>}
              </p>
              <p className="font-mono text-xs text-muted" dir="ltr">{i.number}</p>
              <p className="truncate text-sm text-muted">
                {i.issuedAt ? formatCalendarDate(i.issuedAt.slice(0, 10), locale) : ""} · {i.label}
              </p>
            </div>
            <p className={`tabular-nums font-semibold ${i.kind === "credit_note" ? "text-emerald-800" : "text-ink"}`} dir="ltr">{amount}</p>
            {i.pdfReady ? (
              <a
                href={`/api/factures/${i.id}`}
                download
                aria-label={t("downloadLabel", { number: i.number })}
                className="inline-flex items-center gap-2 rounded-full border border-plum-900 px-4 py-2 text-sm font-semibold text-plum-900 transition hover:bg-plum-900 hover:text-white"
              >
                <Download className="size-4" aria-hidden />
                {t("download")}
              </a>
            ) : (
              <span className="text-sm text-muted">{t("pending")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
