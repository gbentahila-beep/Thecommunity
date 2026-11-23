import type { Reservation } from "@thecommunity/shared";
import { CalendarDays, ClipboardList, MapPin } from "lucide-react";
import { MediaImage as Image } from "@/components/media";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatLongDate, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { StatusBadge } from "./status-badge";

export async function ReservationCard({ reservation }: { reservation: Reservation }) {
  const [locale, t, tq] = await Promise.all([getLocale(), getTranslations("account"), getTranslations("questionnaire")]);
  // 18a : invitation envoyée, réponses pas encore données (et expérience à venir).
  const questionnaireTodo = Boolean(reservation.questionnaireNotifiedAt) && !reservation.questionnaire && ["confirmed", "pending_payment"].includes(reservation.status) && isAfterNow(reservation.sessionSnapshot.startAt);
  const s = reservation.sessionSnapshot;
  return (
    <article className="relative flex gap-4 rounded-[var(--radius-card)] bg-white p-3 shadow-card transition hover:shadow-float">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl sm:size-28">
        <Image src={s.coverImagePath} alt="" fill sizes="112px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 py-1">
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={reservation.status} />
          {questionnaireTodo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950" data-testid="questionnaire-todo">
              <ClipboardList className="size-3.5" aria-hidden /> {tq("todo")}
            </span>
          )}
        </span>
        <h3 className="truncate font-semibold text-ink">
          <Link href={`/espace/reservations/${reservation.id}`} className="after:absolute after:inset-0">
            {tr(s.title, locale)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays className="size-4 shrink-0 text-brand-700" aria-hidden />
          {formatLongDate(s.startAt, locale)} · {formatTimeRange(s.startAt, s.endAt, locale)}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-4 shrink-0 text-brand-700" aria-hidden />
          {/* Lieu secret : rien tant qu'il n'est pas communiqué (docs/22). */}
          {reservation.venue?.name ?? ""}
          {reservation.seats > 1 && <span>· {t("seats", { count: reservation.seats })}</span>}
        </p>
      </div>
    </article>
  );
}

/** Hors du rendu (règle de pureté) : la date est-elle encore à venir ? */
function isAfterNow(iso: string) {
  return new Date(iso).getTime() > Date.now();
}
