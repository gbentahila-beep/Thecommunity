import { bookingClosesAt, revealAtFor, venueCallAt, venueOptionsAt } from "@thecommunity/shared";
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
  // Relances automatiques jusqu'à la veille 18h30 ; ensuite, l'équipe appelle les lieux qui n'ont pas répondu.
  const callNow = now >= venueCallAt(s.startAt).getTime();
  if (pending) todos.push(callNow ? { tone: "red", text: `${pending} restaurant${pending > 1 ? "s" : ""} à appeler (sans réponse)`, anchor: "lieux" } : { tone: "gray", text: `${pending} demande${pending > 1 ? "s" : ""} en attente de réponse (relance automatique)`, anchor: "lieux" });
  const a = s.allocation;
  if (secret && a?.status === "short") todos.push({ tone: "red", text: `${a.missing ?? "?"} table${(a.missing ?? 0) > 1 ? "s" : ""} sans lieu`, anchor: "lieux" });
  else if (secret && a?.status === "requested") { if (!pending) todos.push({ tone: callNow ? "red" : "amber", text: `Lieux : ${a.confirmed ?? 0} / ${a.needed ?? "?"} tables confirmées`, anchor: "lieux" }); }
  else if (secret && a?.status === "confirmed") todos.push({ tone: "green", text: "Lieux confirmés", anchor: "lieux" });
  else if (secret && a?.status === "manual") todos.push({ tone: "gray", text: "Lieux choisis à la main", anchor: "lieux" });
  else if (secret && !hasVenue) {
    if (s.venueCapacity === 0) todos.push({ tone: "red", text: "Aucun lieu compatible : ventes bloquées", anchor: "lieux" });
    const optionsAt = venueOptionsAt(s.startAt).getTime();
    // Automatique (tâche toutes les 15 min) : rien à faire tant que la demande part normalement ; alerte seulement si
    // elle n'est toujours pas partie 45 min après l'heure prévue.
    const startedAt = Math.max(optionsAt, 0);
    todos.push(
      s.seatsConfirmed === 0 || now < startedAt ? { tone: "gray", text: `Restaurants demandés automatiquement la veille à 15h (${adminDate(new Date(optionsAt).toISOString())})`, anchor: "lieux" }
      : now < Math.min(startedAt + 45 * 60_000, closesAt) ? { tone: "gray", text: "Demande aux restaurants en cours (automatique)", anchor: "lieux" }
      : { tone: "red", text: "Restaurants pas encore demandés : lancez l'attribution", anchor: "lieux" },
    );
    if (now >= revealAt && s.groupsStatus !== "revealed") todos.push({ tone: "red", text: "Dévoilement bloqué : lieux non confirmés", anchor: "lieux" });
  } else if (secret && !(d.sessionVenues[s.id]?.length)) {
    todos.push({ tone: "gray", text: `Lieu habituel : ${e.venue.name}`, anchor: "lieux" });
  }
  if (s.groupsNeedReview) todos.push({ tone: "amber", text: "Table à valider", anchor: "tables" });
  const min = e.groupConfig?.minSize ?? 0;
  if (grouped && min > 0 && s.seatsConfirmed < min && start - now < 24 * HOUR && !s.risk) todos.push({ tone: "red", text: `Minimum non atteint : ${s.seatsConfirmed} inscrit${s.seatsConfirmed > 1 ? "s" : ""} pour ${min} par table`, anchor: "risque" });
  if (grouped && s.seatsConfirmed > 0) {
    const g = s.groupsStatus ?? "none";
    todos.push(
      g === "revealed" ? { tone: "green", text: "Tables dévoilées", anchor: "tables" }
      : g === "validated" ? (now < revealAt ? { tone: "gray", text: "Tables retouchées, dévoilées automatiquement", anchor: "tables" } : { tone: "amber", text: "Tables à dévoiler", anchor: "tables" })
      : g === "proposed" ? (now < revealAt ? { tone: "gray", text: "Tables composées, modifiables jusqu'au dévoilement", anchor: "tables" } : { tone: "amber", text: "Tables à dévoiler", anchor: "tables" })
      : now < revealAt ? { tone: "gray", text: "Tables composées dès que les lieux sont confirmés", anchor: "tables" }
      : { tone: "amber", text: "Tables pas encore dévoilées", anchor: "tables" },
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
