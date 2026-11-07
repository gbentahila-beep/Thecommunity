import { DEFAULT_CANCELLATION_POLICY, type Experience } from "@thecommunity/shared";
import type { ExperienceFormValues } from "@/components/admin/experience-form";
import { DEMO_CATEGORIES, DEMO_CITIES } from "@/lib/data/demo";
import { DEMO_ECONOMICS, DEMO_PARTNERS } from "@/lib/data/demo-admin";

export function formOptions() {
  return {
    categories: DEMO_CATEGORIES.map((c) => ({ id: c.id, label: c.name.fr })),
    cities: DEMO_CITIES.map((c) => ({ id: c.id, label: c.isActive ? c.name.fr : `${c.name.fr} (bientôt)`, disabled: !c.isActive })),
    partners: DEMO_PARTNERS.map((p) => ({ id: p.id, label: p.name })),
    policies: [{ id: DEFAULT_CANCELLATION_POLICY.id, label: DEFAULT_CANCELLATION_POLICY.label.fr }],
  };
}

function nextWeekDate(now: Date) {
  const d = new Date(now.getTime() + 7 * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function emptyExperienceValues(now: Date): ExperienceFormValues {
  return {
    titleFr: "", titleAr: "", summaryFr: "", descriptionFr: "",
    categoryId: "eat", cityId: "casablanca", district: "", venueName: "", address: "",
    revealPolicy: "immediate", bookingMode: "individual",
    groupMin: "5", groupTarget: "6", groupMax: "7", maxSeatsPerBooking: "1",
    priceDh: "", durationMinutes: "120", languages: ["fr"], alcoholServed: false,
    included: "", practicalInfo: "", cancellationPolicyId: DEFAULT_CANCELLATION_POLICY.id,
    partnerId: "", economicsModel: "own", costPerSeatDh: "", commissionPercent: "",
    status: "draft",
    sessions: { firstDate: nextWeekDate(now), time: "19:30", weeks: "1", capacity: "12" },
  };
}

export function experienceToValues(e: Experience, now: Date): ExperienceFormValues {
  const eco = DEMO_ECONOMICS[e.id];
  return {
    ...emptyExperienceValues(now),
    titleFr: e.title.fr, titleAr: e.title.ar ?? "", summaryFr: e.summary.fr, descriptionFr: e.description.fr,
    categoryId: e.categoryId, cityId: e.cityId, district: e.district, venueName: e.venue.name, address: e.venue.address,
    revealPolicy: e.venue.revealPolicy, bookingMode: e.bookingMode,
    groupMin: String(e.groupConfig?.minSize ?? 5), groupTarget: String(e.groupConfig?.targetSize ?? 6), groupMax: String(e.groupConfig?.maxSize ?? 7),
    maxSeatsPerBooking: String(e.maxSeatsPerBooking), priceDh: String(e.price.amount / 100), durationMinutes: String(e.durationMinutes),
    languages: e.languages.filter((l): l is ExperienceFormValues["languages"][number] => ["fr", "ar", "darija", "en", "es"].includes(l)),
    alcoholServed: Boolean(e.alcoholServed), included: e.included.map((i) => i.fr).join("\n"), practicalInfo: e.practicalInfo.fr,
    partnerId: eco?.partnerId ?? "", economicsModel: eco?.model ?? "own",
    costPerSeatDh: eco?.costPerSeat !== undefined ? String(eco.costPerSeat / 100) : "",
    commissionPercent: eco?.commissionPercent !== undefined ? String(eco.commissionPercent) : "",
    status: e.status === "published" ? "published" : "draft",
  };
}
