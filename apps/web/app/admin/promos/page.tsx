import { Badge, Card, dh, FillBar, PageHeader, Table, adminDate } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Codes promo" };

export default async function PromosAdminPage() {
  const d = await getAdminData();
  return (
    <>
      <PageHeader title="Codes promo" />
      <Card>
        <Table head={["Code", "Remise", "Conditions", "Valable jusqu'au", "Utilisations", "Statut"]} caption="Codes promo">
          {d.promos.map((p) => (
            <tr key={p.code}>
              <td className="font-mono font-semibold">{p.code}</td>
              <td className="tabular-nums">{p.type === "percent" ? `−${p.value} %` : `−${dh(p.value)}`}</td>
              <td className="text-muted">{p.firstBookingOnly ? "Première réservation uniquement" : "Toutes réservations"}</td>
              <td className="whitespace-nowrap">{adminDate(`${p.validTo}T12:00:00Z`, false)}</td>
              <td><FillBar value={p.redemptionsCount} max={p.maxRedemptions} label={`${p.redemptionsCount} utilisations sur ${p.maxRedemptions}`} /></td>
              <td><Badge tone={p.isActive ? "green" : "gray"}>{p.isActive ? "Actif" : "Expiré"}</Badge></td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-muted">Création de codes et application au paiement : étape 5f du plan.</p>
      </Card>
    </>
  );
}
