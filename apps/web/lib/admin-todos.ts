import { bookingClosesAt, revealAtFor } from "@thecommunity/shared";
import { adminDate } from "@/components/admin/ui";
import type { AdminData } from "@/lib/data/admin";

const HOUR = 3_600_000;
export type SessionTodo = { tone: "red" | "amber" | "green" | "gray"; text: string; anchor?: string };
type S = AdminData["sessions"][number];

/**
 * Ce qu'il reste à faire pour UNE date (page « À faire » et page de la date) : date à risque, lieux (attribution,
 * lieux à relancer), tables, check-in. `anchor` : la partie de la page de la date où le traiter.
 */
export function sessionTodos(d: AdminData, s: S): SessionTodo[] {
  const e = d.experiences.get(s.experienceId);
  const todos: SessionTodo[] = [];
  if (!e) return todos;
  const now = d.now.getTime();
  const start = new Date(s.startAt).getTime();
  const grouped = e.bookingMode === "social_dinner" || e.bookingMode === "group";
  const secret = e.venue.revealPolicy === "on_group_reveal";
  const hasVenue = (d.sessionVenues[s.id]?.length ?? 0) > 0 || Boolean(e.venue.name);
  const revealAt = revealAtFor(s.startAt).getTime();
  const closesAt = bookingClosesAt(new Date(s.startAt), e).getTime();
  if (s.risk?.status === "at_risk") todos.push({ tone: "red", text: "À risque : décision à prendre", anchor: "risque" });
  else if (s.risk?.status === "proposed") todos.push({ tone: "amber", text: "Autre date proposée : réponses en cours", anchor: "risque" });
  const reqs = d.venueRequests.filter((r) => r.sessionId === s.id);
  const pending = reqs.filter((r) => r.status === "sent").length;
  if (pending) todos.push({ tone: start - now < 8 * HOUR ? "red" : "amber", text: `${pending} lieu${pending > 1 ? "x" : ""} à relancer ou appeler`, anchor: "lieux" });
  const a = s.allocation;
  if (secret && a?.status === "short") todos.push({ tone: "red", text: `${a.missing ?? "?"} table${(a.missing ?? 0) > 1 ? "s" : ""} sans lieu`, anchor: "lieux" });
  else if (secret && a?.status === "requested") todos.push({ tone: "amber", text: `Lieux : ${a.confirmed ?? 0} / ${a.needed ?? "?"} tables confirmées`, anchor: "lieux" });
  else if (secret && a?.status === "confirmed") todos.push({ tone: "green", text: "Lieux confirmés", anchor: "lieux" });
  else if (secret && a?.status === "manual") todos.push({ tone: "gray", text: "Lieux choisis à la main", anchor: "lieux" });
  else if (secret && !hasVenue) {
    if (s.venueCapacity === 0) todos.push({ tone: "red", text: "Aucun lieu compatible : ventes bloquées", anchor: "lieux" });
    todos.push(now >= closesAt && s.seatsConfirmed > 0 ? { tone: "red", text: "Attribution des lieux non lancée", anchor: "lieux" } : { tone: "gray", text: `Lieux choisis à la fermeture (${adminDate(new Date(closesAt).toISOString())})`, anchor: "lieux" });
    if (now >= revealAt && s.groupsStatus !== "revealed") todos.push({ tone: "red", text: "Révélation bloquée : lieux non confirmés", anchor: "lieux" });
  } else if (secret && !(d.sessionVenues[s.id]?.length)) {
    todos.push({ tone: "gray", text: `Lieu habituel : ${e.venue.name}`, anchor: "lieux" });
  }
  if (s.groupsNeedReview) todos.push({ tone: "amber", text: "Table à valider", anchor: "tables" });
  const min = e.groupConfig?.minSize ?? 0;
  if (grouped && min > 0 && s.seatsConfirmed < min && start - now < 24 * HOUR && !s.risk) todos.push({ tone: "red", text: `Minimum non atteint : ${s.seatsConfirmed} inscrit${s.seatsConfirmed > 1 ? "s" : ""} pour ${min} par table`, anchor: "risque" });
  if (grouped && s.seatsConfirmed > 0) {
    const g = s.groupsStatus ?? "none";
    todos.push(
      g === "revealed" ? { tone: "green", text: "Tables révélées", anchor: "tables" }
      : g === "validated" ? { tone: "amber", text: "Tables à révéler", anchor: "tables" }
      : g === "proposed" ? { tone: "amber", text: "Composition des tables à valider", anchor: "tables" }
      : { tone: start - now < 24 * HOUR ? "amber" : "gray", text: "Tables à composer", anchor: "tables" },
    );
  }
  if (start - now < 3 * HOUR && start - now > -3 * HOUR) {
    const conf = d.reservations.filter((r) => r.sessionId === s.id && (r.status === "confirmed" || r.status === "attended"));
    const arrived = conf.filter((r) => r.arrivedAt || r.status === "attended").length;
    todos.push({ tone: "gray", text: `Check-in : ${arrived} / ${conf.length} arrivé${arrived > 1 ? "s" : ""}`, anchor: "participants" });
  }
  return todos;
}

/** Nom lisible d'une date : rendez-vous et gamme si c'en est un. */
export function sessionTitle(d: AdminData, s: S, rvTitles?: Map<string, string>): string {
  const e = d.experiences.get(s.experienceId);
  if (!e) return "Date";
  const tier = e.venueTier ? ` · ${e.venueTier.charAt(0).toUpperCase()}${e.venueTier.slice(1)}` : "";
  const rv = (e as { rendezvousId?: string | null; rendezvousKind?: string | null }).rendezvousId;
  const rotation = (e as { rendezvousKind?: string | null }).rendezvousKind === "rotation";
  // Activité du samedi : le nom de l'activité ; autres rendez-vous : le nom du rendez-vous et la gamme.
  const name = rv && !rotation ? rvTitles?.get(rv) || e.title.fr : e.title.fr;
  return `${name}${tier}`;
}
