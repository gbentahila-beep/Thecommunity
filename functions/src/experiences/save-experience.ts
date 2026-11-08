import { experienceInputSchema, MOROCCO_TIMEZONE, planSessionDates } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { notifyReservationChange } from "../notify/reminders";
import { notifyNewDates } from "./alerts";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
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

/**
 * Crée ou modifie une expérience, son modèle économique et (optionnellement) une série de dates.
 * Réservé aux admins. Validation complète avec le schéma partagé, écriture en un seul lot, journalisée.
 */
export const adminSaveExperience = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsedInput = input.safeParse(req.data);
  if (!parsedInput.success) invalidArgument(parsedInput.error.issues);
  const { experienceId, newId, addSessions, images } = parsedInput.data;
  const parsed = experienceInputSchema.safeParse(dropNulls(parsedInput.data.data));
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;

  const isCreate = !experienceId;
  const id = experienceId ?? newId ?? db.collection("experiences").doc().id;
  const ref = db.doc(`experiences/${id}`);
  const existing = await ref.get();
  if (isCreate && existing.exists) throw new HttpsError("already-exists", "Cette expérience existe déjà.");
  if (!isCreate && !existing.exists) throw new HttpsError("not-found", "Expérience introuvable.");
  // Une expérience peut être créée SANS date : « Prochaines dates bientôt », dates ajoutées plus tard.

  // Les photos doivent avoir été envoyées dans le dossier de CETTE expérience.
  for (const img of images) {
    if (!img.path.startsWith(`experiences/${id}/`) || img.path.includes("..")) {
      invalidArgument([{ path: ["images"], message: "invalidImagePath" }]);
    }
  }
  const [city, category, partner] = await Promise.all([
    db.doc(`cities/${v.cityId}`).get(),
    db.doc(`categories/${v.categoryId}`).get(),
    v.partnerId ? db.doc(`partners/${v.partnerId}`).get() : Promise.resolve(null),
  ]);
  if (!city.exists || city.data()?.isActive !== true) invalidArgument([{ path: ["cityId"], message: "required" }]);
  if (!category.exists) invalidArgument([{ path: ["categoryId"], message: "required" }]);
  if (v.partnerId && !partner?.exists) invalidArgument([{ path: ["partnerId"], message: "required" }]);

  const grouped = v.bookingMode === "group" || v.bookingMode === "social_dinner";
  const price = { amount: Math.round(v.priceDh * 100), currency: "MAD" as const };
  const slug = isCreate ? await uniqueSlug(slugify(`${v.titleFr} ${v.cityId}`)) : (existing.data()?.slug as string);
  const imageDocs = images.map((i) => ({ path: i.path, alt: { fr: i.alt || v.titleFr } }));
  const keepImages = !isCreate && images.length === 0 ? (existing.data()?.images ?? []) : imageDocs;
  const snapshot = {
    title: { fr: v.titleFr, ...(v.titleAr ? { ar: v.titleAr } : {}), ...(v.titleEn ? { en: v.titleEn } : {}) },
    slug,
    coverImagePath: keepImages[0]?.path ?? "",
    categoryId: v.categoryId,
    bookingMode: v.bookingMode,
    district: v.district,
    admission: v.admission,
  };

  const experience = {
    slug,
    title: snapshot.title,
    summary: { fr: v.summaryFr, ...(v.summaryAr ? { ar: v.summaryAr } : {}), ...(v.summaryEn ? { en: v.summaryEn } : {}) },
    description: { fr: v.descriptionFr, ...(v.descriptionAr ? { ar: v.descriptionAr } : {}), ...(v.descriptionEn ? { en: v.descriptionEn } : {}) },
    categoryId: v.categoryId,
    cityId: v.cityId,
    district: v.district,
    tags: [] as string[],
    partnerSnapshot: partner?.exists ? { name: partner.data()?.name } : null,
    venue: { name: v.venueName, address: v.address, revealPolicy: v.revealPolicy },
    images: keepImages,
    durationMinutes: v.durationMinutes,
    price,
    bookingMode: v.bookingMode,
    groupConfig: grouped ? { minSize: v.groupMin, targetSize: v.groupTarget, maxSize: v.groupMax } : null,
    maxSeatsPerBooking: v.maxSeatsPerBooking,
    memberPrice: v.memberPriceDh !== undefined ? { amount: Math.round(v.memberPriceDh * 100), currency: "MAD" } : null,
    membersOnly: v.membersOnly,
    admission: v.admission,
    requestMessageRequired: v.admission === "on_request" && v.requestMessageRequired,
    languages: v.languages,
    alcoholServed: v.alcoholServed,
    included: (v.included ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((fr) => ({ fr })),
    practicalInfo: { fr: v.practicalInfo ?? "" },
    cancellationPolicyId: v.cancellationPolicyId,
    // Une expérience archivée le reste tant qu'elle n'est pas réactivée (bouton « Réactiver »).
    status: existing.data()?.status === "archived" ? "archived" : v.status,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };

  const batch = db.batch();
  const now = Date.now();
  const planned = addSessions ? planSessionDates(v.sessions, v.durationMinutes, MOROCCO_TIMEZONE) : [];
  if (planned.some((d) => new Date(d.startAt).getTime() < now)) invalidArgument([{ path: ["sessions", "firstDate"], message: "inPast" }]);
  const archived = existing.data()?.status === "archived";
  if (archived && addSessions) refuse("archived", "Réactivez l'expérience avant d'ajouter des dates.");
  const sessionStatus = v.status === "published" ? "published" : "draft";
  for (const d of planned) {
    batch.set(db.collection("sessions").doc(), {
      experienceId: id,
      experienceSnapshot: snapshot,
      cityId: v.cityId,
      categoryId: v.categoryId,
      startAt: Timestamp.fromDate(new Date(d.startAt)),
      endAt: Timestamp.fromDate(new Date(d.endAt)),
      price,
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
    const nextStatus = archived ? status : status === "draft" && v.status === "published" ? "published" : status === "published" && v.status === "draft" && s.data().seatsConfirmed === 0 ? "draft" : status;
    batch.update(s.ref, { experienceSnapshot: snapshot, status: nextStatus });
  }
  const starts = [...future.docs.map((s) => (s.data().startAt as Timestamp).toMillis()), ...planned.map((d) => new Date(d.startAt).getTime())];
  const nextSessionAt = starts.length ? Timestamp.fromMillis(Math.min(...starts)) : null;

  if (isCreate) batch.set(ref, { ...experience, nextSessionAt, ratingAvg: 0, ratingCount: 0, createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid });
  else batch.update(ref, { ...experience, nextSessionAt });
  batch.set(db.doc(`experiences/${id}/private/economics`), {
    partnerId: v.partnerId || null,
    model: v.economicsModel,
    costPerSeat: v.economicsModel === "own" ? Math.round((v.costPerSeatDh ?? 0) * 100) : null,
    commissionPercent: v.economicsModel === "commission" ? v.commissionPercent : null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  // Lieu modifié : les personnes à qui il avait déjà été communiqué reçoivent le nouveau (notification + e-mail).
  const before = existing.data()?.venue;
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
  const alerted = planned.length > 0 && v.status === "published" ? await notifyNewDates(id, v.titleFr, slug, planned.length) : 0;
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: isCreate ? "experience.create" : "experience.update", targetType: "experience", targetId: id, after: { title: v.titleFr, status: v.status, sessionsAdded: planned.length, alerted } });
  return { ok: true, experienceId: id, slug, sessionsCreated: planned.length };
});
