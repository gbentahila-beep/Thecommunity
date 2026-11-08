import { DEFAULT_CANCELLATION_POLICY, pricingOf, type Experience } from "@thecommunity/shared";
import type { ExperienceFormValues } from "@/components/admin/experience-form";
import type { AdminData } from "@/lib/data/admin";

export function formOptions(d: Pick<AdminData, "categories" | "cities" | "partners">) {
  return {
    categories: d.categories.map((c) => ({ id: c.id, label: c.name.fr })),
    cities: d.cities.map((c) => ({ id: c.id, label: c.isActive ? c.name.fr : `${c.name.fr} (bientôt)`, disabled: !c.isActive })),
    partners: d.partners.filter((p) => p.status !== "archived").map((p) => ({ id: p.id, label: p.name })),
    policies: [{ id: DEFAULT_CANCELLATION_POLICY.id, label: DEFAULT_CANCELLATION_POLICY.label.fr }],
  };
}

function nextWeekDate(now: Date) {
  return new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
}

export function emptyExperienceValues(now: Date): ExperienceFormValues {
  return {
    titleFr: "", titleAr: "", summaryAr: "", descriptionAr: "", summaryFr: "", descriptionFr: "", titleEn: "", summaryEn: "", descriptionEn: "",
    categoryId: "eat", cityId: "casablanca", district: "", venueName: "", address: "",
    revealPolicy: "immediate", bookingMode: "individual",
    groupMin: "5", groupTarget: "6", groupMax: "7", maxSeatsPerBooking: "1",
    admission: "direct", requestMessageRequired: false, memberPriceDh: "", membersOnly: false,
    priceDh: "", durationMinutes: "120", languages: ["fr"], alcoholServed: false,
    included: "", practicalInfo: "", cancellationPolicyId: DEFAULT_CANCELLATION_POLICY.id,
    partnerId: "", economicsModel: "own", costPerSeatDh: "", commissionPercent: "",
    pricingModel: "online_only", partnerPriceDh: "", partnerDescription: "",
    status: "draft",
    sessions: { firstDate: nextWeekDate(now), time: "19:30", weeks: "1", capacity: "12" },
  };
}

export function experienceToValues(e: Experience, eco: AdminData["economics"][string] | undefined, now: Date): ExperienceFormValues {
  return {
    ...emptyExperienceValues(now),
    titleFr: e.title.fr, titleAr: e.title.ar ?? "", summaryAr: e.summary.ar ?? "", descriptionAr: e.description.ar ?? "", summaryFr: e.summary.fr, descriptionFr: e.description.fr,
    titleEn: e.title.en ?? "", summaryEn: e.summary.en ?? "", descriptionEn: e.description.en ?? "",
    categoryId: e.categoryId, cityId: e.cityId, district: e.district, venueName: e.venue.name, address: e.venue.address,
    revealPolicy: e.venue.revealPolicy, bookingMode: e.bookingMode,
    groupMin: String(e.groupConfig?.minSize ?? 5), groupTarget: String(e.groupConfig?.targetSize ?? 6), groupMax: String(e.groupConfig?.maxSize ?? 7),
    admission: e.admission ?? "direct", requestMessageRequired: Boolean(e.requestMessageRequired),
    memberPriceDh: e.memberPrice ? String(e.memberPrice.amount / 100) : "", membersOnly: Boolean(e.membersOnly),
    maxSeatsPerBooking: String(e.maxSeatsPerBooking), priceDh: String(e.price.amount / 100), durationMinutes: String(e.durationMinutes),
    languages: e.languages.filter((l): l is ExperienceFormValues["languages"][number] => ["fr", "ar", "darija", "en", "es"].includes(l)),
    alcoholServed: Boolean(e.alcoholServed), included: (e.included ?? []).map((i) => i.fr).join("\n"), practicalInfo: e.practicalInfo?.fr ?? "",
    partnerId: eco?.partnerId ?? "", economicsModel: eco?.model ?? "own",
    costPerSeatDh: eco?.costPerSeat != null ? String(eco.costPerSeat / 100) : "",
    commissionPercent: eco?.commissionPercent != null ? String(eco.commissionPercent) : "",
    ...pricingValues(e),
    status: e.status === "published" ? "published" : "draft",
  };
}

/** Section 5 : mode de tarification et part partenaire (les anciennes expériences sont « tout en ligne »). */
function pricingValues(e: Experience): Pick<ExperienceFormValues, "pricingModel" | "partnerPriceDh" | "partnerDescription"> {
  const p = pricingOf(e);
  return {
    pricingModel: p.model,
    partnerPriceDh: p.partner?.price ? String(p.partner.price.amount / 100) : "",
    partnerDescription: p.partner?.description ?? "",
  };
}
