import { COMMISSION_SCOPE_LABELS, DEFAULT_COMMISSION_PERCENT, resolveCommission } from "@thecommunity/shared";
import { CommissionRuleForm, RuleToggle } from "@/components/admin/finance-actions";
import { adminDate, Badge, Card, DemoNote, dh, PageHeader, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { getAdminOrganizers } from "@/lib/data/admin-organizers";
import { getCommissionRules } from "@/lib/data/finance";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Commissions" };

/** Étape 21 — règles de commission : globale, catégorie, organisateur, activité, avec date d'effet. */
export default async function CommissionsPage() {
  const [{ rules, isDemo }, d, { organizers }, me] = await Promise.all([getCommissionRules(), getAdminData(), getAdminOrganizers(), FIREBASE_ENABLED ? requireAdmin() : Promise.resolve(null)]);
  const names: Record<string, string> = {
    ...Object.fromEntries(d.categories.map((c) => [c.id, c.name.fr])),
    ...Object.fromEntries(organizers.map((o) => [o.id, o.name])),
    ...Object.fromEntries([...d.experiences.values()].map((e) => [e.id, e.title.fr])),
  };
  const today = d.now.toISOString().slice(0, 10);
  const current = resolveCommission(rules, { experienceId: "-", organizerId: "-", categoryId: "-", at: today });
  const targets = {
    category: d.categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, label: c.name.fr })),
    organizer: organizers.filter((o) => o.status === "approved" || o.status === "suspended").map((o) => ({ id: o.id, label: o.name })),
    experience: [...d.experiences.values()].filter((e) => e.organizerId).map((e) => ({ id: e.id, label: `${e.title.fr} (${e.organizerSnapshot?.name ?? ""})` })),
  };
  return (
    <>
      <PageHeader title="Commissions" subtitle={`Taux général aujourd'hui : ${current.ratePercent} %${current.ruleId ? "" : ` (par défaut, aucune règle : ${DEFAULT_COMMISSION_PERCENT} %)`}. La règle la plus précise l'emporte : activité, puis organisateur, puis catégorie, puis générale.`} />
      {isDemo && <div className="mb-4"><DemoNote>Démonstration : deux règles d&apos;exemple. Le taux est copié sur chaque réservation au moment où elle est faite : un changement ne touche jamais les réservations existantes.</DemoNote></div>}
      <Card title="Nouvelle règle" className="mb-5">
        <CommissionRuleForm targets={targets} live={!isDemo} canEdit={isDemo || me?.role === "superadmin"} />
        {!isDemo && me?.role !== "superadmin" && <p className="mt-2 text-xs text-muted">Réservé aux super-admins.</p>}
      </Card>
      <Card title={`Règles (${rules.length})`}>
        {rules.length === 0 ? (
          <p className="text-sm text-muted">Aucune règle : le taux par défaut ({DEFAULT_COMMISSION_PERCENT} %) s&apos;applique.</p>
        ) : (
          <Table head={["S'applique à", "Taux", "À partir du", "Note", "État", ""]}>
            {rules.map((r) => (
              <tr key={r.id} data-testid="commission-rule">
                <td>{COMMISSION_SCOPE_LABELS[r.scope]}{r.targetId ? ` : ${names[r.targetId] ?? r.targetId}` : ""}</td>
                <td className="tabular-nums">{r.ratePercent} %{r.fixedPerSeat ? ` + ${dh(r.fixedPerSeat)} / place` : ""}</td>
                <td className="whitespace-nowrap">{adminDate(`${r.effectiveFrom}T12:00:00Z`, false)}</td>
                <td className="text-sm text-muted">{r.note}</td>
                <td><Badge tone={r.active === false ? "gray" : r.effectiveFrom > today ? "amber" : "green"}>{r.active === false ? "Désactivée" : r.effectiveFrom > today ? "À venir" : "En vigueur"}</Badge></td>
                <td className="text-end">{(isDemo || me?.role === "superadmin") && <RuleToggle ruleId={r.id} active={r.active !== false} live={!isDemo} />}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
