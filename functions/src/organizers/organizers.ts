import {
  organizerApplicationSchema,
  organizerDecisionSchema,
  organizerProfileSchema,
  organizerSlug,
  ORGANIZER_STATUS_LABELS,
  ORGANIZER_TERMS_VERSION,
  type OrganizerStatus,
} from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { auth, db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { organizerMail } from "../mail/templates";
import { sendMail } from "../mail/mailer";
import { refuse } from "../reservations/refuse";
import { requireOrganizer } from "./access";

/**
 * Étape 20 — organisateurs : inscription, décisions de l'équipe, profil public, validation des activités.
 * Toutes les écritures passent ici (règles Firestore : aucune écriture par le navigateur).
 */

const ORG_ID = /^[A-Za-z0-9_-]{6,40}$/;

async function uniqueOrganizerSlug(base: string, ignoreId?: string) {
  const root = base || "organisateur";
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const snap = await db.collection("organizers").where("slug", "==", candidate).limit(2).get();
    if (snap.docs.every((d) => d.id === ignoreId)) return candidate;
  }
  throw new HttpsError("already-exists", "Impossible de générer une adresse unique.");
}

/** Prévient chaque membre de l'organisation (notification dans l'espace + e-mail). */
async function notifyOrganizer(orgId: string, o: { type: string; heading: string; paragraphs: string[]; path: string; ctaLabel?: string }) {
  const details = (await db.doc(`organizers/${orgId}/private/details`).get()).data() ?? {};
  const uids = (details.memberUids as string[] | undefined) ?? [];
  for (const uid of uids) {
    await db.collection(`users/${uid}/notifications`).add({
      type: o.type,
      title: { fr: o.heading, ar: o.heading, en: o.heading },
      body: { fr: o.paragraphs.join(" "), ar: o.paragraphs.join(" "), en: o.paragraphs.join(" ") },
      link: o.path,
      createdAt: FieldValue.serverTimestamp(),
    });
    const user = await auth.getUser(uid).catch(() => null);
    if (user?.email) {
      await sendMail({ to: user.email, locale: "fr", ...organizerMail({ heading: o.heading, paragraphs: o.paragraphs, ctaLabel: o.ctaLabel ?? "Ouvrir mon espace organisateur", path: o.path }), kind: o.type, refs: { organizerId: orgId } }).catch(() => undefined);
    }
  }
}

/**
 * Candidature organisateur (ou nouvel envoi après une demande de complément). Le compte reste « en attente »
 * jusqu'à la décision de l'équipe ; rien n'est visible sur le site avant la validation.
 */
export const applyAsOrganizer = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  if (token.email_verified !== true) refuse("email_not_verified", "Confirmez votre adresse e-mail.");
  const parsed = organizerApplicationSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  // Fichiers : uniquement ceux que la personne a envoyés dans SON dossier.
  const mine = (p: string) => p.startsWith(`organizer-uploads/${uid}/`) && !p.includes("..");
  if (v.documents.some((d) => !mine(d.path))) invalidArgument([{ path: ["documents"], message: "invalidDocument" }]);
  if (v.logoPath && !mine(v.logoPath)) invalidArgument([{ path: ["logoPath"], message: "invalidImage" }]);

  const userRef = db.doc(`users/${uid}`);
  const user = (await userRef.get()).data() ?? {};
  if (user.status === "suspended") throw new HttpsError("permission-denied", "Compte suspendu.", { reason: "suspended" });
  const [city, ...cats] = await Promise.all([db.doc(`cities/${v.cityId}`).get(), ...v.categoryIds.map((c) => db.doc(`categories/${c}`).get())]);
  if (!city.exists) invalidArgument([{ path: ["cityId"], message: "required" }]);
  if (cats.some((c) => !c.exists || c.get("parentId"))) invalidArgument([{ path: ["categoryIds"], message: "pickOne" }]);

  const existingId = user.organizerId as string | undefined;
  let orgId = existingId;
  if (existingId) {
    const status = (await db.doc(`organizers/${existingId}`).get()).get("status") as OrganizerStatus | undefined;
    // Un seul compte organisateur par personne ; un nouvel envoi n'est possible qu'après une demande de complément.
    if (status !== "info_requested") refuse("already_organizer", "Vous avez déjà un compte organisateur.");
  } else {
    orgId = db.collection("organizers").doc().id;
  }
  const slug = await uniqueOrganizerSlug(organizerSlug(v.businessName), orgId);
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(
    db.doc(`organizers/${orgId}`),
    {
      name: v.businessName,
      slug,
      description: { fr: v.description },
      cityId: v.cityId,
      categoryIds: v.categoryIds,
      logoPath: null,
      website: v.website || null,
      instagram: v.instagram ? v.instagram.replace(/^@/, "") : null,
      status: "pending",
      ratingAvg: 0,
      ratingCount: 0,
      activityCount: 0,
      updatedAt: now,
      ...(existingId ? {} : { createdAt: now }),
    },
    { merge: true },
  );
  batch.set(
    db.doc(`organizers/${orgId}/private/details`),
    {
      ownerUid: uid,
      memberUids: [uid],
      contactName: v.contactName,
      email: v.email,
      phone: v.phone,
      address: v.address,
      documents: v.documents,
      pendingLogoPath: v.logoPath || null,
      terms: { version: ORGANIZER_TERMS_VERSION, acceptedAt: Timestamp.now() },
      submittedAt: now,
      history: FieldValue.arrayUnion({ at: Timestamp.now(), by: uid, action: existingId ? "resubmitted" : "submitted" }),
      updatedAt: now,
    },
    { merge: true },
  );
  batch.set(userRef, { organizerId: orgId, updatedAt: now }, { merge: true });
  await batch.commit();
  await audit({ actorUid: uid, actorRole: roleOf(req), action: existingId ? "organizer.resubmit" : "organizer.apply", targetType: "organizer", targetId: orgId!, after: { name: v.businessName, documents: v.documents.length } });
  return { organizerId: orgId, status: "pending" };
});

/** Copie le logo envoyé avec la candidature vers le dossier public de l'organisateur (lisible par tous). */
async function publishLogo(orgId: string, from: string | null | undefined): Promise<string | null> {
  if (!from) return null;
  const bucket = getStorage().bucket();
  const ext = (from.split(".").pop() ?? "webp").toLowerCase().replace(/[^a-z]/g, "") || "webp";
  const to = `organizers/${orgId}/public/logo-${Date.now().toString(36)}.${ext}`;
  try {
    await bucket.file(from).copy(bucket.file(to));
    return to;
  } catch {
    return null; // le logo pourra être ajouté depuis le profil
  }
}

/**
 * Décision de l'équipe sur un compte organisateur : valider, refuser, demander un complément, suspendre, réactiver.
 * Validation : rôle « organizer » + structure (claim orgId) ; suspension : accès retiré tout de suite (jetons révoqués).
 * Un message est obligatoire pour refuser, demander un complément ou suspendre ; il est transmis à l'organisateur.
 */
export const adminDecideOrganizer = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = organizerDecisionSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { organizerId, decision, message } = parsed.data;
  if (!ORG_ID.test(organizerId)) invalidArgument([{ path: ["organizerId"], message: "required" }]);
  const ref = db.doc(`organizers/${organizerId}`);
  const detailsRef = db.doc(`organizers/${organizerId}/private/details`);
  const [org, details] = await Promise.all([ref.get(), detailsRef.get()]);
  if (!org.exists) throw new HttpsError("not-found", "Organisateur introuvable.", { reason: "not_found" });
  const status = org.get("status") as OrganizerStatus;
  const allowed: Record<typeof decision, OrganizerStatus[]> = {
    approve: ["pending", "info_requested"],
    reject: ["pending", "info_requested"],
    request_info: ["pending"],
    suspend: ["approved"],
    reactivate: ["suspended", "rejected"],
  };
  if (!allowed[decision].includes(status)) refuse("invalid_transition", `Action impossible : le compte est « ${ORGANIZER_STATUS_LABELS[status]} ».`);
  const next: OrganizerStatus = { approve: "approved", reject: "rejected", request_info: "info_requested", suspend: "suspended", reactivate: "approved" }[decision] as OrganizerStatus;

  const patch: Record<string, unknown> = { status: next, updatedAt: FieldValue.serverTimestamp() };
  if (next === "approved" && !org.get("logoPath")) {
    const logo = await publishLogo(organizerId, details.get("pendingLogoPath"));
    if (logo) patch.logoPath = logo;
  }
  if (next === "approved" && !org.get("approvedAt")) patch.approvedAt = FieldValue.serverTimestamp();
  await ref.update(patch);
  await detailsRef.set(
    {
      decisionMessage: message || null,
      history: FieldValue.arrayUnion({ at: Timestamp.now(), by: actor.uid, action: decision, message: message || null }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Droits : membres de l'organisation. L'équipe garde son rôle (admin) ; les autres deviennent « organizer ».
  const uids = (details.get("memberUids") as string[] | undefined) ?? [];
  for (const uid of uids) {
    const u = await auth.getUser(uid).catch(() => null);
    if (!u) continue;
    const claims = { ...(u.customClaims ?? {}) } as Record<string, unknown>;
    const team = claims.role === "admin" || claims.role === "superadmin";
    if (next === "approved") {
      claims.orgId = organizerId;
      if (!team) claims.role = "organizer";
    } else {
      delete claims.orgId;
      if (claims.role === "organizer") delete claims.role;
    }
    await auth.setCustomUserClaims(uid, claims);
    await db.doc(`users/${uid}`).set({ role: (claims.role as string | undefined) ?? "user", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (next === "suspended") await auth.revokeRefreshTokens(uid);
  }

  const name = String(org.get("name") ?? "");
  const texts: Record<typeof decision, { heading: string; paragraphs: string[] }> = {
    approve: { heading: "Votre compte organisateur est validé", paragraphs: [`Bienvenue ${name} ! Vous pouvez maintenant créer vos activités : l'équipe les relit avant publication.`] },
    reactivate: { heading: "Votre compte organisateur est réactivé", paragraphs: [`Le compte ${name} est de nouveau actif.`] },
    reject: { heading: "Votre demande de compte organisateur", paragraphs: ["Nous ne pouvons pas donner suite à votre demande pour le moment.", `Message de l'équipe : ${message}`] },
    request_info: { heading: "Un complément est nécessaire", paragraphs: ["Pour valider votre compte organisateur, nous avons besoin d'un complément.", `Message de l'équipe : ${message}`, "Modifiez votre demande depuis votre espace, puis renvoyez-la."] },
    suspend: { heading: "Votre compte organisateur est suspendu", paragraphs: [`Message de l'équipe : ${message}`, "Contactez-nous pour toute question."] },
  };
  await notifyOrganizer(organizerId, { type: `organizer_${decision}`, ...texts[decision], path: "/pro" });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `organizer.${decision}`, targetType: "organizer", targetId: organizerId, before: { status }, after: { status: next, message: message || null } });
  return { organizerId, status: next };
});

/** Profil public de l'organisateur validé (description, liens, logo) et coordonnées privées. */
export const organizerUpdateProfile = onCall({ region: REGION }, async (req) => {
  const o = await requireOrganizer(req, { approvedOnly: true });
  const parsed = organizerProfileSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  if (v.logoPath && !v.logoPath.startsWith(`organizers/${o.orgId}/public/`)) invalidArgument([{ path: ["logoPath"], message: "invalidImage" }]);
  await db.doc(`organizers/${o.orgId}`).update({
    description: { fr: v.description, ...(v.descriptionAr ? { ar: v.descriptionAr } : {}), ...(v.descriptionEn ? { en: v.descriptionEn } : {}) },
    website: v.website || null,
    instagram: v.instagram ? v.instagram.replace(/^@/, "") : null,
    ...(v.logoPath !== undefined ? { logoPath: v.logoPath || null } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`organizers/${o.orgId}/private/details`).set({ phone: v.phone, address: v.address, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await audit({ actorUid: o.uid, actorRole: "organizer", action: "organizer.profile", targetType: "organizer", targetId: o.orgId });
  return { ok: true };
});

/**
 * Relecture par l'équipe d'une activité envoyée par un organisateur : publier (ses dates en brouillon sont publiées)
 * ou refuser avec un message ; « relue » efface le signalement d'une activité publiée modifiée par l'organisateur.
 */
export const adminReviewExperience = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z
    .object({ experienceId: z.string().regex(ORG_ID), decision: z.enum(["publish", "reject", "reviewed"]), message: z.string().trim().max(800, "tooLong").optional().or(z.literal("")) })
    .superRefine((v, ctx) => {
      if (v.decision === "reject" && (v.message ?? "").length < 5) ctx.addIssue({ code: "custom", path: ["message"], message: "required" });
    })
    .safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { experienceId, decision, message } = parsed.data;
  const ref = db.doc(`experiences/${experienceId}`);
  const e = (await ref.get()).data();
  if (!e) throw new HttpsError("not-found", "Activité introuvable.", { reason: "not_found" });
  const orgId = e.organizerId as string | null | undefined;
  if (!orgId) refuse("not_organizer_experience", "Cette activité n'a pas d'organisateur.");
  if (decision === "reviewed") {
    await ref.update({ reviewFlag: false, reviewedAt: FieldValue.serverTimestamp(), reviewedBy: actor.uid });
  } else {
    if (e.status !== "pending_review") refuse("not_pending", "Cette activité n'attend pas de validation.");
    const org = (await db.doc(`organizers/${orgId}`).get()).data();
    if (decision === "publish" && org?.status !== "approved") refuse("organizer_not_approved", "Le compte de l'organisateur n'est pas validé.");
    const batch = db.batch();
    if (decision === "publish") {
      batch.update(ref, { status: "published", reviewFlag: false, publishedAt: FieldValue.serverTimestamp(), reviewedAt: FieldValue.serverTimestamp(), reviewedBy: actor.uid, rejectionMessage: null });
      const drafts = await db.collection("sessions").where("experienceId", "==", experienceId).where("status", "==", "draft").get();
      for (const s of drafts.docs) if ((s.data().startAt as Timestamp).toMillis() > Date.now()) batch.update(s.ref, { status: "published" });
      batch.update(db.doc(`organizers/${orgId}`), { activityCount: FieldValue.increment(1) });
    } else {
      batch.update(ref, { status: "rejected", rejectionMessage: message, reviewedAt: FieldValue.serverTimestamp(), reviewedBy: actor.uid });
    }
    await batch.commit();
    const title = String(e.title?.fr ?? "");
    await notifyOrganizer(orgId!, {
      type: decision === "publish" ? "organizer_experience_published" : "organizer_experience_rejected",
      heading: decision === "publish" ? `« ${title} » est en ligne` : `« ${title} » n'est pas publiée`,
      paragraphs: decision === "publish" ? ["L'équipe a validé votre activité : elle est visible et réservable sur le site."] : [`Message de l'équipe : ${message}`, "Modifiez l'activité, puis renvoyez-la pour validation."],
      path: `/pro/activites/${experienceId}`,
      ctaLabel: "Voir l'activité",
    });
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `experience.review.${decision}`, targetType: "experience", targetId: experienceId, after: { message: message || null } });
  return { ok: true };
});
