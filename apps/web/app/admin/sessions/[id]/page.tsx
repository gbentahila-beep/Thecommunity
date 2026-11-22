import { ageBand, ageOn, bookingClosesAt, pricingOf, refundAmountFor, revealAtFor, seatsAvailable, unitWord, venueRequestText, whatsappMobileUrl, whatsappWebUrl } from "@thecommunity/shared";
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

export const metadata = { title: "Participants" };

export default async function SessionDetailPage({ params }: PageProps<"/admin/sessions/[id]">) {
  const { id } = await params;
  const [d, policies] = await Promise.all([getAdminData(), getCancellationPolicies()]);
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
  // docs/22, décision 15 : lieu secret → lieu(x) renseigné(s) date par date, au plus tard 5 h avant.
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
  const closesAt = bookingClosesAt(start, e.bookingMode);
  const allocationSummary = alloc
    ? alloc.status === "manual" ? "Lieux choisis à la main par l'équipe (ci-dessous) : l'attribution automatique est arrêtée pour cette date."
    : `${alloc.people ?? s.seatsConfirmed} inscrits · ${alloc.needed ?? "?"} table${(alloc.needed ?? 0) > 1 ? "s" : ""} nécessaire${(alloc.needed ?? 0) > 1 ? "s" : ""} · ${alloc.confirmed ?? 0} confirmée${(alloc.confirmed ?? 0) > 1 ? "s" : ""}${alloc.missing ? ` · ${alloc.missing} sans lieu disponible` : ""}${alloc.status === "confirmed" ? " · tous les lieux sont confirmés" : ""}.`
    : `Les lieux sont choisis automatiquement à la fermeture des réservations (${adminDate(closesAt.toISOString())}), d'après les fiches des lieux. ${s.venueCapacity != null ? `Capacité des lieux compatibles : ${s.venueCapacity} personnes.` : ""}`;
  const riskOptions = s.risk?.status === "at_risk"
    ? d.sessions.filter((x) => x.id !== s.id && (x.status === "published" || x.status === "full") && new Date(x.startAt).getTime() > d.now.getTime() && seatsAvailable(x) >= s.seatsConfirmed && (x.experienceId === s.experienceId || (() => { const oe = d.experiences.get(x.experienceId); return Boolean(oe && (oe.templateId || oe.subcategoryId) === (e.templateId || e.subcategoryId) && (oe.venueTier ?? null) === (e.venueTier ?? null)); })()))
      .slice(0, 20).map((x) => ({ id: x.id, label: `${x.experienceId === s.experienceId ? "Autre date" : `Regrouper avec ${d.experiences.get(x.experienceId)?.title.fr ?? ""}`} · ${adminDate(x.startAt)} (${x.seatsConfirmed} inscrits)` }))
    : [];
  const riskSummary = s.risk ? ({ at_risk: `${s.seatsConfirmed} inscrit${s.seatsConfirmed > 1 ? "s" : ""} pour un minimum de ${e.groupConfig?.minSize ?? "?"} par table. Personne n'est déplacé sans son accord.`, kept: "Date maintenue par l'équipe.", proposed: `Proposition envoyée${s.risk.deadline ? `, réponses jusqu'au ${adminDate(s.risk.deadline)}` : ""} : chacun accepte ou est remboursé ; sans réponse, remboursé.`, closed: "Proposition terminée." } as Record<string, string>)[s.risk.status] ?? "" : "";
  const twoPart = pricingOf(e).model !== "online_only" || rows.some((x) => x.r.onSite);
  const onSiteRows = rows.filter((x) => x.r.onSite && (x.r.status === "confirmed" || x.r.status === "attended"));
  const onSiteExpected = onSiteRows.reduce((a, x) => a + (x.r.onSite?.amount ?? 0), 0);
  const onSitePaid = onSiteRows.filter((x) => x.r.onSite?.status === "paid_on_site");
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
      <p className="mb-2 text-sm"><Link href="/admin/sessions" className="text-brand-900">← Sessions</Link></p>
      <PageHeader
        title={e.title.fr}
        subtitle={[adminDate(s.startAt), e.district, MODE_LABELS[e.bookingMode]].filter(Boolean).join(" · ")}
        actions={
          <>
            <CsvExportButton filename={`participants-${s.id}.csv`} rows={csv} log={d.isDemo ? undefined : { kind: "participants", targetId: s.id }} />
            <Link href={`/admin/sessions/${s.id}/supports`} className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">Supports imprimés</Link>
            <Link href={`/admin/sessions/${s.id}/fiche-lieu`} className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">
              Fiche pour le lieu
            </Link>
            {grouped && (
              <Link href={`/admin/sessions/${s.id}/groupes`} className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                Composer les groupes
              </Link>
            )}
          </>
        }
      />
      {cancelled && (
        <p role="status" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          Date annulée : les participants ont été remboursés et prévenus.
        </p>
      )}
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
        <Card title={s.risk.status === "at_risk" ? "Date à risque" : "Minimum non atteint"} className="mt-6">
          <RiskCard sessionId={s.id} status={s.risk.status} options={riskOptions} live={!d.isDemo} summary={riskSummary} />
        </Card>
      )}
      {(secret || requests.length > 0) && (
        <Card title={secret ? "Attribution des lieux" : "Confirmation du lieu"} className="mt-6">
          <AllocationCard sessionId={s.id} summary={secret ? allocationSummary : "Le lieu fixe reçoit une demande de confirmation la veille, puis le récapitulatif 1 h avant."} rows={allocationRows} live={!d.isDemo} canRun={secret && s.seatsConfirmed > 0 && alloc?.status !== "manual" && d.now.getTime() < start.getTime()} />
        </Card>
      )}
      {secret && (
        <Card title={`Lieu de cette date${venues.length > 1 ? "s" : ""} (à la main)`} className="mt-6">
          <p className="mb-3 text-sm text-muted" data-testid="venue-deadline">
            {venues.length ? `Révélé aux participants le ${adminDate(revealAt.toISOString())}.` : `Facultatif : les lieux confirmés par l'attribution apparaissent ici. Pour choisir vous-même (la révélation part le ${adminDate(revealAt.toISOString())}), renseignez-les : l'attribution automatique s'arrête alors pour cette date.`}
          </p>
          <SessionVenuesForm
            sessionId={s.id}
            initial={venues}
            defaultVenue={e.venue.name ? { name: e.venue.name, address: e.venue.address } : null}
            partners={d.partners.filter((p) => p.status !== "archived").map((p) => ({ id: p.id, name: p.name, address: p.address ?? "", tables: Math.max(0, ...(p.slots ?? []).map((x) => Number(x.units) || 0)) }))}
            live={!d.isDemo}
            past={d.now.getTime() > start.getTime()}
          />
        </Card>
      )}
      <Card title={`Participants (${rows.length} réservations)`} className="mt-6">
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
      {!d.isDemo && !cancelled && start.getTime() > d.now.getTime() - 86_400_000 && (
        <div className="mt-6">
          <CancelSessionButton sessionId={s.id} participants={activeCount} />
        </div>
      )}
      {waitlist.length > 0 && (
        <Card title="Liste d'attente (ordre d'inscription)" className="mt-6">
          <ol className="list-decimal space-y-1 ps-5 text-sm">
            {waitlist.map((u) => <li key={u.uid}>{u.firstName} {u.lastName} <span className="text-muted">· {u.email}</span></li>)}
          </ol>
          <p className="mt-3 text-xs text-muted">Dès qu&apos;une place se libère, elle est proposée automatiquement à la première personne (4 h pour payer), puis à la suivante.</p>
        </Card>
      )}
    </>
  );
}
