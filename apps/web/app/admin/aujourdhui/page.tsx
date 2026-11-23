import { bookingClosesAt, revealAtFor } from "@thecommunity/shared";
import Link from "next/link";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Aujourd'hui" };

const HOUR = 3_600_000;
type Todo = { tone: "red" | "amber" | "green" | "gray"; text: string };

/**
 * Aujourd'hui (docs/22 § 11 et § 17.H) : les dates des 7 prochains jours et ce qu'il reste à faire — date à risque,
 * attribution des lieux, lieux à appeler, tables à valider, check-ins en cours.
 */
export default async function TodayPage() {
  const d = await getAdminData();
  const now = d.now.getTime();
  const sessions = d.sessions
    .filter((s) => s.status !== "cancelled" && new Date(s.startAt).getTime() > now - 3 * HOUR && new Date(s.startAt).getTime() < now + 7 * 24 * HOUR)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const rows = sessions.map((s) => {
    const e = d.experiences.get(s.experienceId);
    const start = new Date(s.startAt).getTime();
    const todos: Todo[] = [];
    if (!e) return { s, e, todos };
    const grouped = e.bookingMode === "social_dinner" || e.bookingMode === "group";
    const secret = e.venue.revealPolicy === "on_group_reveal";
    const hasVenue = (d.sessionVenues[s.id]?.length ?? 0) > 0 || Boolean(e.venue.name);
    const revealAt = revealAtFor(s.startAt).getTime();
    const closesAt = bookingClosesAt(new Date(s.startAt), e.bookingMode).getTime();
    // docs/22 § 17.H : date à risque, attribution des lieux, appels à passer.
    if (s.risk?.status === "at_risk") todos.push({ tone: "red", text: "À risque : décision à prendre" });
    else if (s.risk?.status === "proposed") todos.push({ tone: "amber", text: "Autre date proposée : réponses en cours" });
    const reqs = d.venueRequests.filter((r) => r.sessionId === s.id);
    const pending = reqs.filter((r) => r.status === "sent").length;
    if (pending) todos.push({ tone: start - now < 8 * HOUR ? "red" : "amber", text: `${pending} lieu${pending > 1 ? "x" : ""} à relancer ou appeler` });
    const a = s.allocation;
    if (secret && a?.status === "short") todos.push({ tone: "red", text: `${a.missing ?? "?"} table${(a.missing ?? 0) > 1 ? "s" : ""} sans lieu` });
    else if (secret && a?.status === "requested") todos.push({ tone: "amber", text: `Lieux : ${a.confirmed ?? 0} / ${a.needed ?? "?"} tables confirmées` });
    else if (secret && a?.status === "confirmed") todos.push({ tone: "green", text: "Lieux confirmés" });
    else if (secret && a?.status === "manual") todos.push({ tone: "gray", text: "Lieux choisis à la main" });
    else if (secret && !hasVenue) {
      if (s.venueCapacity === 0) todos.push({ tone: "red", text: "Aucun lieu compatible : ventes bloquées" });
      todos.push(now >= closesAt && s.seatsConfirmed > 0 ? { tone: "red", text: "Attribution des lieux non lancée" } : { tone: "gray", text: `Lieux choisis à la fermeture (${adminDate(new Date(closesAt).toISOString())})` });
      if (now >= revealAt && s.groupsStatus !== "revealed") todos.push({ tone: "red", text: "Révélation bloquée : lieux non confirmés" });
    } else if (secret && !(d.sessionVenues[s.id]?.length)) {
      todos.push({ tone: "gray", text: `Lieu habituel : ${e.venue.name}` });
    }
    if (s.groupsNeedReview) todos.push({ tone: "amber", text: "Table à valider" });
    const min = e.groupConfig?.minSize ?? 0;
    if (grouped && min > 0 && s.seatsConfirmed < min && start - now < 24 * HOUR) todos.push({ tone: "red", text: `Minimum non atteint : ${s.seatsConfirmed} inscrit${s.seatsConfirmed > 1 ? "s" : ""} pour ${min} par table` });
    if (grouped && s.seatsConfirmed > 0) {
      const g = s.groupsStatus ?? "none";
      todos.push(
        g === "revealed" ? { tone: "green", text: "Tables révélées" }
        : g === "validated" ? { tone: "amber", text: "Tables à révéler" }
        : g === "proposed" ? { tone: "amber", text: "Composition des tables à valider" }
        : { tone: start - now < 24 * HOUR ? "amber" : "gray", text: "Tables à composer" },
      );
    }
    if (start - now < 3 * HOUR) {
      const conf = d.reservations.filter((r) => r.sessionId === s.id && (r.status === "confirmed" || r.status === "attended"));
      const arrived = conf.filter((r) => r.arrivedAt || r.status === "attended").length;
      todos.push({ tone: "gray", text: `Check-in : ${arrived} / ${conf.length} arrivé${arrived > 1 ? "s" : ""}` });
    }
    return { s, e, todos };
  });
  const urgent = rows.filter((r) => r.todos.some((t) => t.tone === "red")).length;
  return (
    <>
      <PageHeader title="Aujourd'hui" subtitle={`${sessions.length} date${sessions.length > 1 ? "s" : ""} dans les 7 prochains jours${urgent ? ` · ${urgent} à traiter en urgence` : ""}`} />
      <Card>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucune date dans les 7 prochains jours.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="today-list">
            {rows.map(({ s, e, todos }) => (
              <li key={s.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-48 flex-1">
                  <Link href={`/admin/sessions/${s.id}`} className="font-semibold text-ink hover:text-brand-900">{e?.title.fr ?? "Date"}{e?.venueTier ? ` · ${e.venueTier.charAt(0).toUpperCase()}${e.venueTier.slice(1)}` : ""}</Link>
                  <p className="text-sm text-muted">{adminDate(s.startAt)} · {s.seatsConfirmed} / {s.capacity} places</p>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {todos.length === 0 ? <li><Badge tone="green">Rien à faire</Badge></li> : todos.map((t) => <li key={t.text}><Badge tone={t.tone}>{t.text}</Badge></li>)}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
