import { formatMoney, LOW_SEATS_THRESHOLD, seatsAvailable, type Experience, type Session } from "@thecommunity/shared";
import { MapPin, Users } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategory } from "@/lib/data";
import { formatShortSlot } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { FavoriteButton } from "./favorite-button";

export async function groupLabel(experience: Experience, session: Pick<Session, "capacity">) {
  const t = await getTranslations("card");
  const g = experience.groupConfig;
  switch (experience.bookingMode) {
    case "social_dinner":
      return t("people", { count: g?.targetSize ?? 6 });
    case "group":
      return g && g.minSize !== g.maxSize ? t("peopleRange", { min: g.minSize, max: g.maxSize }) : t("people", { count: g?.maxSize ?? 6 });
    case "open":
      return t("openFormat");
    default:
      return t("places", { count: session.capacity });
  }
}

export async function ExperienceCard({
  session,
  experience,
  priority = false,
}: {
  session: Session;
  experience: Experience;
  priority?: boolean;
}) {
  const [locale, t, category] = await Promise.all([getLocale(), getTranslations("card"), getCategory(experience.categoryId)]);
  const left = seatsAvailable(session);
  const full = session.status === "full" || left === 0;
  const cover = experience.images[0];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden">
        {cover && (
          <Image
            src={cover.path}
            alt={tr(cover.alt, locale)}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 45vw, 90vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
        <span className="absolute bottom-3 start-3 rounded-full bg-badge px-3 py-1 text-xs font-medium text-plum-900">
          {category ? tr(category.shortName, locale) : ""}
        </span>
        {full ? (
          <span className="absolute top-3 start-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
            {t("full")}
          </span>
        ) : left <= LOW_SEATS_THRESHOLD ? (
          <span className="absolute top-3 start-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-plum-800">
            {t("lastSeats", { count: left })}
          </span>
        ) : null}
        <FavoriteButton experienceId={experience.id} className="absolute end-3 top-3 z-10" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-[17px] font-semibold leading-snug text-ink">
          <Link href={`/experiences/${experience.slug}`} className="after:absolute after:inset-0">
            {tr(experience.title, locale)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-4 shrink-0 text-plum-700" aria-hidden />
          {experience.district} · {formatShortSlot(session.startAt, locale)}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <p className="text-lg font-bold text-ink">{formatMoney(session.price, locale as "fr" | "ar")}</p>
          <p className="flex items-center gap-1.5 text-sm text-ink/80">
            <Users className="size-4" aria-hidden />
            {full ? t("waitlist") : await groupLabel(experience, session)}
          </p>
        </div>
      </div>
    </article>
  );
}
