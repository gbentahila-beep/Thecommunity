import { cleanQuestion, DEFAULT_CANCELLATION_POLICY, EXTRA_I18N_KEYS, extraI18nValues, insuranceState, templateExtra, nextWeekdayDate, pricingOf, scheduleFor, type EventTemplate, type Experience, type OutingProposal, type TemplateValues, type VenueTier } from "@thecommunity/shared";
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
    partners: d.partners.filter((p) => p.status !== "archived").map((p) => ({ id: p.id, label: p.name, insurance: insuranceState(p.insurance, new Date()), venue: { name: p.name, address: p.address ?? "", district: p.district ?? "", coords: p.coords ?? (p.geo ? `${p.geo.lat}, ${p.geo.lng}` : "") } })),
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
    priceDh: "", free: false, earlyAccessDays: "0", durationMinutes: "120", languages: ["fr"], alcoholServed: false, onSiteHost: false, foodServed: false,
    included: "", notIncluded: "", practicalInfo: "", cancellationPolicyId: DEFAULT_CANCELLATION_POLICY.id,
    partnerId: "", economicsModel: "own", costPerSeatDh: "", commissionPercent: "",
    pricingModel: "online_only", partnerPriceDh: "", partnerDescription: "", onSiteCommissionPercent: "", budgetMinDh: "", budgetMaxDh: "", venueTier: "", cuisine: "", ambiance: "",
    paymentModel: "full_online", depositPercent: "30",
    status: "draft",
    sessions: { firstDate: nextWeekDate(now), time: "19:30", weeks: "1", capacity: "12" },
    level: "", equipmentProvided: "", whatToBring: "", dressCode: "", minAge: "", targetAgeMin: "", targetAgeMax: "", audience: "all", highlight: "auto", outdoor: false, physicalActivity: false, questionnaire: [],
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
    // docs/22 : un événement Wenzy prend le prix Wenzy global ; seul « gratuit » se règle ici.
    maxSeatsPerBooking: String(e.maxSeatsPerBooking), priceDh: String((e.totalPrice?.amount ?? e.price.amount) / 100), free: !e.organizerId && e.price.amount === 0, earlyAccessDays: String(e.earlyAccessDays ?? 0), durationMinutes: String(e.durationMinutes),
    languages: e.languages.filter((l): l is ExperienceFormValues["languages"][number] => ["fr", "ar", "darija", "en", "es"].includes(l)),
    budgetMinDh: e.budgetRange ? String(e.budgetRange.min / 100) : "", budgetMaxDh: e.budgetRange ? String(e.budgetRange.max / 100) : "",
    venueTier: e.venueTier ?? "", cuisine: e.cuisine ?? "", ambiance: e.ambiance ?? "",
    alcoholServed: Boolean(e.alcoholServed), onSiteHost: Boolean(e.onSiteHost), foodServed: Boolean(e.foodServed), included: includedLines(e).join("\n"), notIncluded: (e.notIncluded ?? []).map((i) => i.fr).join("\n"), practicalInfo: e.practicalInfo?.fr ?? "",
    partnerId: eco?.partnerId ?? "", economicsModel: eco?.model ?? "own",
    costPerSeatDh: eco?.costPerSeat != null ? String(eco.costPerSeat / 100) : "",
    commissionPercent: eco?.commissionPercent != null ? String(eco.commissionPercent) : "",
    onSiteCommissionPercent: eco?.onSiteCommissionPercent != null ? String(eco.onSiteCommissionPercent) : "",
    ...(e.organizerId ? {} : pricingValues(e)),
    paymentModel: e.paymentModel ?? "full_online", depositPercent: String(e.depositPercent ?? 30),
    status: e.status === "published" ? "published" : "draft",
    level: e.level ?? "", equipmentProvided: e.equipmentProvided ?? "", whatToBring: e.whatToBring ?? "", dressCode: e.dressCode ?? "",
    // Arabe et anglais des textes secondaires.
    ...extraI18nValues(e.textI18n),
    includedAr: (e.included ?? []).map((i) => i.ar ?? "").join("\n").replace(/\s+$/, ""), includedEn: (e.included ?? []).map((i) => i.en ?? "").join("\n").replace(/\s+$/, ""),
    notIncludedAr: (e.notIncluded ?? []).map((i) => i.ar ?? "").join("\n").replace(/\s+$/, ""), notIncludedEn: (e.notIncluded ?? []).map((i) => i.en ?? "").join("\n").replace(/\s+$/, ""),
    practicalInfoAr: e.practicalInfo?.ar ?? "", practicalInfoEn: e.practicalInfo?.en ?? "",
    minAge: e.minAge ? String(e.minAge) : "", targetAgeMin: e.targetAgeMin ? String(e.targetAgeMin) : "", targetAgeMax: e.targetAgeMax ? String(e.targetAgeMax) : "", audience: e.audience === "women" ? "women" : "all", highlight: e.highlight ?? "auto", outdoor: Boolean(e.outdoor), physicalActivity: Boolean(e.physicalActivity),
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

/**
 * docs/22, décision 21 : formulaire pré-rempli à partir d'un modèle (et de sa gamme pour les Tables). Il ne reste
 * qu'à choisir la date ; le lieu se renseigne maintenant ou plus tard (lieu secret).
 */
export function templateToValues(t: EventTemplate, tier: VenueTier | null, now: Date): ExperienceFormValues {
  const x = t.values;
  const g = tier ? t.tiers?.[tier] : undefined;
  const str = (n: number | undefined) => (n === undefined ? "" : String(n));
  return {
    ...emptyExperienceValues(now),
    titleFr: x.titleFr, summaryFr: x.summaryFr, descriptionFr: x.descriptionFr,
    titleAr: x.titleAr ?? "", summaryAr: x.summaryAr ?? "", descriptionAr: x.descriptionAr ?? "",
    titleEn: x.titleEn ?? "", summaryEn: x.summaryEn ?? "", descriptionEn: x.descriptionEn ?? "",
    categoryId: x.categoryId, subcategoryId: x.subcategoryId ?? "",
    revealPolicy: x.revealPolicy, bookingMode: x.bookingMode,
    groupMin: str(x.groupMin ?? 4), groupTarget: str(x.groupMax ?? 6), groupMax: str(x.groupMax ?? 6),
    maxSeatsPerBooking: String(x.maxSeatsPerBooking), durationMinutes: String(x.durationMinutes),
    pricingModel: x.pricingModel, partnerPriceDh: str(x.partnerPriceDh), budgetMinDh: str(x.budgetMinDh), budgetMaxDh: str(x.budgetMaxDh),
    venueTier: tier ?? "", cuisine: x.cuisine ?? "", ambiance: g?.ambiance ?? x.ambiance ?? "",
    included: x.included, practicalInfo: g?.practicalInfo ?? x.practicalInfo ?? "",
    ...templateExtra(x, g),
    level: x.level ?? "", equipmentProvided: x.equipmentProvided ?? "", whatToBring: x.whatToBring ?? "", dressCode: x.dressCode ?? "",
    outdoor: x.outdoor, physicalActivity: x.physicalActivity, alcoholServed: x.alcoholServed, foodServed: x.categoryId === "eat",
    languages: x.languages, cancellationPolicyId: x.cancellationPolicyId, audience: x.audience,
    membersOnly: x.membersOnly, earlyAccessDays: String(x.earlyAccessDays),
    questionnaire: x.questionnaire.map(toDraft),
    status: "draft",
    // Étape Y : jour et heure selon la gamme pour les Tables (jamais trois « Déjeuner » le même jour).
    sessions: { firstDate: nextWeekdayDate(scheduleFor(t, tier).weekday, now), time: scheduleFor(t, tier).time, weeks: "1", capacity: String(x.capacity) },
  };
}

/** Valeurs du formulaire → réglages d'un modèle (« Enregistrer comme modèle »). La gamme et le lieu n'en font pas partie. */
export function valuesToTemplate(v: ExperienceFormValues, weekday: number): TemplateValues {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));
  const grouped = v.categoryId === "eat" || v.bookingMode === "group" || v.bookingMode === "social_dinner";
  const opt = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  return {
    titleFr: v.titleFr.trim(), summaryFr: v.summaryFr.trim(), descriptionFr: v.descriptionFr.trim(),
    titleAr: opt(v.titleAr), summaryAr: opt(v.summaryAr), descriptionAr: opt(v.descriptionAr),
    titleEn: opt(v.titleEn), summaryEn: opt(v.summaryEn), descriptionEn: opt(v.descriptionEn),
    categoryId: v.categoryId, subcategoryId: opt(v.subcategoryId),
    revealPolicy: v.revealPolicy, bookingMode: v.categoryId === "eat" ? "social_dinner" : v.bookingMode,
    groupMin: grouped ? num(v.groupMin) : undefined, groupMax: grouped ? num(v.groupMax) : undefined,
    capacity: Number(v.sessions.capacity) || 12, maxSeatsPerBooking: Number(v.maxSeatsPerBooking) >= 2 ? 2 : 1,
    durationMinutes: Number(v.durationMinutes) || 120, weekday, time: v.sessions.time || "19:30",
    pricingModel: v.pricingModel,
    partnerPriceDh: v.pricingModel === "fixed_partner" ? num(v.partnerPriceDh) : undefined,
    budgetMinDh: v.pricingModel === "variable_consumption" ? num(v.budgetMinDh) : undefined,
    budgetMaxDh: v.pricingModel === "variable_consumption" ? num(v.budgetMaxDh) : undefined,
    cuisine: undefined, ambiance: v.categoryId === "eat" ? undefined : opt(v.ambiance),
    included: v.included ?? "", practicalInfo: opt(v.practicalInfo),
    level: v.level || undefined, equipmentProvided: opt(v.equipmentProvided), whatToBring: opt(v.whatToBring), dressCode: opt(v.dressCode),
    // Arabe et anglais (sans la cuisine, propre au lieu, ni l'ambiance des Tables, propre à la gamme).
    ...Object.fromEntries(EXTRA_I18N_KEYS.filter((k) => !k.startsWith("cuisine") && !(v.categoryId === "eat" && k.startsWith("ambiance"))).flatMap((k) => (opt(v[k]) ? [[k, opt(v[k])]] : []))),
    outdoor: v.outdoor, physicalActivity: v.physicalActivity, alcoholServed: v.alcoholServed,
    languages: v.languages, cancellationPolicyId: v.cancellationPolicyId, audience: v.audience === "women" ? "women" : "all",
    membersOnly: v.membersOnly, earlyAccessDays: v.membersOnly ? 0 : Number(v.earlyAccessDays) || 0,
    questionnaire: v.questionnaire.map((q) => cleanQuestion({ ...q, label: q.label, options: q.options })),
  };
}
