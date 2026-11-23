import { tablesTimeline } from "@thecommunity/shared";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { LiveTableMessages, TABLE_MESSAGES_SHOWN } from "@/components/account/live-table-messages";
import { TableChatForm } from "@/components/account/table-chat";
import { MemberAvatar } from "@/components/member-avatar";
import { Link } from "@/i18n/navigation";
import { getMemberSpace } from "@/lib/data/member";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { formatLongDate, formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export const metadata = { robots: { index: false } };

type Message = { id: string; uid: string; firstName: string; text: string; createdAt: string };

/** Messages de la table après la rencontre (docs/22, décision 39) : seulement les personnes qui ont fait leur check-in. */
export default async function TableChatPage({ params }: PageProps<"/[locale]/espace/rencontres/table/[groupId]">) {
  const { locale: lp, groupId } = await params;
  setRequestLocale(lp);
  const [space, t, locale] = await Promise.all([getMemberSpace(), getTranslations("tableChat"), getLocale()]);
  const td = await getTranslations("dayOf");
  const me = space.profile.uid;
  const group = space.groups.find((g) => g.id === groupId);
  const r = group ? space.reservations.find((x) => x.groupId === group.id) : undefined;
  if (!group || !r || !(group.arrivedUids ?? []).includes(me)) notFound();
  const timeline = tablesTimeline(r.sessionSnapshot.startAt);
  const now = space.now.getTime();
  const open = now >= timeline.chatFrom.getTime() && now <= timeline.chatUntil.getTime();
  let messages: Message[] = [];
  if (FIREBASE_ENABLED) {
    // Audit 23/11 : les 300 DERNIERS messages (avant : les 300 premiers, les plus récents disparaissaient).
    const snap = await adminDb().collection(`groups/${groupId}/messages`).orderBy("createdAt", "desc").limit(TABLE_MESSAGES_SHOWN).get();
    messages = [...snap.docs].reverse().map((d) => ({ id: d.id, uid: String(d.get("uid")), firstName: String(d.get("firstName") ?? ""), text: String(d.get("text") ?? ""), createdAt: d.get("createdAt")?.toDate?.().toISOString() ?? new Date(0).toISOString() }));
  } else {
    const other = group.members.find((m) => m.uid !== me);
    const live = now < new Date(r.sessionSnapshot.endAt).getTime();
    messages = live
      ? [
          { id: "m1", uid: "u-karim", firstName: "Karim", text: t("demoLive1"), createdAt: new Date(now - 12 * 60_000).toISOString() },
          { id: "m2", uid: "u-lina", firstName: "Lina", text: t("demoLive2"), createdAt: new Date(now - 6 * 60_000).toISOString() },
        ]
      : other ? [{ id: "m1", uid: other.uid, firstName: other.firstName, text: t("demoMessage"), createdAt: timeline.chatFrom.toISOString() }] : [];
  }
  const live = now < new Date(r.sessionSnapshot.endAt).getTime();
  const statusOf = (uid: string) => ((group.arrivedUids ?? []).includes(uid) ? "arrived" : group.late?.[uid] ? "late" : "waiting");
  return (
    <div className="space-y-6">
      <Link href="/espace/rencontres" className="inline-flex items-center gap-2 text-sm font-medium text-brand-900"><ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />{t("back")}</Link>
      <header className="text-center">
        <h1 className="page-title">{t("title", { label: group.label })}</h1>
        <p className="mt-1 text-sm text-muted">{tr(r.sessionSnapshot.title, locale)} · {formatLongDate(r.sessionSnapshot.startAt, locale)}</p>
        <p className="mt-1 text-sm text-muted">{t("window", { until: `${formatLongDate(timeline.chatUntil.toISOString(), locale)} ${formatTime(timeline.chatUntil.toISOString(), locale)}` })}</p>
      </header>
      <ul className="flex justify-center gap-3 overflow-x-auto pb-1" aria-label={td("atTable")} data-testid="chat-members">
        {group.members.map((m) => {
          const st = statusOf(m.uid);
          return (
            <li key={m.uid} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
              <span className="relative">
                <MemberAvatar uid={m.uid} photoPath={m.photoPath} size={48} />
                {live && <span aria-hidden className={`absolute -end-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-white ${st === "arrived" ? "bg-emerald-500" : st === "late" ? "bg-amber-400" : "bg-stone-300"}`} />}
              </span>
              <span className="w-full truncate text-xs font-medium text-ink">{m.uid === me ? t("you") : m.firstName}</span>
              {live && <span className="sr-only">{st === "arrived" ? td("statusArrived") : st === "late" ? td("statusLate", { minutes: group.late?.[m.uid] ?? 0 }) : td("statusWaiting")}</span>}
            </li>
          );
        })}
      </ul>
      <section className="card space-y-3 p-5" data-testid="table-chat">
        <LiveTableMessages
          groupId={groupId}
          me={me}
          locale={locale}
          initial={messages}
          avatars={Object.fromEntries(group.members.map((m) => [m.uid, <MemberAvatar key={m.uid} uid={m.uid} photoPath={m.photoPath} size={32} />]))}
        />
        <TableChatForm groupId={groupId} open={open} />
      </section>
    </div>
  );
}
