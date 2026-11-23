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
    <ul className="card divide-y divide-line">
      {invoices.map((i) => {
        const kind = i.kind === "credit_note" ? (i.legal ? t("creditNote") : t("refundReceipt")) : i.legal ? t("invoice") : t("receipt");
        const amount = formatMoney({ amount: i.kind === "credit_note" ? -i.total : i.total, currency: i.currency as "MAD" }, lang);
        return (
          <li key={i.id} className="flex items-start gap-3 p-4 sm:items-center sm:gap-4 sm:p-5" data-testid="invoice-row">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-900">
              <FileText className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink">
                  {kind}
                  {i.test && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{t("test")}</span>}
                </p>
                <p className={`shrink-0 tabular-nums font-semibold ${i.kind === "credit_note" ? "text-emerald-800" : "text-ink"}`} dir="ltr">{amount}</p>
              </div>
              <p className="mt-0.5 font-mono text-xs break-all text-muted" dir="ltr">{i.number}</p>
              <p className="truncate text-sm text-muted">
                {i.issuedAt ? formatCalendarDate(i.issuedAt.slice(0, 10), locale) : ""} · {i.label}
              </p>
            </div>
            {i.pdfReady ? (
              <a
                href={`/api/factures/${i.id}`}
                download
                aria-label={t("downloadLabel", { number: i.number })}
                className="btn btn-secondary btn-sm size-10 shrink-0 self-center p-0 sm:size-auto sm:px-4 sm:py-2"
              >
                <Download className="size-4" aria-hidden />
                <span className="hidden sm:inline">{t("download")}</span>
              </a>
            ) : (
              <span className="shrink-0 self-center text-sm text-muted">{t("pending")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
