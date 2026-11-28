import { bookingClosesAt, isTablesFlow, recapAtFor, revealAtFor, RISK_CHECK_HOURS, tablesOutOfBounds, tablesTimeline, venueCallAt, venueOptionsAt } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";
import { dateTimeFr } from "../invoices/format";
import { sessionVenues, venueByGroup } from "../experiences/venues";
import { loadSession, proposeGroupsCore, reconcileGroups, revealGroupsCore, validateProposedGroups } from "../groups/groups";
import { cancelReservationCore } from "../reservations/cancel-reservation";
import { cancelRequests, finalizeAllocation, isAllocated, processPendingRequests, requestFixedVenue, runAllocation, sendFinalMessage, sendRecap, venueCapacity } from "./allocation";
import { teamAlert } from "./team";
import { markAbsences } from "../membership/absences";
import { sendArrivalChecks } from "../notify/arrival";

const HOUR = 3_600_000;
const SYSTEM = "system";

const DIET_FR: Record<string, string> = { vegetarian: "végétarien", vegan: "végan", pescatarian: "pesco-végétarien", gluten_free: "sans gluten", lactose_free: "sans lactose", other: "régime particulier" };

/**
 * Cycle de vie d'une date (docs/22 § 17.H, timeline du 24/11), toutes les 15 minutes :
 * 1. date « à risque » si le minimum n'est pas atteint (rendez-vous : à la fermeture ; alerte équipe, décision 46) ;
 * 2. veille 15h : demandes d'option aux restaurants (inscrits + une table de marge) ; lieu fixe : demande de confirmation ;
 * 3. relances (1 h) et demandes sans réponse (2 h) → autre lieu ; veille 18h30 : l'équipe appelle les lieux manquants ;
 * 4. veille 20h30, fermeture : nombre final aux lieux (tables en trop libérées, manquantes demandées) ;
 * 5. veille 21h30 : tables composées dans les lieux confirmés, lieu et résumé de table dévoilés ;
 * 6. jour J 11h (la veille 21h30 pour un début avant 14h) : récapitulatif à chaque lieu ; 1 h avant : mise à jour si changement ;
 * 7. propositions « autre date / regroupement » arrivées à échéance : remboursement de qui n'a pas répondu.
 */
export async function runTablesAutomation(now = Date.now()) {
  const out = { risk: 0, allocated: 0, revealed: 0, finalized: 0, fixed: 0, closedProposals: 0, ...(await processPendingRequests(now)) };
  const snap = await db.collection("sessions")
    .where("startAt", ">", Timestamp.fromMillis(now - 2 * HOUR))
    .where("startAt", "<=", Timestamp.fromMillis(now + 36 * HOUR))
    .get();
  const exps = new Map<string, DocumentData>();
  for (const doc of snap.docs) {
    const s = doc.data();
    if (!["published", "full"].includes(s.status)) continue;
    const e = exps.get(s.experienceId) ?? (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
    exps.set(s.experienceId, e);
    try {
      await stepSession(doc.id, s, e, now, out);
    } catch (err) {
      logger.error("Automatisation d'une date", { sessionId: doc.id, error: String(err) });
    }
  }
  if (Object.values(out).some((n) => n > 0)) logger.info("Cycle de vie des dates", out);
  return out;
}

/** Une seule date (tests, ou action de l'équipe) : mêmes étapes que la tâche planifiée. */
export async function runSessionAutomation(id: string, now = Date.now()) {
  const out: Record<string, number> = { risk: 0, allocated: 0, revealed: 0, finalized: 0, fixed: 0, closedProposals: 0, ...(await processPendingRequests(now, id)) };
  const s = (await db.doc(`sessions/${id}`).get()).data();
  if (!s || !["published", "full"].includes(s.status)) return out;
  const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
  await stepSession(id, s, e, now, out);
  return out;
}

async function stepSession(id: string, s: DocumentData, e: DocumentData, now: number, out: Record<string, number>) {
  const start = (s.startAt as Timestamp).toDate();
  const t = tablesTimeline(start);
  const closesAt = bookingClosesAt(start, e).getTime();
  const people = Number(s.seatsConfirmed ?? 0);
  const title = String(e.title?.fr ?? "");
  const when = dateTimeFr(start);
  const sessRef = db.doc(`sessions/${id}`);

  // 0. Pas de check-in = absence, 1 h après le début (docs/22 § 17.I, décision 8).
  if (now >= start.getTime() + HOUR) {
    out.absences = (out.absences ?? 0) + (await markAbsences(id, s, e, now));
    return;
  }

  // Audit 23/11 : à l'heure du début, « Vous êtes arrivé·e ? » à qui n'a pas fait son check-in.
  if (now >= start.getTime() && !s.arrivalCheckAt) out.arrivalChecks = (out.arrivalChecks ?? 0) + (await sendArrivalChecks(id, s, e, now));

  // 7. Proposition arrivée à échéance : qui n'a pas répondu est remboursé ; date vidée → annulée.
  if (s.risk?.status === "proposed" && s.risk.deadline && (s.risk.deadline as Timestamp).toMillis() <= now) {
    const res = await db.collection("reservations").where("sessionId", "==", id).where("status", "==", "confirmed").get();
    for (const r of res.docs.filter((d) => d.get("proposal")?.status === "pending")) {
      await cancelReservationCore({ reservationId: r.id, by: "admin", actorUid: SYSTEM, refundMode: "full", reason: "risk_no_answer" }).catch((err) => logger.error("Remboursement (proposition)", { id: r.id, error: String(err) }));
      await r.ref.update({ "proposal.status": "expired" });
    }
    const left = (await sessRef.get()).data()?.seatsConfirmed ?? 0;
    await sessRef.update({ "risk.status": "closed", ...(left === 0 ? { status: "cancelled", cancelledReason: "risk" } : {}) });
    if (left === 0) await cancelRequests(id);
    out.closedProposals++;
    return;
  }

  // Lot C (docs/25) : à la fermeture d'une date de rendez-vous, gamme voisine pour qui l'a acceptée (toutes gammes
  // de la date ensemble, une seule fois), avant le contrôle du minimum et l'attribution des lieux.
  if (e.rendezvousId && e.venueTier && s.rendezvousId && now >= closesAt && !s.tierFallbackAt) {
    const { applyTierFallback } = await import("../rendezvous/tier-fallback");
    out.tierMoved = (out.tierMoved ?? 0) + (await applyTierFallback(String(s.rendezvousId), s.startAt as Timestamp));
    return;
  }

  // 1. La veille : à risque si le minimum d'une table n'est pas atteint (rendez-vous : à la fermeture, après la
  // gamme voisine, puisque les réservations restent ouvertes jusque-là).
  const min = Number(e.groupConfig?.minSize ?? 0);
  const riskFrom = e.rendezvousId && e.venueTier ? closesAt : start.getTime() - RISK_CHECK_HOURS * HOUR;
  if (min > 0 && people > 0 && !s.risk && now >= riskFrom && people < min) {
    await sessRef.update({ risk: { status: "at_risk", at: FieldValue.serverTimestamp() } });
    await teamAlert({ sessionId: id, key: "risk", subject: `À risque : ${title}`, paragraphs: [`${when} : ${people} inscrit${people > 1 ? "s" : ""} pour un minimum de ${min} par table.`, "Maintenir, proposer une autre date, regrouper avec un événement compatible ou annuler : décidez depuis la page de la date. Personne n'est déplacé sans son accord."] });
    out.risk++;
    return;
  }
  const riskPending = s.risk?.status === "at_risk" || s.risk?.status === "proposed";

  // 2. Veille 15h : demande au lieu fixe d'une activité (nombre d'inscrits du moment ; nombre final à la fermeture).
  const optionsAt = venueOptionsAt(start).getTime();
  if (!isAllocated(e) && !s.fixedRequestAt && people > 0 && now >= Math.min(optionsAt, closesAt)) {
    const partnerId = (await db.doc(`experiences/${s.experienceId}/private/economics`).get()).data()?.partnerId;
    await sessRef.update({ fixedRequestAt: FieldValue.serverTimestamp() });
    if (partnerId) {
      await requestFixedVenue(id, s, e, partnerId);
      out.fixed++;
    }
  }
  if (!isAllocated(e) && s.fixedRequestAt && !s.fixedFinalAt && now >= closesAt) {
    await sessRef.update({ fixedFinalAt: FieldValue.serverTimestamp() });
    out.fixedFinal = (out.fixedFinal ?? 0) + (await fixedFinalCount(id, people));
  }

  if (isAllocated(e)) {
    // Plafond de vente tenu à jour pour l'affichage (le serveur de réservation le recalcule de toute façon).
    if (now < closesAt) {
      const cap = await venueCapacity(id, s, e);
      if (cap !== null && cap !== s.venueCapacity) await sessRef.update({ venueCapacity: cap });
      if (cap !== null && people + Number(s.seatsHeld ?? 0) >= cap) await teamAlert({ sessionId: id, key: "capacity_full", subject: `Capacité des lieux atteinte : ${title}`, paragraphs: [`${when} : ${people} inscrits, les lieux compatibles ne peuvent pas en accueillir plus. Les ventes sont arrêtées (liste d'attente).`, "Ajoutez un lieu ou de la capacité (fiche du lieu) pour rouvrir des places."] });
    }
    // Lieux choisis par l'équipe (date ou lieu habituel) : pas d'attribution automatique.
    // (Les lieux confirmés par l'attribution sont aussi rangés comme lieux de la date : ce n'est pas un choix manuel.)
    const manual = s.allocation?.status === "manual" || (!s.allocation && (await sessionVenues(id, s.experienceId, e)).venues.length > 0);
    // 2 bis. Veille 15h, entre les deux services : options aux restaurants, réservations encore ouvertes.
    if (!manual && !s.allocation && people > 0 && !riskPending && now >= optionsAt && now < closesAt) {
      await runAllocation(id, SYSTEM, { option: true });
      out.allocated++;
      return;
    }
    // 4. Fermeture : nombre final (ou première attribution si la date n'en a pas encore eu).
    if (!manual && now >= closesAt && people > 0) {
      if (!s.allocation || !s.allocation.finalAt) {
        if (riskPending) {
          await teamAlert({ sessionId: id, key: "risk_closure", subject: `Décision attendue : ${title}`, paragraphs: [`${when} : les réservations sont fermées et la date est à risque. Décidez (maintenir, autre date, regroupement, annulation) pour finaliser les lieux.`] });
        } else if (!s.allocation) {
          await runAllocation(id, SYSTEM);
          await sessRef.update({ "allocation.finalAt": FieldValue.serverTimestamp(), "allocation.phase": "final" });
          out.allocated++;
        } else {
          await finalizeAllocation(id);
          out.finalCount = (out.finalCount ?? 0) + 1;
        }
        return;
      }
    }
    // 3 bis. Veille 18h30 : des lieux n'ont toujours pas confirmé → l'équipe appelle (une fois par date).
    if (s.allocation && !["confirmed", "manual"].includes(String(s.allocation.status)) && !s.venueCallAlertAt && now >= venueCallAt(start).getTime() && now < start.getTime()) {
      await sessRef.update({ venueCallAlertAt: FieldValue.serverTimestamp() });
      const confirmedTables = Number(s.allocation.confirmed ?? 0);
      await teamAlert({ sessionId: id, key: "venue_call", subject: `Lieux à appeler : ${title}`, paragraphs: [`${when} : ${confirmedTables} / ${s.allocation.needed ?? "?"} tables confirmées. Appelez les lieux qui n'ont pas répondu (ou choisissez un autre lieu) avant ${now < closesAt ? "la fermeture de 20h30" : "le dévoilement de 21h30"}.`], path: `/admin/sessions/${id}#lieux` });
    }
  }

  // 5. Dévoilement (veille 21h30) : seulement avec des lieux confirmés (ou choisis par l'équipe).
  const revealAt = isTablesFlow(e) ? t.revealAt.getTime() : Math.max(revealAtFor(start).getTime(), closesAt);
  if (isAllocated(e) && now >= revealAt && s.groupsStatus !== "revealed" && people > 0 && !riskPending) {
    const { venues } = await sessionVenues(id, s.experienceId, e);
    if (venues.length === 0 || (s.allocation && !["confirmed", "manual"].includes(s.allocation.status))) {
      await teamAlert({ sessionId: id, key: "reveal_blocked", subject: `Dévoilement bloqué : ${title}`, paragraphs: [`${when} : les lieux ne sont pas tous confirmés. Confirmez les demandes (appel ou WhatsApp) : le dévoilement partira aussitôt.`] });
      return;
    }
    if (e.groupConfig) {
      const count = venues.every((v) => Number(v.tables ?? 0) > 0) ? venues.reduce((n, v) => n + Number(v.tables), 0) : undefined;
      // Composition automatique jamais retouchée : refaite avec les inscrits définitifs (fermeture à 20h30).
      // Composition enregistrée par l'équipe : gardée, seulement remise d'accord (annulations, nouveaux inscrits).
      if (!s.groupsStatus || s.groupsStatus === "none" || s.groupsStatus === "proposed") await proposeGroupsCore(id, SYSTEM, count);
      else if (s.groupsStatus === "validated") await reconcileGroups(id, SYSTEM);
      if ((await sessRef.get()).data()?.groupsStatus === "proposed") {
        const sizes = await validateProposedGroups(id);
        const odd = tablesOutOfBounds(sizes, e.groupConfig);
        if (odd.length) {
          await sessRef.update({ groupsNeedReview: true });
          await teamAlert({ sessionId: id, key: "tables_review", subject: `Table à valider : ${title}`, paragraphs: [`${when} : ${odd.map((i) => `table ${i + 1} (${sizes[i]} personnes)`).join(", ")} hors des limites (${e.groupConfig.minSize} à ${e.groupConfig.maxSize}). Validez ou corrigez depuis la page des tables.`], path: `/admin/sessions/${id}/groupes` });
        }
      }
      await revealGroupsCore(id, SYSTEM);
    } else {
      await revealVenueOnly(id, venues[0]!, s);
    }
    out.revealed++;
    return;
  }

  // 6. Récapitulatif à chaque lieu : jour J 11h (la veille 21h30 pour un début avant 14h), après le dévoilement.
  const ready = s.groupsStatus === "revealed" || !e.groupConfig;
  const recapAt = Math.max(recapAtFor(start).getTime(), isAllocated(e) ? revealAt : closesAt);
  if (now >= recapAt && !s.tablesFinalAt && people > 0 && ready) {
    await sessRef.update({ tablesFinalAt: FieldValue.serverTimestamp() });
    if (e.groupConfig && s.groupsStatus === "revealed") await reconcileAndAlert(id, e, title, when, "tables_recap");
    await recapToVenues(id, s, e);
    out.finalized++;
    return;
  }
  // 6 bis. 1 h avant : tables remises d'accord avec les dernières annulations ; mise à jour au lieu seulement si changement.
  if (now >= t.finalAt.getTime() && s.tablesFinalAt && !s.recapCheckAt && people > 0 && ready) {
    await sessRef.update({ recapCheckAt: FieldValue.serverTimestamp() });
    if (e.groupConfig && s.groupsStatus === "revealed") await reconcileAndAlert(id, e, title, when, "tables_final");
    out.recapUpdates = (out.recapUpdates ?? 0) + (await recapToVenues(id, s, e, { onlyIfChanged: true }));
  }
}

/** Tables remises d'accord avec les réservations ; alerte si une table sort des limites. */
async function reconcileAndAlert(id: string, e: DocumentData, title: string, when: string, key: string) {
  const { sizes } = await reconcileGroups(id, SYSTEM);
  const odd = tablesOutOfBounds(sizes, e.groupConfig);
  if (odd.length) await teamAlert({ sessionId: id, key, subject: `Table trop petite ou trop grande : ${title}`, paragraphs: [`${when} : après les dernières annulations, ${odd.map((i) => `table ${i + 1} (${sizes[i]} personnes)`).join(", ")}.`], path: `/admin/sessions/${id}/groupes` });
}

/** Lieu fixe : nombre final à la fermeture des réservations, si le nombre d'inscrits a changé depuis la demande. */
async function fixedFinalCount(id: string, people: number): Promise<number> {
  const reqs = (await db.collection("venueRequests").where("sessionId", "==", id).where("fixed", "==", true).get()).docs.filter((d) => ["sent", "confirmed"].includes(String(d.get("status"))));
  let n = 0;
  for (const d of reqs) {
    const before = { tables: Number(d.get("tables") ?? 1), people: Number(d.get("people") ?? 0) };
    if (before.people === people) continue;
    await d.ref.update({ people, history: FieldValue.arrayUnion({ at: Timestamp.now(), event: "final", before, people }) });
    await sendFinalMessage(d.id, before);
    n++;
  }
  return n;
}

/** Activité à lieu attribué sans tables composées : le lieu est révélé à chacun. */
async function revealVenueOnly(id: string, v: { name: string; address: string; cuisine?: string | null; cuisineI18n?: { ar?: string; en?: string } | null; geo?: { lat: number; lng: number } | null }, s: DocumentData) {
  const res = await db.collection("reservations").where("sessionId", "==", id).where("status", "==", "confirmed").get();
  const batch = db.batch();
  for (const r of res.docs) {
    batch.update(r.ref, { venue: { name: v.name, address: v.address, ...(v.cuisine ? { cuisine: v.cuisine } : {}), ...(v.cuisineI18n ? { cuisineI18n: v.cuisineI18n } : {}), ...(v.geo ? { geo: v.geo } : {}) }, updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection(`users/${r.get("userId")}/notifications`).doc(), { type: "venue_revealed", title: { fr: "Votre lieu est révélé", ar: "تم الكشف عن مكانك", en: "Your venue is revealed" }, body: { fr: `${v.name}, ${v.address}.`, ar: `${v.name}، ${v.address}.`, en: `${v.name}, ${v.address}.` }, link: `/espace/reservations/${r.id}`, createdAt: FieldValue.serverTimestamp() });
  }
  batch.update(db.doc(`sessions/${id}`), { groupsStatus: "revealed", groupsRevealedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  void s;
}

/** Récapitulatif par lieu : tables qui y vont, prénoms (+ invités), régimes et allergies partagés avec le lieu. */
async function recapToVenues(id: string, s: DocumentData, e: DocumentData, opts: { onlyIfChanged?: boolean } = {}): Promise<number> {
  const reqs = (await db.collection("venueRequests").where("sessionId", "==", id).where("status", "==", "confirmed").get()).docs;
  if (reqs.length === 0) return 0;
  let sent = 0;
  const { participants } = e.groupConfig ? await loadSession(id) : { participants: [] as Awaited<ReturnType<typeof loadSession>>["participants"] };
  const groups = e.groupConfig ? (await db.collection("groups").where("sessionId", "==", id).get()).docs : [];
  const { venues, cuisine, cuisineI18n } = await sessionVenues(id, s.experienceId, e);
  const byGroup = venueByGroup(groups.map((g) => ({ id: g.id, label: String(g.get("label") ?? "") })), venues, cuisine, cuisineI18n);
  const byUid = new Map(participants.map((p) => [p.uid, p]));
  const nameOf = (uid: string) => {
    const p = byUid.get(uid);
    return p ? `${String(p.user.firstName ?? "Membre")}${p.seats > 1 ? ` (+${p.seats - 1})` : ""}` : "Membre";
  };
  const noteOf = (uid: string) => {
    const pr = byUid.get(uid)?.reservation.preferences;
    if (!pr || pr.shareWithVenue !== true) return null;
    const bits = [pr.diet && pr.diet !== "none" ? DIET_FR[pr.diet] ?? pr.diet : "", String(pr.allergies ?? "").trim()].filter(Boolean);
    return bits.length ? `${String(byUid.get(uid)!.user.firstName ?? "")} : ${bits.join(", ")}` : null;
  };
  for (const r of reqs) {
    const name = String(r.get("partnerName") ?? "");
    const mine = groups.filter((g) => byGroup.get(g.id)?.name === name).sort((a, b) => String(a.get("label")).localeCompare(String(b.get("label")), "fr", { numeric: true }));
    const tables = mine.map((g) => ({ label: String(g.get("label")), names: ((g.get("memberIds") as string[]) ?? []).map(nameOf) }));
    const notes = mine.flatMap((g) => ((g.get("memberIds") as string[]) ?? []).map(noteOf)).filter((x): x is string => Boolean(x));
    if (!e.groupConfig) {
      const res = await db.collection("reservations").where("sessionId", "==", id).where("status", "==", "confirmed").get();
      const users = res.docs.length ? await db.getAll(...res.docs.map((d) => db.doc(`users/${d.get("userId")}`))) : [];
      tables.push({ label: "Participants", names: res.docs.map((d, i) => `${String(users[i]?.get("firstName") ?? "Membre")}${Number(d.get("seats") ?? 1) > 1 ? ` (+${Number(d.get("seats")) - 1})` : ""}`) });
    }
    if (await sendRecap(r.id, tables, notes, opts)) sent++;
  }
  return sent;
}

export const tablesAutomation = onSchedule({ schedule: "every 15 minutes", region: REGION, timeZone: "Africa/Casablanca", timeoutSeconds: 300 }, async () => {
  await runTablesAutomation();
  // Activité du samedi : alerte 48 h avant l'ouverture de chaque samedi (à confirmer ou à changer).
  const { rotationOpeningAlerts } = await import("../rendezvous/rotation");
  await rotationOpeningAlerts().catch((err) => logger.error("Alertes d'ouverture du samedi", { error: String(err) }));
});
