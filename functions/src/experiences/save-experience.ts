import { cleanQuestion, experienceInputSchema, MOROCCO_TIMEZONE, parseCoords, PAYMENT_MODELS, planSessionDates, resolveCommission, splitForModel } from "@thecommunity/shared";
import { commissionRules, moroccoToday } from "../commissions/ledger";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { notifyReservationChange } from "../notify/reminders";
import { notifyNewDates } from "./alerts";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { requireOrganizer } from "../organizers/access";
import { refuse } from "../reservations/refuse";

const ID = /^[A-Za-z0-9_-]{6,40}$/;
const input = z.object({
  experienceId: z.string().regex(ID).optional(),
  /** Identifiant choisi par le navigateur pour une création (les photos y ont déjà été envoyées). */
  newId: z.string().regex(ID).optional(),
  data: z.unknown(),
  addSessions: z.boolean(),
  images: z.array(z.object({ path: z.string().max(300), alt: z.string().max(200) })).max(12),
});

/** Les appels Firebase transforment les champs « undefined » en null : on les retire avant validation. */
function dropNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropNulls);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, dropNulls(v)]));
  }
  return value;
}

/** « Dîner entre inconnus », « casablanca » → « diner-entre-inconnus-casablanca ». */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string, ignoreId?: string) {
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const snap = await db.collection("experiences").where("slug", "==", candidate).limit(2).get();
    if (snap.docs.every((d) => d.id === ignoreId)) return candidate;
  }
  throw new HttpsError("already-exists", "Impossible de générer une adresse unique.");
}

/** Organisateur qui enregistre (étape 20) ; absent = l'équipe Wenzy. */
type OrganizerActor = { id: string; name: string; slug: string };

/**
 * Crée ou modifie une expérience, son modèle économique et (optionnellement) une série de dates.
 * Réservé aux admins. Validation complète avec le schéma partagé, écriture en un seul lot, journalisée.
 */
export const adminSaveExperience = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  return saveExperience(req.data, { uid: actor.uid, role: roleOf(req), organizer: null });
});

/**
 * Étape 20 : un organisateur validé crée ou modifie SES activités. Brouillon, puis « envoyer pour validation » :
 * l'équipe relit avant publication (adminReviewExperience). Une activité déjà publiée reste en ligne quand
 * l'organisateur la modifie, signalée « modifiée, à relire » dans le back-office. Pas d'accès au modèle économique,
 * aux lieux partenaires, ni aux avantages membres (gérés par l'équipe).
 */
export const organizerSaveExperience = onCall({ region: REGION }, async (req) => {
  const o = await requireOrganizer(req, { approvedOnly: true });
  return saveExperience(req.data, { uid: o.uid, role: "organizer", organizer: { id: o.orgId, name: String(o.org.name ?? ""), slug: String(o.org.slug ?? "") } });
});

export async function saveExperience(raw: unknown, ctx: { uid: string; role: string; organizer: OrganizerActor | null }) {
  const actor = { uid: ctx.uid };
  const org = ctx.organizer;
  const parsedInput = input.safeParse(raw);
  if (!parsedInput.success) invalidArgument(parsedInput.error.issues);
  const { experienceId, newId, addSessions, images } = parsedInput.data;
  const parsed = experienceInputSchema.safeParse(dropNulls(parsedInput.data.data));
  if (!parsed.success) invalidArgument(parsed.error.issues);
  // Organisateur : les réglages réservés à l'équipe sont ignorés (prix membre, réservé membres, lieu partenaire,
  // modèle économique, proposition d'un membre de confiance).
  const v = org
    ? { ...parsed.data, partnerId: "", pricingModel: "online_only" as const, partnerPriceDh: undefined, onSiteCommissionPercent: undefined, membersOnly: false, memberPriceDh: undefined, proposalId: undefined, economicsModel: "own" as const, costPerSeatDh: undefined, commissionPercent: undefined }
    : parsed.data;

  const isCreate = !experienceId;
  const id = experienceId ?? newId ?? db.collection("experiences").doc().id;
  const ref = db.doc(`experiences/${id}`);
  const existing = await ref.get();
  if (isCreate && existing.exists) throw new HttpsError("already-exists", "Cette expérience existe déjà.");
  if (!isCreate && !existing.exists) throw new HttpsError("not-found", "Expérience introuvable.");
  // Lieu secret (docs/22) : le lieu réel est rangé à part ; on le relit pour détecter un changement de lieu.
  const privateVenueRef = db.doc(`experiences/${id}/private/venue`);
  const beforeVenue = isCreate ? null : (((await privateVenueRef.get()).data() as { name?: string; address?: string } | undefined) ?? (existing.data()?.venue as { name?: string; address?: string } | undefined) ?? null);
  // Une expérience peut être créée SANS date : « Prochaines dates bientôt », dates ajoutées plus tard.

  // Étape 20 : un organisateur ne modifie que SES activités ; l'organisateur d'une activité ne change jamais.
  const ownerOrgId = isCreate ? (org?.id ?? null) : ((existing.data()?.organizerId as string | undefined) ?? null);
  if (org && ownerOrgId !== org.id) throw new HttpsError("permission-denied", "Cette activité ne vous appartient pas.", { reason: "not_owner" });
  // Les photos doivent avoir été envoyées dans le dossier de CETTE expérience (équipe) ou de l'organisateur.
  for (const img of images) {
    const okPath = (!org && img.path.startsWith(`experiences/${id}/`)) || (ownerOrgId !== null && img.path.startsWith(`organizers/${ownerOrgId}/public/`));
    if (!okPath || img.path.includes("..")) {
      invalidArgument([{ path: ["images"], message: "invalidImagePath" }]);
    }
  }
  const [city, category, subcategory, partner] = await Promise.all([
    db.doc(`cities/${v.cityId}`).get(),
    db.doc(`categories/${v.categoryId}`).get(),
    v.subcategoryId ? db.doc(`categories/${v.subcategoryId}`).get() : Promise.resolve(null),
    v.partnerId ? db.doc(`partners/${v.partnerId}`).get() : Promise.resolve(null),
  ]);
  if (!city.exists || city.data()?.isActive !== true) invalidArgument([{ path: ["cityId"], message: "required" }]);
  // Étape 19 : l'univers est une catégorie principale ; la sous-catégorie (facultative) en dépend.
  if (!category.exists || category.get("parentId")) invalidArgument([{ path: ["categoryId"], message: "required" }]);
  if (v.subcategoryId && (!subcategory?.exists || subcategory.get("parentId") !== v.categoryId)) invalidArgument([{ path: ["subcategoryId"], message: "required" }]);
  if (v.partnerId && !partner?.exists) invalidArgument([{ path: ["partnerId"], message: "required" }]);
  // 18d : expérience issue de la proposition d'un membre de confiance (encore en attente, ou déjà liée à CETTE expérience).
  let proposal: FirebaseFirestore.DocumentData | undefined;
  if (v.proposalId) {
    proposal = (await db.doc(`outingProposals/${v.proposalId}`).get()).data();
    if (!proposal || (proposal.status !== "pending" && proposal.experienceId !== id)) invalidArgument([{ path: ["proposalId"], message: "proposalUnavailable" }]);
  }

  // Statut réel : l'équipe publie directement ; un organisateur « envoie pour validation » (pending_review),
  // sauf si l'activité est déjà publiée (elle le reste). Archivée : le reste jusqu'à « Réactiver ».
  const previousStatus = existing.data()?.status as string | undefined;
  const effectiveStatus: string =
    previousStatus === "archived"
      ? "archived"
      : !org
        ? v.status
        : previousStatus === "published"
          ? "published"
          : v.status === "published"
            ? "pending_review"
            : "draft";
  const grouped = v.bookingMode === "group" || v.bookingMode === "social_dinner";
  // Lieu secret : ni nom, ni adresse, ni coordonnées, ni quartier, ni nom du partenaire dans les documents publics.
  const secret = v.revealPolicy === "on_group_reveal";
  const publicDistrict = secret ? "" : v.district;
  const price = { amount: Math.round(v.priceDh * 100), currency: "MAD" as const };
  const sellPrice = () => (marketplace ? { amount: marketplace.onlineUnit, currency: "MAD" as const } : price);
  const slug = isCreate ? await uniqueSlug(slugify(`${v.titleFr} ${v.cityId}`)) : (existing.data()?.slug as string);
  const imageDocs = images.map((i) => ({ path: i.path, alt: { fr: i.alt || v.titleFr } }));
  const keepImages = !isCreate && images.length === 0 ? (existing.data()?.images ?? []) : imageDocs;
  const snapshot = {
    title: { fr: v.titleFr, ...(v.titleAr ? { ar: v.titleAr } : {}), ...(v.titleEn ? { en: v.titleEn } : {}) },
    slug,
    coverImagePath: keepImages[0]?.path ?? "",
    categoryId: v.categoryId,
    bookingMode: v.bookingMode,
    district: publicDistrict,
    admission: v.admission,
  };

  // Étape 22 : activité d'un organisateur — mode de paiement A (tout en ligne), B (acompte) ou C (frais de
  // réservation) parmi ceux activés par l'équipe. Le prix saisi est le prix TOTAL par place ; la part en ligne et
  // la part sur place (à l'organisateur) sont calculées ici, la commission de la règle en vigueur incluse.
  let marketplace: { paymentModel: string; depositPercent: number | null; totalUnit: number; onlineUnit: number; onSiteUnit: number } | null = null;
  if (ownerOrgId) {
    const enabled = ((await db.doc("settings/payment").get()).get("organizerPaymentModels") as string[] | undefined) ?? [...PAYMENT_MODELS];
    if (!enabled.includes(v.paymentModel)) invalidArgument([{ path: ["paymentModel"], message: "paymentModelDisabled" }]);
    const totalUnit = Math.round(v.priceDh * 100);
    const c = resolveCommission(await commissionRules(), { experienceId: id, organizerId: ownerOrgId, categoryId: v.categoryId, at: moroccoToday() });
    const split = splitForModel(v.paymentModel, totalUnit, { depositPercent: v.depositPercent, ratePercent: c.ratePercent, fixedPerSeat: c.fixedPerSeat });
    marketplace = { paymentModel: v.paymentModel, depositPercent: v.paymentModel === "deposit" ? (v.depositPercent ?? 30) : null, totalUnit, ...split };
  }
  const orgName = org?.name ?? ((existing.data()?.organizerSnapshot?.name as string | undefined) ?? "");

  // Étape 11 : comment le client paie. La part organisation reste `price` (payée en ligne) ;
  // la part partenaire (prix fixe ou consommation libre) est toujours réglée sur place, jamais encaissée.
  const pricing =
    marketplace && marketplace.paymentModel !== "full_online"
      ? { model: "fixed_partner", currency: "MAD", partner: { name: orgName, paymentMode: "on_site", pricingType: "fixed", price: { amount: marketplace.onSiteUnit, currency: "MAD" }, description: "" } }
      : v.pricingModel === "online_only" || !partner?.exists
      ? { model: "online_only", currency: "MAD", partner: null }
      : {
          model: v.pricingModel,
          currency: "MAD",
          partner: {
            name: secret ? "" : String(partner.data()?.name ?? ""),
            paymentMode: "on_site",
            pricingType: v.pricingModel === "fixed_partner" ? "fixed" : "consumption",
            price: v.pricingModel === "fixed_partner" ? { amount: Math.round((v.partnerPriceDh ?? 0) * 100), currency: "MAD" } : null,
            description: "", // 11h : tout ce qui est inclus se décrit dans « Ce qui est inclus » (prix total)
          },
        };

  const experience = {
    slug,
    pricing,
    title: snapshot.title,
    summary: { fr: v.summaryFr, ...(v.summaryAr ? { ar: v.summaryAr } : {}), ...(v.summaryEn ? { en: v.summaryEn } : {}) },
    description: { fr: v.descriptionFr, ...(v.descriptionAr ? { ar: v.descriptionAr } : {}), ...(v.descriptionEn ? { en: v.descriptionEn } : {}) },
    categoryId: v.categoryId,
    subcategoryId: v.subcategoryId || null,
    cityId: v.cityId,
    district: publicDistrict,
    tags: [] as string[],
    partnerSnapshot: partner?.exists && !secret ? { name: partner.data()?.name } : null,
    venue: secret
      ? { name: "", address: "", revealPolicy: v.revealPolicy, geo: null }
      : { name: v.venueName, address: v.address, revealPolicy: v.revealPolicy, geo: parseCoords(v.venueCoords) },
    images: keepImages,
    durationMinutes: v.durationMinutes,
    price: sellPrice(),
    bookingMode: v.bookingMode,
    groupConfig: grouped ? { minSize: v.groupMin, targetSize: v.groupTarget, maxSize: v.groupMax } : null,
    maxSeatsPerBooking: v.maxSeatsPerBooking,
    memberPrice: v.memberPriceDh !== undefined ? { amount: Math.round(v.memberPriceDh * 100), currency: "MAD" } : null,
    membersOnly: v.membersOnly,
    admission: v.admission,
    requestMessageRequired: v.admission === "on_request" && v.requestMessageRequired,
    requestInstagramRequired: v.admission === "on_request" && v.requestInstagramRequired,
    languages: v.languages,
    alcoholServed: v.alcoholServed,
    onSiteHost: v.onSiteHost === true,
    foodServed: v.foodServed === true,
    // Restaurant (docs/16) : gamme, budget estimé par personne (consommation libre sur place), cuisine, ambiance.
    venueTier: v.venueTier || null,
    budgetRange: v.budgetMinDh !== undefined && v.budgetMaxDh !== undefined ? { min: Math.round(v.budgetMinDh * 100), max: Math.round(v.budgetMaxDh * 100), currency: "MAD" } : null,
    cuisine: v.cuisine || null,
    ambiance: v.ambiance || null,
    included: (v.included ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((fr) => ({ fr })),
    notIncluded: (v.notIncluded ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((fr) => ({ fr })),
    practicalInfo: { fr: v.practicalInfo ?? "" },
    cancellationPolicyId: v.cancellationPolicyId,
    // 18b / 18c : précisions pour les activités (facultatives).
    level: v.level ?? null,
    equipmentProvided: v.equipmentProvided ?? "",
    whatToBring: v.whatToBring ?? "",
    dressCode: v.dressCode ?? "",
    minAge: v.minAge ?? null,
    audience: v.audience,
    targetAgeMin: v.targetAgeMin ?? null,
    targetAgeMax: v.targetAgeMax ?? null,
    outdoor: v.outdoor,
    physicalActivity: v.physicalActivity,
    // 18a : questionnaire (traductions vides retirées).
    questionnaire: v.questionnaire.map(cleanQuestion),
    // Étape 22 : mode de paiement et prix total (activités d'organisateurs).
    ...(marketplace ? { paymentModel: marketplace.paymentModel, depositPercent: marketplace.depositPercent, totalPrice: { amount: marketplace.totalUnit, currency: "MAD" } } : {}),
    ...(proposal ? { proposedBy: { uid: proposal.userId, firstName: String(proposal.firstName ?? "") }, proposalId: v.proposalId } : {}),
    // Une expérience archivée le reste tant qu'elle n'est pas réactivée (bouton « Réactiver »).
    status: effectiveStatus,
    ...(org
      ? {
          organizerSnapshot: { name: org.name, slug: org.slug },
          // Activité publiée modifiée par l'organisateur : reste en ligne, signalée à l'équipe.
          ...(previousStatus === "published" ? { reviewFlag: true, reviewFlaggedAt: FieldValue.serverTimestamp() } : {}),
          ...(effectiveStatus === "pending_review" && previousStatus !== "pending_review" ? { submittedAt: FieldValue.serverTimestamp(), rejectionMessage: null } : {}),
        }
      : {}),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };

  const batch = db.batch();
  const now = Date.now();
  const planned = addSessions ? planSessionDates(v.sessions, v.durationMinutes, MOROCCO_TIMEZONE) : [];
  if (planned.some((d) => new Date(d.startAt).getTime() < now)) invalidArgument([{ path: ["sessions", "firstDate"], message: "inPast" }]);
  const archived = existing.data()?.status === "archived";
  if (archived && addSessions) refuse("archived", "Réactivez l'expérience avant d'ajouter des dates.");
  const sessionStatus = effectiveStatus === "published" ? "published" : "draft";
  // Étape 19 : l'organisateur (null = Wenzy) est recopié sur chaque date (règles d'accès, tableaux de bord).
  const organizerId = ownerOrgId;
  for (const d of planned) {
    batch.set(db.collection("sessions").doc(), {
      experienceId: id,
      organizerId,
      experienceSnapshot: snapshot,
      cityId: v.cityId,
      categoryId: v.categoryId,
      startAt: Timestamp.fromDate(new Date(d.startAt)),
      endAt: Timestamp.fromDate(new Date(d.endAt)),
      price: sellPrice(),
      capacity: v.sessions.capacity,
      seatsConfirmed: 0,
      seatsHeld: 0,
      waitlistCount: 0,
      status: sessionStatus,
      isFeatured: false,
      groupsStatus: "none",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Dates futures déjà programmées : on met à jour l'aperçu affiché et la publication (jamais les places).
  const future = await db.collection("sessions").where("experienceId", "==", id).where("startAt", ">=", Timestamp.fromMillis(now)).get();
  for (const s of future.docs) {
    const status = s.data().status;
    const nextStatus = archived ? status : status === "draft" && effectiveStatus === "published" ? "published" : status === "published" && effectiveStatus === "draft" && s.data().seatsConfirmed === 0 ? "draft" : status;
    batch.update(s.ref, { experienceSnapshot: snapshot, status: nextStatus });
  }
  const starts = [...future.docs.map((s) => (s.data().startAt as Timestamp).toMillis()), ...planned.map((d) => new Date(d.startAt).getTime())];
  const nextSessionAt = starts.length ? Timestamp.fromMillis(Math.min(...starts)) : null;

  // Le lieu réel, toujours rangé dans le document privé (lisible par l'équipe seulement).
  batch.set(privateVenueRef, {
    name: v.venueName,
    address: v.address,
    geo: parseCoords(v.venueCoords),
    district: v.district,
    partnerName: partner?.exists ? String(partner.data()?.name ?? "") : "",
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (isCreate) batch.set(ref, { ...experience, organizerId: ownerOrgId, nextSessionAt, ratingAvg: 0, ratingCount: 0, createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid });
  else batch.update(ref, { ...experience, nextSessionAt });
  // Organisateur : modèle économique créé une fois (commission fixée par les règles de commission, étape 21),
  // jamais modifié par lui ensuite.
  // Activité d'un organisateur (même modifiée par l'équipe) : modèle « organizer » conservé.
  if (ownerOrgId) {
    if (isCreate) batch.set(db.doc(`experiences/${id}/private/economics`), { partnerId: null, model: "organizer", organizerId: ownerOrgId, costPerSeat: null, commissionPercent: null, onSiteCommissionPercent: null, updatedAt: FieldValue.serverTimestamp() });
  } else batch.set(db.doc(`experiences/${id}/private/economics`), {
    partnerId: v.partnerId || null,
    model: v.economicsModel,
    costPerSeat: v.economicsModel === "own" ? Math.round((v.costPerSeatDh ?? 0) * 100) : null,
    commissionPercent: v.economicsModel === "commission" ? v.commissionPercent : null,
    // 11g : commission sur la part réglée sur place, facturée au partenaire hors site.
    onSiteCommissionPercent: v.pricingModel !== "online_only" && v.onSiteCommissionPercent ? v.onSiteCommissionPercent : null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (proposal && v.proposalId && proposal.status === "pending") {
    batch.update(db.doc(`outingProposals/${v.proposalId}`), { status: "accepted", experienceId: id, decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection(`users/${proposal.userId}/notifications`).doc(), {
      type: "proposal_published",
      title: { fr: "Votre proposition est retenue", ar: "تم قبول اقتراحك", en: "Your proposal has been accepted" },
      body: {
        fr: `L'équipe prépare « ${v.titleFr} » à partir de votre proposition. Merci !`,
        ar: `يُعدّ الفريق «${v.titleAr || v.titleFr}» انطلاقاً من اقتراحك. شكراً!`,
        en: `The team is preparing “${v.titleEn || v.titleFr}” from your proposal. Thank you!`,
      },
      link: v.status === "published" ? `/experiences/${slug}` : "/espace/proposer",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  // Étape 31 : sortie proposée pour un ancien groupe → à la première publication, les autres membres du groupe sont
  // prévenus (sauf qui a demandé à ne plus être réuni avec la personne qui propose, ou l'inverse).
  if (proposal?.forGroupId && v.status === "published" && v.proposalId) {
    const pRef = db.doc(`outingProposals/${v.proposalId}`);
    const already = (await pRef.get()).get("groupNotifiedAt");
    const g = already ? undefined : (await db.doc(`groups/${proposal.forGroupId}`).get()).data();
    if (g) {
      const others = (g.memberIds as string[]).filter((m) => m !== proposal!.userId);
      const avoidDocs = await db.getAll(db.doc(`avoids/${proposal.userId}`), ...others.map((m) => db.doc(`avoids/${m}`)));
      const proposerAvoids = (avoidDocs[0]!.get("uids") as string[] | undefined) ?? [];
      const nb = db.batch();
      others.forEach((m, i) => {
        if (proposerAvoids.includes(m) || ((avoidDocs[i + 1]!.get("uids") as string[] | undefined) ?? []).includes(proposal!.userId)) return;
        nb.set(db.collection(`users/${m}/notifications`).doc(), {
          type: "outing_for_group",
          title: { fr: "Une sortie pour votre groupe", en: "An outing for your group", ar: "خرجة لمجموعتك" },
          body: {
            fr: `${String(proposal!.firstName ?? "")}, de votre groupe, propose « ${v.titleFr} ». Rejoignez-la si le cœur vous en dit !`,
            en: `${String(proposal!.firstName ?? "")}, from your group, suggests “${v.titleEn || v.titleFr}”. Join if you feel like it!`,
            ar: `يقترح ${String(proposal!.firstName ?? "")}، من مجموعتك، «${v.titleAr || v.titleFr}». انضم إن رغبت!`,
          },
          link: `/experiences/${slug}`,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      nb.update(pRef, { groupNotifiedAt: FieldValue.serverTimestamp() });
      await nb.commit();
    }
  }

  // Lieu modifié : les personnes à qui il avait déjà été communiqué reçoivent le nouveau (notification + e-mail).
  const before = beforeVenue;
  if (!isCreate && before && (before.name !== v.venueName || before.address !== v.address)) {
    const affected = await db.collection("reservations").where("experienceId", "==", id).where("sessionSnapshot.startAt", ">=", Timestamp.fromMillis(now)).get();
    for (const r of affected.docs) {
      const d = r.data();
      if (!["confirmed", "pending_payment"].includes(d.status) || !d.venue) continue;
      await r.ref.update({ venue: { name: v.venueName, address: v.address }, updatedAt: FieldValue.serverTimestamp() });
      await notifyReservationChange(r.id, "venue").catch(() => undefined);
    }
  }
  // Nouvelles dates publiées : prévenir les personnes qui l'avaient demandé.
  const alerted = planned.length > 0 && effectiveStatus === "published" ? await notifyNewDates(id, v.titleFr, slug, planned.length) : 0;
  await audit({ actorUid: actor.uid, actorRole: ctx.role, action: isCreate ? "experience.create" : "experience.update", targetType: "experience", targetId: id, after: { title: v.titleFr, status: effectiveStatus, sessionsAdded: planned.length, alerted, pricingModel: pricing.model, ...(org ? { organizerId: org.id } : {}) } });
  return { ok: true, experienceId: id, slug, sessionsCreated: planned.length, status: effectiveStatus };
}
