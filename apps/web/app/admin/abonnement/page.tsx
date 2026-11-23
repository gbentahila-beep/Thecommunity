import { AbsenceActions, GrantMembershipForm, MembershipPlanForm, RevokeMembershipButton } from "@/components/admin/membership-admin";
import { adminDate, Badge, Card, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getAdminMembership } from "@/lib/data/admin-membership";
import { offerLabel, planOffers } from "@thecommunity/shared";

export const metadata = { title: "Carnet et Pass" };

/** Carnet et Pass (docs/22 § 17.I) : offres, pass, carnets, absences et suspensions ; cadeaux et corrections journalisés. */
export default async function MembershipAdminPage() {
  const { plan, members, carnets, absences, revenue, isDemo, users } = await getAdminMembership();
  const active = members.filter((m) => m.active);
  const suspended = members.filter((m) => m.suspendedUntil);
  const offers = planOffers(plan);
  return (
    <>
      <PageHeader title="Carnet et Pass" subtitle={plan?.isActive === false ? "Non proposés pour le moment" : "Proposés sur le site"} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Pass actifs" value={String(active.length)} hint={suspended.length ? `${suspended.length} suspendu${suspended.length > 1 ? "s" : ""}` : undefined} />
        <StatTile label="Carnets avec crédits" value={String(carnets.filter((c) => c.usable > 0).length)} hint={`${carnets.reduce((n, c) => n + c.usable, 0)} crédits en circulation`} />
        <StatTile label="Revenus carnet et pass" value={dh(revenue)} />
        <StatTile label="Offres proposées" value={String(offers.length)} hint={offers.map((o) => `${offerLabel(o)} ${dh(o.price.amount)}`).join(" · ")} />
      </div>
      <Card title="Offres" className="mt-6">
        <MembershipPlanForm plan={plan} live={!isDemo} />
      </Card>
      {!isDemo && (
        <>
          <Card title="Offrir un pass ou des crédits" className="mt-6">
            <GrantMembershipForm users={users} />
          </Card>
          <Card title={`Pass (${members.length})`} className="mt-6">
            <Table head={["Personne", "E-mail", "Origine", "Fin", "Absences (90 j)", "Statut", ""]} caption="Pass">
              {members.map((m) => (
                <tr key={m.uid}>
                  <td className="font-medium text-ink">{m.name || "—"}</td>
                  <td className="text-muted">{m.email}</td>
                  <td>{m.source === "gift" ? "Offert" : "Payé"}</td>
                  <td className="whitespace-nowrap">{adminDate(m.endAt, false)}</td>
                  <td>{m.absences}</td>
                  <td><Badge tone={m.suspendedUntil ? "amber" : m.active ? "green" : m.status === "revoked" ? "red" : "gray"}>{m.suspendedUntil ? `Suspendu jusqu'au ${adminDate(m.suspendedUntil, false)}` : m.active ? "Actif" : m.status === "revoked" ? "Retiré" : "Expiré"}</Badge></td>
                  <td className="space-y-1">
                    {m.suspendedUntil && <AbsenceActions uid={m.uid} suspended />}
                    {m.active && <RevokeMembershipButton uid={m.uid} name={m.name || m.email} />}
                  </td>
                </tr>
              ))}
            </Table>
            <p className="mt-3 text-xs text-muted">Pas de prélèvement automatique. 2 réservations à venir au maximum avec le pass ; pas de check-in = absence ; à la deuxième absence (90 jours), pass suspendu 14 jours. Les anciens abonnés gardent leur durée restante sous forme de pass.</p>
          </Card>
          <Card title={`Carnets (${carnets.length})`} className="mt-6">
            <Table head={["Personne", "E-mail", "Crédits", "Valables jusqu'au"]} caption="Carnets">
              {carnets.map((c) => (
                <tr key={c.uid}>
                  <td className="font-medium text-ink">{c.name || "—"}</td>
                  <td className="text-muted">{c.email}</td>
                  <td>{c.usable}{c.credits !== c.usable ? ` (${c.credits} expirés)` : ""}</td>
                  <td className="whitespace-nowrap">{adminDate(c.expiresAt, false)}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title={`Absences récentes (${absences.length})`} className="mt-6">
            <Table head={["Personne", "Événement", "Date", "Pass", ""]} caption="Absences">
              {absences.map((a) => (
                <tr key={a.reservationId}>
                  <td className="font-medium text-ink">{a.name || "—"}</td>
                  <td>{a.title}</td>
                  <td className="whitespace-nowrap">{adminDate(a.startAt)}</td>
                  <td>{a.pass ? "Oui" : "Non"}</td>
                  <td><AbsenceActions reservationId={a.reservationId} /></td>
                </tr>
              ))}
            </Table>
            <p className="mt-3 text-xs text-muted">Notée automatiquement 1 h après le début quand il n&apos;y a pas eu de check-in (événements sans billet). Annuler une absence la retire du compte de la personne et lève la suspension qui en venait.</p>
          </Card>
        </>
      )}
    </>
  );
}
