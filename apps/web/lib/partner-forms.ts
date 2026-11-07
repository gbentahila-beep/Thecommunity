import type { PartnerFormValues } from "@/components/admin/partner-form";
import type { Partner } from "@/lib/data/demo-admin";

export const emptyPartnerValues = (): PartnerFormValues => ({
  name: "", type: "restaurant", status: "prospect", cityId: "casablanca", district: "", address: "", contactName: "", contactEmail: "",
  contactPhone: "", link: "", model: "purchase", defaultCommissionPercent: "", notes: "",
});

/** Anciens partenaires (avant 5d) : modèle déduit de la commission par défaut. */
export function partnerToValues(p: Partner): PartnerFormValues {
  const model = p.model ?? (p.defaultCommissionPercent > 0 ? "commission" : "purchase");
  return {
    name: p.name, type: p.type, status: p.status, cityId: p.cityId ?? "casablanca", district: p.district ?? "", address: p.address ?? "",
    contactName: p.contactName ?? "", contactEmail: p.contactEmail ?? "", contactPhone: p.contactPhone ?? "", link: p.link ?? "",
    model, defaultCommissionPercent: model === "commission" ? String(p.defaultCommissionPercent) : "", notes: p.notes ?? "",
  };
}
