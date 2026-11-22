import { tablesTimeline } from "@thecommunity/shared";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { TableChatForm } from "@/components/account/table-chat";
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
  const me = space.profile.uid;
  const group = space.groups.find((g) => g.id === groupId);
  const r = group ? space.reservations.find((x) => x.groupId === group.id) : undefined;
  if (!group || !r || !(group.arrivedUids ?? []).includes(me)) notFound();
  const timeline = tablesTimeline(r.sessionSnapshot.startAt);
  const now = space.now.getTime();
  const open = now >= timeline.chatFrom.getTime() && now <= timeline.chatUntil.getTime();
  let messages: Message[] = [];
  if (FIREBASE_ENABLED) {
    const snap = await adminDb().collection(`groups/${groupId}/messages`).orderBy("createdAt").limit(300).get();
    messages = snap.docs.map((d) => ({ id: d.id, uid: String(d.get("uid")), firstName: String(d.get("firstName") ?? ""), text: String(d.get("text") ?? ""), createdAt: d.get("createdAt")?.toDate?.().toISOString() ?? new Date(0).toISOString() }));
  } else {
    const other = group.members.find((m) => m.uid !== me);
    messages = other ? [{ id: "m1", uid: other.uid, firstName: other.firstName, text: t("demoMessage"), createdAt: timeline.chatFrom.toISOString() }] : [];
  }
  return (
    <div className="space-y-6">
      <Link href="/espace/rencontres" className="inline-flex items-center gap-2 text-sm font-medium text-brand-900"><ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />{t("back")}</Link>
      <header>
        <h1 className="page-title">{t("title", { label: group.label })}</h1>
        <p className="mt-1 text-sm text-muted">{tr(r.sessionSnapshot.title, locale)} · {formatLongDate(r.sessionSnapshot.startAt, locale)}</p>
        <p className="mt-1 text-sm text-muted">{t("window", { until: `${formatLongDate(timeline.chatUntil.toISOString(), locale)} ${formatTime(timeline.chatUntil.toISOString(), locale)}` })}</p>
      </header>
      <section className="card space-y-3 p-5" data-testid="table-chat">
        {messages.length === 0 ? <p className="text-sm text-muted">{t("empty")}</p> : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${m.uid === me ? "ms-auto bg-brand-100 text-ink" : "bg-cream text-ink"}`}>
                <span className="block text-xs font-semibold text-muted">{m.uid === me ? t("you") : m.firstName} · {formatTime(m.createdAt, locale)}</span>
                <span className="whitespace-pre-wrap">{m.text}</span>
              </li>
            ))}
          </ul>
        )}
        <TableChatForm groupId={groupId} open={open} />
      </section>
    </div>
  );
}
