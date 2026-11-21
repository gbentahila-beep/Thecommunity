import { DEFAULT_CANCELLATION_POLICY, insuranceState, pricingOf, type Experience, type OutingProposal } from "@thecommunity/shared";
import { toDraft } from "@/lib/questionnaire-draft";
import type { ExperienceFormValues } from "@/components/admin/experience-form";
import type { AdminData } from "@/lib/data/admin";

export function formOptions(d: Pick<AdminData, "categories" | "cities" | "partners">, policies: { id: string; label: { fr: string } }[] = [DEFAULT_CANCELLATION_POLICY]) {
  return {
    // Étape 19 : catégories principales et sous-catégories (parentId), masquées signalées.
    categories: [...d.categories]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => ({ id: c.id, label: c.isActive === false ? `${c.name.fr} (masquée)` : c.name.fr, parentId: c.parentId ?? undefined })),
    cities: d.cities.map((c) => ({ id: c.id, label: c.isActive ? c.name.fr : `${c.name.fr} (bientôt)`, disabled: !c.isActive })),
    partners: d.partners.filter((p) => p.status !== "archived").map((p) => ({ id: p.id, label: p.name, insurance: insuranceState(p.insurance, new Date()) })),
    // Étape 22 : politiques d'annulation définies dans Paramètres.
    policies: policies.map((p) => ({ id: p.id, label: p.label.fr })),
  };
}

function nextWeekDate(now: Date) {
  return new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
}

export function emptyExperienceValues(now: Date): ExperienceFormValues {
  return {
    titleFr: "", titleAr: "", summaryAr: "", descriptionAr: "", summaryFr: "", descriptionFr: "", titleEn: "", summaryEn: "", descriptionEn: "",
    categoryId: "eat", subcategoryId: "", cityId: "casablanca", district: "", venueName: "", address: "", venueCoords: "",
    revealPolicy: "immediate", bookingMode: "individual",
    groupMin: "5", groupTarget: "6", groupMax: "7", maxSeatsPerBooking: "1",
    admission: "direct", requestMessageRequired: false, requestInstagramRequired: false, memberPriceDh: "", membersOnly: false,
    priceDh: "", durationMinutes: "120", languages: ["fr"], alcoholServed: false, onSiteHost: false, foodServed: false,
    included: "", notIncluded: "", practicalInfo: "", cancellationPolicyId: DEFAULT_CANCELLATION_POLICY.id,
    partnerId: "", economicsModel: "own", costPerSeatDh: "", commissionPercent: "",
    pricingModel: "online_only", partnerPriceDh: "", partnerDescription: "", onSiteCommissionPercent: "",
    paymentModel: "full_online", depositPercent: "30",
    status: "draft",
    sessions: { firstDate: nextWeekDate(now), time: "19:30", weeks: "1", capacity: "12" },
    level: "", equipmentProvided: "", whatToBring: "", dressCode: "", minAge: "", targetAgeMin: "", targetAgeMax: "", audience: "all", outdoor: false, physicalActivity: false, questionnaire: [],
  };
}

export function experienceToValues(e: Experience, eco: AdminData["economics"][string] | undefined, now: Date): ExperienceFormValues {
  return {
    ...emptyExperienceValues(now),
    titleFr: e.title.fr, titleAr: e.title.ar ?? "", summaryAr: e.summary.ar ?? "", descriptionAr: e.description.ar ?? "", summaryFr: e.summary.fr, descriptionFr: e.description.fr,
    titleEn: e.title.en ?? "", summaryEn: e.summary.en ?? "", descriptionEn: e.description.en ?? "",
    categoryId: e.categoryId, subcategoryId: e.subcategoryId ?? "", cityId: e.cityId, district: e.district, venueName: e.venue.name, address: e.venue.address, venueCoords: e.venue.geo ? `${e.venue.geo.lat}, ${e.venue.geo.lng}` : "",
    revealPolicy: e.venue.revealPolicy, bookingMode: e.bookingMode,
    groupMin: String(e.groupConfig?.minSize ?? 5), groupTarget: String(e.groupConfig?.targetSize ?? 6), groupMax: String(e.groupConfig?.maxSize ?? 7),
    admission: e.admission ?? "direct", requestMessageRequired: Boolean(e.requestMessageRequired), requestInstagramRequired: Boolean(e.requestInstagramRequired),
    memberPriceDh: e.memberPrice ? String(e.memberPrice.amount / 100) : "", membersOnly: Boolean(e.membersOnly),
    // Étape 22 : pour une activité d'organisateur, le prix saisi est le prix TOTAL (la part en ligne en découle).
    maxSeatsPerBooking: String(e.maxSeatsPerBooking), priceDh: String((e.totalPrice?.amount ?? e.price.amount) / 100), durationMinutes: String(e.durationMinutes),
    languages: e.languages.filter((l): l is ExperienceFormValues["languages"][number] => ["fr", "ar", "darija", "en", "es"].includes(l)),
    alcoholServed: Boolean(e.alcoholServed), onSiteHost: Boolean(e.onSiteHost), foodServed: Boolean(e.foodServed), included: includedLines(e).join("\n"), notIncluded: (e.notIncluded ?? []).map((i) => i.fr).join("\n"), practicalInfo: e.practicalInfo?.fr ?? "",
    partnerId: eco?.partnerId ?? "", economicsModel: eco?.model ?? "own",
    costPerSeatDh: eco?.costPerSeat != null ? String(eco.costPerSeat / 100) : "",
    commissionPercent: eco?.commissionPercent != null ? String(eco.commissionPercent) : "",
    onSiteCommissionPercent: eco?.onSiteCommissionPercent != null ? String(eco.onSiteCommissionPercent) : "",
    ...(e.organizerId ? {} : pricingValues(e)),
    paymentModel: e.paymentModel ?? "full_online", depositPercent: String(e.depositPercent ?? 30),
    status: e.status === "published" ? "published" : "draft",
    level: e.level ?? "", equipmentProvided: e.equipmentProvided ?? "", whatToBring: e.whatToBring ?? "", dressCode: e.dressCode ?? "",
    minAge: e.minAge ? String(e.minAge) : "", targetAgeMin: e.targetAgeMin ? String(e.targetAgeMin) : "", targetAgeMax: e.targetAgeMax ? String(e.targetAgeMax) : "", audience: e.audience === "women" ? "women" : "all", outdoor: Boolean(e.outdoor), physicalActivity: Boolean(e.physicalActivity),
    questionnaire: (e.questionnaire ?? []).map(toDraft),
  };
}

/** Section 5 : mode de tarification et part partenaire (les anciennes expériences sont « tout en ligne »). */
function pricingValues(e: Experience): Pick<ExperienceFormValues, "pricingModel" | "partnerPriceDh" | "partnerDescription"> {
  const p = pricingOf(e);
  return {
    pricingModel: p.model,
    partnerPriceDh: p.partner?.price ? String(p.partner.price.amount / 100) : "",
    partnerDescription: "",
  };
}

/**
 * 11h : « Ce qui est inclus » décrit tout le prix (en ligne et sur place). Une ancienne description de la part sur place
 * est reprise dans la liste (sans doublon) ; elle disparaît au prochain enregistrement.
 */
function includedLines(e: Experience): string[] {
  const lines = (e.included ?? []).map((i) => i.fr);
  const extra = pricingOf(e).partner?.description?.trim();
  return extra && !lines.some((l) => l.trim().toLowerCase() === extra.toLowerCase()) ? [...lines, extra] : lines;
}

/** 18d : formulaire pré-rempli à partir d'une sortie proposée par un membre de confiance. */
export function proposalToValues(p: OutingProposal, now: Date): ExperienceFormValues {
  const base = emptyExperienceValues(now);
  return {
    ...base,
    titleFr: p.title,
    summaryFr: p.description.split(/(?<=[.!?])\s/)[0]!.slice(0, 160),
    descriptionFr: p.description,
    categoryId: p.categoryId,
    cityId: p.cityId || base.cityId,
    district: p.district,
    venueName: p.venueIdea,
    priceDh: p.priceIdeaDh != null ? String(p.priceIdeaDh) : "",
    level: p.level ?? "",
    physicalActivity: p.categoryId === "move",
    proposalId: p.id,
    practicalInfo: p.willHost ? `Sortie proposée et accueillie par ${p.firstName}, membre de la communauté.` : "",
    sessions: { ...base.sessions, capacity: String(Math.min(50, Math.max(2, p.capacity))) },
  };
}
