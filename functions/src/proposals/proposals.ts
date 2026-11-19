import { outingProposalSchema, proposalDecisionSchema, PROPOSALS_PER_DAY } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";

/**
 * 18d — Sorties proposées par les membres de confiance.
 * Un membre de confiance (statut donné par l'équipe) propose une sortie ; rien n'est publié tant que l'équipe
 * ne l'a pas transformée en expérience (formulaire pré-rempli, `proposalId`) ou refusée avec un message.
 */
export const submitOutingProposal = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  if (token.email_verified !== true) refuse("email_not_verified", "Confirmez votre adresse e-mail.");
  const parsed = outingProposalSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const user = (await db.doc(`users/${uid}`).get()).data();
  if (user?.status === "suspended") throw new HttpsError("permission-denied", "Compte suspendu.", { reason: "suspended" });
  if (user?.trustedHost !== true) refuse("not_trusted", "Les propositions sont réservées aux membres de confiance.");
  const since = Timestamp.fromMillis(Date.now() - 86_400_000);
  const recent = await db.collection("outingProposals").where("userId", "==", uid).where("createdAt", ">=", since).count().get();
  if (recent.data().count >= PROPOSALS_PER_DAY) refuse("too_many_proposals", "Trop de propositions aujourd'hui : réessayez demain.");
  const v = parsed.data;
  const ref = db.collection("outingProposals").doc();
  await ref.set({
    userId: uid,
    firstName: String(user?.firstName ?? ""),
    cityId: String(user?.cityId ?? "casablanca"),
    title: v.title,
    categoryId: v.categoryId,
    description: v.description,
    district: v.district,
    venueIdea: v.venueIdea ?? "",
    datesIdea: v.datesIdea,
    capacity: v.capacity,
    priceIdeaDh: v.priceIdeaDh ?? null,
    level: v.level ?? null,
    willHost: v.willHost,
    notes: v.notes ?? "",
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { proposalId: ref.id };
});

/** L'équipe refuse une proposition, avec un message transmis au membre. (L'acceptation passe par la création de l'expérience.) */
export const adminDecideProposal = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = proposalDecisionSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { proposalId, message } = parsed.data;
  const ref = db.doc(`outingProposals/${proposalId}`);
  const p = await db.runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data();
    if (!cur) throw new HttpsError("not-found", "Proposition introuvable.", { reason: "not_found" });
    if (cur.status !== "pending") refuse("proposal_not_pending", "Cette proposition a déjà été traitée.");
    tx.update(ref, { status: "declined", decisionMessage: message, decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection(`users/${cur.userId}/notifications`).doc(), {
      type: "proposal_declined",
      title: { fr: "Votre proposition de sortie", ar: "اقتراح خرجتك", en: "Your outing proposal" },
      body: { fr: `« ${cur.title} » n'est pas retenue pour l'instant. Message de l'équipe : ${message}`, ar: `لم يتم اعتماد «${cur.title}» حالياً. رسالة الفريق: ${message}`, en: `“${cur.title}” isn't going ahead for now. Message from the team: ${message}` },
      link: "/espace/proposer",
      createdAt: FieldValue.serverTimestamp(),
    });
    return cur;
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "proposal.decline", targetType: "outingProposal", targetId: proposalId, after: { userId: p.userId, title: p.title } });
  return { ok: true };
});

/** L'équipe accorde ou retire le statut de membre de confiance (peut proposer des sorties). */
export const adminSetTrustedHost = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ uid: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), trusted: z.boolean() }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { uid, trusted } = parsed.data;
  const ref = db.doc(`users/${uid}`);
  const before = (await ref.get()).data();
  if (!before) throw new HttpsError("not-found", "Utilisateur introuvable.", { reason: "not_found" });
  if (before.status === "suspended" && trusted) refuse("suspended", "Compte suspendu.");
  await ref.set({ trustedHost: trusted, trustedHostAt: trusted ? FieldValue.serverTimestamp() : null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (trusted && before.trustedHost !== true) {
    await db.collection(`users/${uid}/notifications`).add({
      type: "welcome",
      title: { fr: "Vous pouvez proposer vos sorties", ar: "يمكنك الآن اقتراح خرجاتك", en: "You can now propose outings" },
      body: { fr: "L'équipe vous a ouvert la possibilité de proposer vos propres sorties. Nous les relisons avant de les publier.", ar: "فتح لك الفريق إمكانية اقتراح خرجاتك الخاصة. نراجعها قبل نشرها.", en: "The team has opened up proposing your own outings. We review each one before publishing it." },
      link: "/espace/proposer",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "user.setTrustedHost", targetType: "user", targetId: uid, before: before.trustedHost === true, after: { trusted } });
  return { ok: true, trusted };
});
