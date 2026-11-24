import { ageBand, ageOn, bookingClosesAt, pricingOf, recapAtFor, refundAmountFor, revealAtFor, seatsAvailable, unitWord, venueCallAt, venueOptionsAt, venueRequestText, whatsappMobileUrl, whatsappWebUrl } from "@thecommunity/shared";
import { AllocationCard, RiskCard } from "@/components/admin/allocation-card";
import { SITE_URL } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CsvExportButton } from "@/components/admin/csv-export";
import { SessionVenuesForm } from "@/components/admin/session-venues-form";
import { CancelSessionButton, ReservationAdminActions } from "@/components/admin/reservation-admin-actions";
import { DIET_LABELS, LANGUAGE_LABELS, MODE_LABELS, RESERVATION_STATUS } from "@/components/admin/labels";
import { adminDate, Badge, Card, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getCancellationPolicies, policyOf } from "@/lib/data/policies";
import { RequestActions } from "@/components/admin/request-actions";
import { BookingHoldActions, ReportActions } from "@/components/admin/report-actions";
import { sessionTitle, sessionTodos } from "@/lib/admin-todos";
import { getAdminRequests } from "@/lib/data/admin-requests";
import { getRendezvousTitles } from "@/lib/data/admin-todo";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

const REPORT_REASONS: Record<string, string> = { behaviour: "Comportement inapproprié", harassment: "Harcèlement", safety: "Sécurité", other: "Autre" };
const GROUP_STATUS: Record<string, [string, "green" | "amber" | "gray"]> = { revealed: ["Révélées", "green"], validated: ["Validées, à révéler", "amber"], proposed: ["Proposées, à valider", "amber"], none: ["À composer", "gray"] };

export const metadata = { title: "Date" };

export default async function SessionDetailPage({ params }: PageProps<"/admin/sessions/[id]">) {
  const { id } = await params;
  const [d, policies, allRequests, rvTitles] = await Promise.all([getAdminData(), getCancellationPolicies(), getAdminRequests(), getRendezvousTitles()]);
  const s = d.sessions.find((x) => x.id === id) ?? d.recentSessions.find((x) => x.id === id);
  if (!s) notFound();
  const e = d.experiences.get(s.experienceId)!;
  const unknownUser = { firstName: "Compte", lastName: "supprimé", email: "", phone: "", birthDate: "2000-01-01", languages: [] as string[] };
  const rows = d.reservations
    .filter((r) => r.sessionId === s.id)
    .map((r) => ({ r, u: d.usersById.get(r.userId) ?? { ...unknownUser, uid: r.userId } }))
    .sort((a, b) => a.u.lastName.localeCompare(b.u.lastName));
  const start = new Date(s.startAt);
  const canCheckIn = d.now.getTime() >= start.getTime() - 3 * 3_600_000;
  const cancelled = s.status === "cancelled";
  const otherDates = d.sessions.filter((x) => x.experienceId === s.experienceId && x.id !== s.id && (x.status === "published" || x.status === "full"));
  const activeCount = rows.filter((x) => x.r.status === "confirmed" || x.r.status === "pending_payment").length;
  const confirmed = rows.filter((x) => x.r.status === "confirmed");
  const waitlist = (d.waitlists[s.id] ?? []).map((uid) => d.usersById.get(uid)!);
  const grouped = e.bookingMode === "social_dinner" || e.bookingMode === "group";
  // docs/22, décision 15 : lieu secret → lieux réservés automatiquement la veille à 15h, ou choisis à la main.
  const secret = e.venue.revealPolicy === "on_group_reveal";
  const venues = d.sessionVenues[s.id] ?? [];
  const revealAt = revealAtFor(start);
  // docs/22 § 17.H : demandes aux lieux de cette date (attribution automatique, ou lieu fixe).
  const requests = d.venueRequests.filter((r) => r.sessionId === s.id).sort((a, b) => a.round - b.round || a.partnerName.localeCompare(b.partnerName));
  const tierLabel = (t: string | null) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : null);
  const allocationRows = requests.map((r) => {
    const link = `${SITE_URL}/partenaire/demande/${r.id}?t=${r.token}`;
    const info = { venue: r.partnerName, title: r.title, when: adminDate(r.startAt), format: r.format, tier: tierLabel(r.tier), tables: r.tables, people: r.people, unit: r.unit, reference: r.reference, link };
    return {
      id: r.id, partnerName: r.partnerName, tables: r.tables, people: r.people, unitWord: unitWord(r.unit, r.tables), status: r.status, round: r.round, reference: r.reference, fixed: r.fixed,
      sentLabel: r.sentAt ? adminDate(r.sentAt) : "", responseLabel: r.respondedAt ? `${r.responseBy === "team" ? "confirmé par l'équipe" : "réponse du lieu"} ${adminDate(r.respondedAt)}` : r.remindedAt ? `relancé ${adminDate(r.remindedAt)}` : "",
      phone: r.partnerWhatsapp, waWeb: whatsappWebUrl(r.partnerWhatsapp, venueRequestText(info)), waMobile: whatsappMobileUrl(r.partnerWhatsapp, venueRequestText(info)),
      recapWaWeb: r.recapText ? whatsappWebUrl(r.partnerWhatsapp, r.recapText) : null, link,
    };
  });
  const alloc = s.allocation;
  const closesAt = bookingClosesAt(start, e);
  const allocationSummary = alloc
    ? alloc.status === "manual" ? "Lieux choisis à la main par l'équipe (ci-dessous) : l'attribution automatique est arrêtée pour cette date."
    : `${alloc.people ?? s.seatsConfirmed} inscrits · ${alloc.needed ?? "?"} table${(alloc.needed ?? 0) > 1 ? "s" : ""} nécessaire${(alloc.needed ?? 0) > 1 ? "s" : ""} · ${alloc.confirmed ?? 0} confirmée${(alloc.confirmed ?? 0) > 1 ? "s" : ""}${alloc.missing ? ` · ${alloc.missing} sans lieu disponible` : ""}${alloc.status === "confirmed" ? " · tous les lieux sont confirmés" : ""}.`
    : `Les restaurants sont réservés automatiquement la veille à 15h (${adminDate(venueOptionsAt(start).toISOString())}), d'après les fiches des lieux. ${s.venueCapacity != null ? `Capacité des lieux compatibles : ${s.venueCapacity} personnes.` : ""}`;
  // Timeline du 24/11 : le déroulé de la date, étape par étape (fait / à venir).
  const nowMs = d.now.getTime();
  const step = (label: string, at: Date, done: boolean, detail: string) => ({ label, at: adminDate(at.toISOString()), done, late: !done && nowMs >= at.getTime(), detail });
  const timeline = secret
    ? [
        step("Options aux restaurants", venueOptionsAt(start), Boolean(alloc), "Inscrits du moment + une table de marge."),
        step("Appel des lieux sans réponse", venueCallAt(start), alloc?.status === "confirmed" || alloc?.status === "manual", "Alerte à l'équipe s'il manque des confirmations."),
        step("Fermeture des réservations", closesAt, nowMs >= closesAt.getTime(), "Gamme voisine, minimum, nombre final envoyé aux lieux."),
        step("Dévoilement du lieu et des tables", revealAt, s.groupsStatus === "revealed", "Notification et e-mail aux participants."),
        step("Récapitulatif aux lieux", recapAtFor(start), Boolean(s.tablesFinalAt), "Prénoms, allergies ; mise à jour 1 h avant si changement."),
      ]
    : requests.length > 0 || e.venue.revealPolicy !== "on_group_reveal"
      ? [
          step("Demande au lieu", venueOptionsAt(start), Boolean(s.fixedRequestAt) || requests.length > 0, "Nombre d'inscrits du moment."),
          step("Fermeture des réservations", closesAt, nowMs >= closesAt.getTime(), "Nombre final envoyé au lieu s'il a changé."),
          step("Récapitulatif au lieu", new Date(Math.max(recapAtFor(start).getTime(), closesAt.getTime())), Boolean(s.tablesFinalAt), "Prénoms et allergies."),
        ]
      : [];
  const riskOptions = s.risk?.status === "at_risk"
    ? d.sessions.filter((x) => x.id !== s.id && (x.status === "published" || x.status === "full") && new Date(x.startAt).getTime() > d.now.getTime() && seatsAvailable(x) >= s.seatsConfirmed && (x.experienceId === s.experienceId || (() => { const oe = d.experiences.get(x.experienceId); return Boolean(oe && (oe.templateId || oe.subcategoryId) === (e.templateId || e.subcategoryId) && (oe.venueTier ?? null) === (e.venueTier ?? null)); })()))
      .slice(0, 20).map((x) => ({ id: x.id, label: `${x.experienceId === s.experienceId ? "Autre date" : `Regrouper avec ${d.experiences.get(x.experienceId)?.title.fr ?? ""}`} · ${adminDate(x.startAt)} (${x.seatsConfirmed} inscrits)` }))
    : [];
  const riskSummary = s.risk ? ({ at_risk: `${s.seatsConfirmed} inscrit${s.seatsConfirmed > 1 ? "s" : ""} pour un minimum de ${e.groupConfig?.minSize ?? "?"} par table. Personne n'est déplacé sans son accord.`, kept: "Date maintenue par l'équipe.", proposed: `Proposition envoyée${s.risk.deadline ? `, réponses jusqu'au ${adminDate(s.risk.deadline)}` : ""} : chacun accepte ou est remboursé ; sans réponse, remboursé.`, closed: "Proposition terminée." } as Record<string, string>)[s.risk.status] ?? "" : "";
  const twoPart = pricingOf(e).model !== "online_only" || rows.some((x) => x.r.onSite);
  const onSiteRows = rows.filter((x) => x.r.onSite && (x.r.status === "confirmed" || x.r.status === "attended"));
  const onSiteExpected = onSiteRows.reduce((a, x) => a + (x.r.onSite?.amount ?? 0), 0);
  const onSitePaid = onSiteRows.filter((x) => x.r.onSite?.status === "paid_on_site");
  // Back-office simplifié (24/11) : tout ce qui concerne cette date, sur cette page.
  const todos = sessionTodos(d, s).filter((t) => t.tone === "red" || t.tone === "amber");
  const pendingRequests = allRequests.pending.filter((x) => x.request.sessionId === s.id);
  const groups = d.groups.filter((g) => g.sessionId === s.id).sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  const nameOf = (uid: string) => { const u = d.usersById.get(uid); return u ? `${u.firstName} ${u.lastName}`.trim() : "Compte supprimé"; };
  type ReportRow = { id: string; reporter: string; reported: string; reportedUid: string; reason: string; details: string; status: string; hold: boolean; during: boolean };
  let reports: ReportRow[] = [];
  if (FIREBASE_ENABLED && !d.isDemo) {
    const snap = await adminDb().collection("reports").where("sessionId", "==", s.id).get();
    reports = snap.docs.map((x) => ({
      id: x.id, reporter: nameOf(String(x.get("reporterUid") ?? "")), reported: x.get("reportedUid") ? nameOf(String(x.get("reportedUid"))) : "Non identifié·e", reportedUid: String(x.get("reportedUid") ?? ""),
      reason: REPORT_REASONS[String(x.get("reason"))] ?? String(x.get("reason") ?? ""), details: String(x.get("details") ?? ""), status: String(x.get("status") ?? ""),
      hold: Boolean(x.get("reportedUid") && (d.usersById.get(String(x.get("reportedUid"))) as { bookingHold?: { active?: boolean } } | undefined)?.bookingHold?.active), during: x.get("duringEvent") === true,
    }));
  }
  const openReports = reports.filter((r) => r.status === "open").length;
  const sections = [
    ...(s.risk ? [{ id: "risque", label: "Minimum" }] : []),
    { id: "participants", label: `Participants (${rows.length})` },
    ...(pendingRequests.length ? [{ id: "demandes", label: `Demandes (${pendingRequests.length})` }] : []),
    ...(waitlist.length ? [{ id: "attente", label: `Liste d'attente (${waitlist.length})` }] : []),
    ...(secret || requests.length > 0 ? [{ id: "lieux", label: "Lieux" }] : []),
    ...(grouped ? [{ id: "tables", label: `Tables (${groups.length})` }] : []),
    { id: "signalements", label: `Signalements (${openReports || reports.length})` },
  ];
  const csv: (string | number)[][] = [
    ["Prénom", "Nom", "E-mail", "Téléphone", "Tranche d'âge", "Langues", "Langues de table", "Régime", "Allergies", "Places", "Payé en ligne (DH)", "Sur place (DH)", "Part partenaire", "Code promo", "Statut", "Réservation"],
    ...rows.map(({ r, u }) => [
      u.firstName, u.lastName, u.email, u.phone, ageBand(ageOn(u.birthDate)), u.languages.join(", "),
      (r.preferences?.languages ?? []).join(", "), DIET_LABELS[r.preferences?.diet ?? "none"] ?? "", r.preferences?.allergies ?? "",
      r.seats, (r.total / 100).toFixed(2), r.onSite ? (r.onSite.amount != null ? (r.onSite.amount / 100).toFixed(2) : "consommation") : "",
      r.onSite ? (r.onSite.status === "paid_on_site" ? "réglée" : "à régler") : "", r.promoCode ?? "", RESERVATION_STATUS[r.status][0], r.id,
    ]),
  ];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/programme" className="text-brand-900">← Programme</Link></p>
      <PageHeader
        title={sessionTitle(d, s, rvTitles)}
        subtitle={[adminDate(s.startAt), e.district, MODE_LABELS[e.bookingMode]].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link href={`/admin/experiences/${e.id}`} className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">Modifier l&apos;événement</Link>
            <CsvExportButton filename={`participants-${s.id}.csv`} rows={csv} log={d.isDemo ? undefined : { kind: "participants", targetId: s.id }} />
            <Link href={`/admin/sessions/${s.id}/supports`} className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">Supports imprimés</Link>
            <Link href={`/admin/sessions/${s.id}/fiche-lieu`} className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">
              Fiche pour le lieu
            </Link>
          </>
        }
      />
      {cancelled && (
        <p role="status" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          Date annulée : les participants ont été remboursés et prévenus.
        </p>
      )}
      {(todos.length > 0 || pendingRequests.length > 0 || openReports > 0) && (
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-card" data-testid="session-todo">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">À faire pour cette date</p>
          <ul className="flex flex-wrap gap-1.5">
            {openReports > 0 && <li><a href="#signalements"><Badge tone="red">{openReports} signalement(s) à traiter</Badge></a></li>}
            {pendingRequests.length > 0 && <li><a href="#demandes"><Badge tone="amber">{pendingRequests.length} demande(s) de participation</Badge></a></li>}
            {todos.map((t) => <li key={t.text}><a href={`#${t.anchor ?? "participants"}`}><Badge tone={t.tone}>{t.text}</Badge></a></li>)}
          </ul>
        </div>
      )}
      <nav aria-label="Sur cette page" className="sticky top-0 z-10 -mx-1 mb-4 flex gap-1.5 overflow-x-auto bg-cream/95 px-1 py-2 backdrop-blur print:hidden" data-testid="session-sections">
        {sections.map((x) => <a key={x.id} href={`#${x.id}`} className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ink/80 shadow-card hover:text-ink">{x.label}</a>)}
      </nav>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Places confirmées" value={`${s.seatsConfirmed} / ${s.capacity}`} />
        <StatTile label="Places libres" value={String(seatsAvailable(s))} />
        <StatTile label="Liste d'attente" value={String(waitlist.length)} />
        <StatTile label={twoPart ? "Encaissé en ligne" : "Encaissé"} value={dh(confirmed.reduce((a, x) => a + x.r.total, 0))} />
      </div>
      {twoPart && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-ink" data-testid="on-site-summary">
          Part partenaire, réglée sur place (jamais encaissée par nous) :{" "}
          {onSiteRows.some((x) => x.r.onSite?.amount == null) ? "consommation libre" : <strong>{dh(onSiteExpected)} attendus</strong>} · {onSitePaid.length} / {onSiteRows.length} réglée{onSitePaid.length > 1 ? "s" : ""}.
        </p>
      )}
      {s.risk && (
        <Card title={s.risk.status === "at_risk" ? "Date à risque" : "Minimum non atteint"} className="mt-6 scroll-mt-16" id="risque">
          <RiskCard sessionId={s.id} status={s.risk.status} options={riskOptions} live={!d.isDemo} summary={riskSummary} />
        </Card>
      )}
      <Card title={`Participants (${rows.length} réservations)`} className="mt-6 scroll-mt-16" id="participants">
        <Table head={["Participant", "Contact", "Âge", "Langues", "Accueil", "Places", twoPart ? "En ligne" : "Montant", ...(twoPart ? ["Sur place"] : []), "Statut", ...(d.isDemo ? [] : ["Actions"])]} caption="Participants">
          {rows.map(({ r, u }) => (
            <tr key={r.id}>
              <td className="font-medium text-ink">
                <Link href={`/admin/utilisateurs?q=${encodeURIComponent(u.email)}`} className="hover:text-brand-900">{u.firstName} {u.lastName}</Link>
              </td>
              <td className="text-muted"><span className="block">{u.email}</span><span className="block tabular-nums">{u.phone}</span></td>
              <td className="tabular-nums">{ageBand(ageOn(u.birthDate))}</td>
              <td>{u.languages.map((l) => LANGUAGE_LABELS[l]).join(" · ")}</td>
              <td className="min-w-36 text-sm">
                {r.preferences && (r.preferences.diet !== "none" || r.preferences.allergies) ? (
                  <>
                    {r.preferences.diet !== "none" && <span className="block">{DIET_LABELS[r.preferences.diet] ?? r.preferences.diet}</span>}
                    {r.preferences.allergies && <span className="block text-red-800">Allergie : {r.preferences.allergies}</span>}
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
                {r.preferences?.languages?.length ? <span className="block text-xs text-muted">Table : {r.preferences.languages.map((l) => LANGUAGE_LABELS[l]).join(" · ")}</span> : null}
              </td>
              <td className="tabular-nums">{r.seats}{r.promoCode && <span className="block font-mono text-xs text-muted">{r.promoCode}</span>}</td>
              <td className="tabular-nums">{dh(r.total)}</td>
              {twoPart && (
                <td className="tabular-nums">
                  {r.onSite ? (
                    <>
                      {r.onSite.amount != null ? dh(r.onSite.amount) : "Conso."}
                      <span className={`block text-xs ${r.onSite.status === "paid_on_site" ? "text-emerald-800" : "text-muted"}`}>{r.onSite.status === "paid_on_site" ? "Réglée" : "À régler"}</span>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              )}
              <td><Badge tone={RESERVATION_STATUS[r.status][1]}>{RESERVATION_STATUS[r.status][0]}</Badge></td>
              {!d.isDemo && (
                <td className="min-w-48">
                  <ReservationAdminActions
                    reservationId={r.id}
                    name={u.firstName}
                    status={r.status}
                    canCheckIn={canCheckIn && !cancelled}
                    moveTargets={otherDates
                      .filter((x) => seatsAvailable(x) >= r.seats)
                      .map((x) => ({ id: x.id, label: `${adminDate(x.startAt)} · ${seatsAvailable(x)} place${seatsAvailable(x) > 1 ? "s" : ""} libre${seatsAvailable(x) > 1 ? "s" : ""}` }))}
                    amounts={{
                      full: dh(r.total - (r.refundedAmount ?? 0)),
                      policy: dh(Math.min(r.total - (r.refundedAmount ?? 0), refundAmountFor(r.cancellationPolicy ?? policyOf(policies, e.cancellationPolicyId), r.total, start, d.now))),
                      paid: r.status === "confirmed" && r.total > 0,
                    }}
                    onSite={r.onSite}
                  />
                </td>
              )}
            </tr>
          ))}
        </Table>
        {!d.isDemo && (
          <p className="mt-3 text-xs text-muted">
            Pointage ouvert 3 h avant le début. Annuler : remboursement intégral par défaut, motif journalisé. Déplacer : vers une autre date de la même expérience.
          </p>
        )}
      </Card>
      {pendingRequests.length > 0 && (
        <Card title={`Demandes de participation (${pendingRequests.length})`} className="mt-6 scroll-mt-16" id="demandes">
          <ul className="divide-y divide-line">
            {pendingRequests.map(({ request: r, person: p, history: h }) => (
              <li key={r.id} className="py-3 text-sm">
                <p className="font-semibold text-ink">{p.firstName} {p.lastName}{p.age ? <span className="font-normal text-muted"> · {p.age} ans</span> : null}{p.profession ? <span className="font-normal text-muted"> · {p.profession}</span> : null}</p>
                {r.message && <p className="mt-1 whitespace-pre-line text-ink/80">« {r.message} »</p>}
                <p className="mt-1 text-xs text-muted">{h.attended} participation(s) · {h.noShows} absence(s) · demande du {adminDate(r.createdAt)}</p>
                <div className="mt-2"><RequestActions requestId={r.id} name={p.firstName || "cette personne"} /></div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {waitlist.length > 0 && (
        <Card title="Liste d'attente (ordre d'inscription)" className="mt-6 scroll-mt-16" id="attente">
          <ol className="list-decimal space-y-1 ps-5 text-sm">
            {waitlist.map((u) => <li key={u.uid}>{u.firstName} {u.lastName} <span className="text-muted">· {u.email}</span></li>)}
          </ol>
          <p className="mt-3 text-xs text-muted">Dès qu&apos;une place se libère, elle est proposée automatiquement à la première personne (4 h pour payer), puis à la suivante.</p>
        </Card>
      )}
      {(secret || requests.length > 0) && (
        <Card title={secret ? "Lieux : attribution automatique" : "Lieu : confirmation"} className="mt-6 scroll-mt-16" id="lieux">
          {timeline.length > 0 && (
            <ol className="mb-4 grid gap-2 sm:grid-cols-5" data-testid="session-timeline">
              {timeline.map((t) => (
                <li key={t.label} className={`rounded-xl border p-2.5 text-xs ${t.done ? "border-emerald-200 bg-emerald-50" : t.late ? "border-amber-300 bg-amber-50" : "border-line bg-white"}`}>
                  <p className="font-semibold text-ink">{t.done ? "✓ " : ""}{t.label}</p>
                  <p className="tabular-nums text-muted">{t.at}</p>
                  <p className="mt-0.5 text-muted">{t.detail}</p>
                </li>
              ))}
            </ol>
          )}
          <AllocationCard sessionId={s.id} summary={secret ? allocationSummary : "Le lieu fixe reçoit une demande la veille à 15h, le nombre final à la fermeture des réservations, puis le récapitulatif (le jour même à 11h, ou la veille au soir pour un début avant 14h)."} rows={allocationRows} live={!d.isDemo} canRun={secret && s.seatsConfirmed > 0 && alloc?.status !== "manual" && d.now.getTime() < start.getTime()} />
        </Card>
      )}
      {secret && (
        <Card title={`Lieu${venues.length > 1 ? "x" : ""} de cette date (à la main)`} className="mt-6 scroll-mt-16" id={secret && requests.length === 0 ? "lieux" : undefined}>
          <p className="mb-3 text-sm text-muted" data-testid="venue-deadline">
            {venues.length ? `Révélé aux participants le ${adminDate(revealAt.toISOString())}.` : `Facultatif : les lieux confirmés par l'attribution apparaissent ici. Pour choisir vous-même (la révélation part le ${adminDate(revealAt.toISOString())}), renseignez-les : l'attribution automatique s'arrête alors pour cette date.`}
          </p>
          <details open={venues.length > 0}>
            <summary className="mb-3 cursor-pointer text-sm font-semibold text-brand-900">{venues.length > 0 ? "Modifier les lieux" : "Choisir les lieux à la main"}</summary>
          <SessionVenuesForm
            sessionId={s.id}
            initial={venues}
            defaultVenue={e.venue.name ? { name: e.venue.name, address: e.venue.address } : null}
            partners={d.partners.filter((p) => p.status !== "archived").map((p) => ({ id: p.id, name: p.name, address: p.address ?? "", coords: p.coords ?? (p.geo ? `${p.geo.lat}, ${p.geo.lng}` : ""), tables: Math.max(0, ...(p.slots ?? []).map((x) => Number(x.units) || 0)) }))}
            live={!d.isDemo}
            past={d.now.getTime() > start.getTime()}
          />
          </details>
        </Card>
      )}
      {grouped && (
        <Card title="Tables" className="mt-6 scroll-mt-16" id="tables" actions={<Link href={`/admin/sessions/${s.id}/groupes`} className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">{groups.length ? "Voir et modifier les tables" : "Composer les tables"}</Link>}>
          <p className="mb-2 text-sm"><Badge tone={(GROUP_STATUS[s.groupsStatus ?? "none"] ?? GROUP_STATUS.none!)[1]}>{(GROUP_STATUS[s.groupsStatus ?? "none"] ?? GROUP_STATUS.none!)[0]}</Badge>{s.groupsNeedReview && <span className="ms-2"><Badge tone="amber">À revoir (changement depuis)</Badge></span>}</p>
          {groups.length === 0 ? (
            <p className="text-sm text-muted">Les tables sont composées automatiquement avant la révélation du lieu ; vous pouvez les composer ou les modifier à la main.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {groups.map((g) => <li key={g.id} className="rounded-xl bg-cream px-3 py-2"><span className="font-semibold text-ink">{g.label}</span> <span className="text-muted">· {g.memberIds.length} pers.</span><span className="block text-xs text-muted">{g.memberIds.map((u) => d.usersById.get(u)?.firstName ?? "?").join(", ")}</span></li>)}
            </ul>
          )}
        </Card>
      )}
      <Card title={`Signalements (${reports.length})`} className="mt-6 scroll-mt-16" id="signalements">
        {reports.length === 0 ? (
          <p className="text-sm text-muted">Aucun signalement pour cette date.</p>
        ) : (
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <p className="font-semibold text-ink">
                  {r.reported} <span className="font-normal text-muted">· signalé·e par {r.reporter} · {r.reason}</span>
                  {r.during && <span className="ms-2"><Badge tone="amber">Pendant l&apos;expérience</Badge></span>}
                  <span className="ms-2"><Badge tone={r.status === "open" ? "amber" : r.status === "resolved" ? "green" : "gray"}>{r.status === "open" ? "À traiter" : r.status === "resolved" ? "Traité" : "Sans suite"}</Badge></span>
                </p>
                <p className="mt-1 text-ink/80">{r.details}</p>
                <div className="mt-2 space-y-2">{r.status === "open" && <ReportActions reportId={r.id} />}{r.reportedUid && <BookingHoldActions uid={r.reportedUid} active={r.hold} />}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {!d.isDemo && !cancelled && start.getTime() > d.now.getTime() - 86_400_000 && (
        <div className="mt-8 border-t border-line pt-6">
          <CancelSessionButton sessionId={s.id} participants={activeCount} />
        </div>
      )}
    </>
  );
}
