import { PromoForm, type PromoFormValues } from "@/components/admin/promo-form";
import { adminDate, Badge, Card, dh, FillBar, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import type { PromoCode } from "@/lib/data/demo-admin";

export const metadata = { title: "Codes promo" };

const status = (p: PromoCode, today: string) =>
  !p.isActive ? (["Désactivé", "gray"] as const)
  : p.validTo < today ? (["Expiré", "gray"] as const)
  : p.redemptionsCount >= p.maxRedemptions ? (["Épuisé", "amber"] as const)
  : p.validFrom && p.validFrom > today ? (["À venir", "amber"] as const)
  : (["Actif", "green"] as const);

const toValues = (p: PromoCode): PromoFormValues => ({
  code: p.code, type: p.type, value: String(p.type === "percent" ? p.value : p.value / 100), validFrom: p.validFrom ?? "", validTo: p.validTo,
  maxRedemptions: String(p.maxRedemptions), firstBookingOnly: p.firstBookingOnly, isActive: p.isActive, description: p.description ?? "",
});

export default async function PromosAdminPage() {
  const d = await getAdminData();
  const today = d.now.toISOString().slice(0, 10);
  const empty: PromoFormValues = { code: "", type: "percent", value: "", validFrom: "", validTo: "", maxRedemptions: "100", firstBookingOnly: false, isActive: true, description: "" };
  const promos = [...d.promos].sort((a, b) => (a.isActive === b.isActive ? b.validTo.localeCompare(a.validTo) : a.isActive ? -1 : 1));
  return (
    <>
      <PageHeader title="Codes promo" subtitle={`${promos.filter((p) => status(p, today)[0] === "Actif").length} code(s) actif(s)`} />
      <Card className="mb-6">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-plum-900">+ Nouveau code promo</summary>
          <div className="mt-4"><PromoForm initial={empty} create live={!d.isDemo} /></div>
        </details>
      </Card>
      <Card>
        {promos.length === 0 ? (
          <p className="text-sm text-muted">Aucun code pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {promos.map((p) => {
              const [label, tone] = status(p, today);
              return (
                <li key={p.code}>
                  <details className="py-3">
                    <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-3 sm:grid-cols-[1.2fr_0.8fr_1.4fr_1fr_1.6fr_auto] [&::-webkit-details-marker]:hidden">
                      <span className="font-mono font-semibold">{p.code}</span>
                      <span className="tabular-nums">{p.type === "percent" ? `−${p.value} %` : `−${dh(p.value)}`}</span>
                      <span className="text-sm text-muted">{p.firstBookingOnly ? "Première réservation" : "Toutes réservations"}</span>
                      <span className="whitespace-nowrap text-sm">jusqu&apos;au {adminDate(`${p.validTo}T12:00:00Z`, false)}</span>
                      <FillBar value={p.redemptionsCount} max={p.maxRedemptions} label={`${p.redemptionsCount} / ${p.maxRedemptions} utilisations`} />
                      <Badge tone={tone}>{label}</Badge>
                    </summary>
                    <div className="mt-4"><PromoForm initial={toValues(p)} create={false} live={!d.isDemo} /></div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">Un code est compté quand la place est payée (ou tout de suite si elle devient gratuite). Toutes les modifications sont journalisées.</p>
      </Card>
    </>
  );
}
