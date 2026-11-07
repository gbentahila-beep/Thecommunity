import type { ReservationStatus } from "@thecommunity/shared";
import { getTranslations } from "next-intl/server";

const STYLES: Record<ReservationStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  attended: "bg-plum-100 text-plum-900",
  cancelled: "bg-stone-200 text-stone-700",
  refunded: "bg-stone-200 text-stone-700",
  expired: "bg-stone-200 text-stone-700",
  no_show: "bg-stone-200 text-stone-700",
};

export async function StatusBadge({ status }: { status: ReservationStatus }) {
  const t = await getTranslations("labels.status");
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>{t(status)}</span>;
}
