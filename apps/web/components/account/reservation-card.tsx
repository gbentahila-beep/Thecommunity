import type { Reservation } from "@thecommunity/shared";
import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatLongDate, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { StatusBadge } from "./status-badge";

export async function ReservationCard({ reservation }: { reservation: Reservation }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("account")]);
  const s = reservation.sessionSnapshot;
  return (
    <article className="relative flex gap-4 rounded-[var(--radius-card)] bg-white p-3 shadow-card transition hover:shadow-float">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl sm:size-28">
        <Image src={s.coverImagePath} alt="" fill sizes="112px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 py-1">
        <StatusBadge status={reservation.status} />
        <h3 className="truncate font-semibold text-ink">
          <Link href={`/espace/reservations/${reservation.id}`} className="after:absolute after:inset-0">
            {tr(s.title, locale)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays className="size-4 shrink-0 text-plum-700" aria-hidden />
          {formatLongDate(s.startAt, locale)} · {formatTimeRange(s.startAt, s.endAt, locale)}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-4 shrink-0 text-plum-700" aria-hidden />
          {s.district}
          {reservation.seats > 1 && <span>· {t("seats", { count: reservation.seats })}</span>}
        </p>
      </div>
    </article>
  );
}
