import { otherOf } from "@thecommunity/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InviteForm, MeetActions } from "@/components/account/meet-actions";
import { EmptyState } from "@/components/empty-state";
import { MemberAvatar } from "@/components/member-avatar";
import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getNextSessionPerExperience } from "@/lib/data";
import { getMeetData, getMemberSpace } from "@/lib/data/member";
import { formatLongDate, formatShortSlot } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

/** Étape 31 — « Mes rencontres » : contacts réciproques, anciens groupes, souhaits privés, invitations. Sans messagerie. */
export default async function MeetPage({ params }: PageProps<"/[locale]/espace/rencontres">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, te, tInt, data, space] = await Promise.all([getTranslations("meet"), getTranslations("emptyStates"), getTranslations("labels.interests"), getMeetData(), getMemberSpace()]);
  const me = space.profile.uid;
  const upcoming = (await getNextSessionPerExperience({ cityId: space.profile.cityId })).filter((s) => s.status !== "full").slice(0, 30);
  const sessions = upcoming.map((s) => ({ id: s.id, label: `${tr(s.experience.title, locale)} · ${formatShortSlot(s.startAt, locale)}` }));
  return (
    <div className="space-y-10">
      <header>
        <h1 className="page-title">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t("intro")}</p>
      </header>

      <section aria-labelledby="contacts-title" className="space-y-3">
        <h2 id="contacts-title" className="text-center font-display text-2xl font-medium text-brand-900">{t("contacts")}</h2>
        {data.connections.length === 0 ? (
          <EmptyState bab="toast" mood="big" prop="hearts" title={te("meetTitle")} text={t("noContacts")} />
        ) : (
          <ul className="space-y-3">
            {data.connections.map((c) => {
              const o = otherOf(c, me);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="meet-contact">
                  <MemberAvatar uid={o.uid} size={48} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-semibold text-ink">{o.firstName}</p>
                    <p className="text-sm text-muted">{t("metAt", { title: c.experienceTitle, date: c.metAt ? formatLongDate(c.metAt, locale).replace(/^./, (x) => (locale === "fr" ? x.toLowerCase() : x)) : "" })}</p>
                  </div>
                  <InviteForm toUid={o.uid} firstName={o.firstName} sessions={sessions} live={!data.isDemo} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="groups-title" className="space-y-3">
        <h2 id="groups-title" className="text-center font-display text-2xl font-medium text-brand-900">{t("groups")}</h2>
        <p className="text-center text-sm text-muted">{t("groupsIntro")}</p>
        {data.groups.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 p-5 text-sm text-muted">
            {t("noGroups")} <Link href="/experiences" className="font-semibold text-brand-900 underline underline-offset-4">{t("discover")}</Link>
          </p>
        ) : (
          data.groups.map((g) => (
            <article key={g.id} className="rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="meet-group">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-ink">{g.title} <span className="font-normal text-muted">· {g.label}</span></h3>
                <p className="text-sm text-muted">{formatLongDate(g.startAt, locale)}</p>
              </div>
              {!g.windowOpen && !g.live && <p className="mt-1 text-xs text-muted">{t("windowClosed")}</p>}
              {g.chatOpen && (
                <Link href={`/espace/rencontres/table/${g.id}`} className="btn btn-primary btn-sm mt-3" data-testid="meet-chat">
                  <MessageCircle className="size-4" aria-hidden />
                  {t("chat")}
                </Link>
              )}
              <ul className="mt-4 divide-y divide-line">
                {g.members.map((m) => (
                  <li key={m.uid} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid="meet-member">
                    <div className="flex items-center gap-3">
                      <MemberAvatar uid={m.uid} photoPath={m.photoPath} size={40} />
                      <div>
                      <p className="font-medium text-ink">{m.firstName}</p>
                      {m.interests.length > 0 && <p className="text-xs text-muted">{m.interests.slice(0, 3).map((i) => tInt(i)).join(" · ")}</p>}
                      </div>
                    </div>
                    {!g.live && <MeetActions groupId={g.id} otherUid={m.uid} firstName={m.firstName} wished={m.wished} avoided={m.avoided} matched={m.matched} windowOpen={g.windowOpen} live={!data.isDemo} />}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
      <p className="text-xs text-muted">{t("privacy")}</p>
    </div>
  );
}
