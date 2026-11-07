import { GrantMembershipForm, MembershipPlanForm, RevokeMembershipButton } from "@/components/admin/membership-admin";
import { adminDate, Badge, Card, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getAdminMembership } from "@/lib/data/admin-membership";

export const metadata = { title: "Abonnement" };

/** Abonnement annuel : réglages de la formule, abonnés, cadeaux et retraits (journalisés). */
export default async function MembershipAdminPage() {
  const { plan, members, revenue, isDemo, users } = await getAdminMembership();
  const active = members.filter((m) => m.active);
  return (
    <>
      <PageHeader title="Abonnement" subtitle={plan?.isActive ? "Proposé sur le site" : "Non proposé pour le moment (réglez puis cochez « Proposer l'abonnement »)"} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Membres actifs" value={String(active.length)} />
        <StatTile label="Revenus des abonnements" value={dh(revenue)} />
        <StatTile label="Prix annuel" value={plan ? dh(plan.price.amount) : "—"} />
        <StatTile label="Réduction" value={plan ? `${plan.discountPercent} %` : "—"} hint={plan?.earlyAccessHours ? `Accès anticipé ${plan.earlyAccessHours} h` : "Sans accès anticipé"} />
      </div>
      <Card title="Formule" className="mt-6">
        <MembershipPlanForm plan={plan} live={!isDemo} />
      </Card>
      {!isDemo && (
        <>
          <Card title="Offrir un abonnement" className="mt-6">
            <GrantMembershipForm users={users} />
          </Card>
          <Card title={`Abonnés (${members.length})`} className="mt-6">
            <Table head={["Membre", "E-mail", "Origine", "Début", "Échéance", "Statut", ""]} caption="Abonnés">
              {members.map((m) => (
                <tr key={m.uid}>
                  <td className="font-medium text-ink">{m.name || "—"}</td>
                  <td className="text-muted">{m.email}</td>
                  <td>{m.source === "gift" ? "Offert" : "Payé"}</td>
                  <td className="whitespace-nowrap text-muted">{adminDate(m.startAt, false)}</td>
                  <td className="whitespace-nowrap">{adminDate(m.endAt, false)}</td>
                  <td><Badge tone={m.active ? "green" : m.status === "revoked" ? "red" : "gray"}>{m.active ? "Actif" : m.status === "revoked" ? "Retiré" : "Expiré"}</Badge></td>
                  <td>{m.active && <RevokeMembershipButton uid={m.uid} name={m.name || m.email} />}</td>
                </tr>
              ))}
            </Table>
            <p className="mt-3 text-xs text-muted">Pas de prélèvement automatique : chaque membre renouvelle lui-même (possible 30 jours avant l&apos;échéance). Les remboursements d&apos;abonnement se traitent au cas par cas.</p>
          </Card>
        </>
      )}
    </>
  );
}
