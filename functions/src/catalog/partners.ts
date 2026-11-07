import { partnerInputSchema } from "@thecommunity/shared";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const TEAM = ["admin", "superadmin"] as const;

/** Expériences qui utilisent ce partenaire (modèle économique privé de chaque expérience). */
async function linkedExperiences(partnerId: string): Promise<{ id: string; title: string }[]> {
  const exps = await db.collection("experiences").select("title").get();
  if (exps.empty) return [];
  const ecos = await db.getAll(...exps.docs.map((e) => db.doc(`experiences/${e.id}/private/economics`)));
  return ecos.flatMap((eco, i) => (eco.data()?.partnerId === partnerId ? [{ id: exps.docs[i]!.id, title: String(exps.docs[i]!.data().title?.fr ?? "") }] : []));
}

/** Ajouter ou modifier un partenaire (équipe). Journalisé, avant / après. */
export const adminSavePartner = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = z.object({ id: idSchema.optional(), data: z.unknown() }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = partnerInputSchema.safeParse(parsed.data.data);
  if (!v.success) invalidArgument(v.error.issues);
  const data = { ...v.data, defaultCommissionPercent: v.data.model === "commission" ? v.data.defaultCommissionPercent : 0 };
  const city = await db.doc(`cities/${data.cityId}`).get();
  if (!city.exists) invalidArgument([{ path: ["cityId"], message: "required" }]);
  const ref = parsed.data.id ? db.doc(`partners/${parsed.data.id}`) : db.collection("partners").doc();
  const before = parsed.data.id ? await ref.get() : null;
  if (parsed.data.id && !before?.exists) throw new HttpsError("not-found", "Partenaire introuvable.", { reason: "not_found" });
  await ref.set({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
    ...(before ? {} : { createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid }),
  }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before ? "partner.update" : "partner.create", targetType: "partner", targetId: ref.id, before: before?.data() ?? null, after: data });
  return { id: ref.id };
});

/**
 * Archiver / réactiver (équipe) ou supprimer (super-admin) un partenaire.
 * Un partenaire encore utilisé par une expérience ne peut pas être supprimé : on l'archive.
 */
export const adminPartnerAction = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = z.object({ id: idSchema, action: z.enum(["archive", "activate", "delete"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { id, action } = parsed.data;
  const ref = db.doc(`partners/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Partenaire introuvable.", { reason: "not_found" });
  if (action === "delete") {
    if (roleOf(req) !== "superadmin") throw new HttpsError("permission-denied", "Suppression réservée aux super-admins.", { reason: "superadmin_only" });
    const linked = await linkedExperiences(id);
    if (linked.length) throw new HttpsError("failed-precondition", "Partenaire utilisé par des expériences : archivez-le.", { reason: "linked", experiences: linked });
    await ref.delete();
  } else {
    await ref.update({ status: action === "archive" ? "archived" : "active", updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `partner.${action}`, targetType: "partner", targetId: id, before: snap.data() ?? null });
  return { ok: true };
});

/**
 * Candidature reçue par le formulaire « Devenir partenaire » : créer le partenaire (statut « prospect »,
 * coordonnées reprises), l'écarter, ou la remettre à traiter. Journalisé.
 */
export const adminPartnerApplicationAction = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = z.object({ applicationId: idSchema, action: z.enum(["convert", "decline", "reopen"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { applicationId, action } = parsed.data;
  const appRef = db.doc(`partnerApplications/${applicationId}`);
  const result = await db.runTransaction(async (tx) => {
    const app = await tx.get(appRef);
    const a = app.data();
    if (!a) throw new HttpsError("not-found", "Candidature introuvable.", { reason: "not_found" });
    if (action === "convert") {
      if (a.partnerId) return { partnerId: a.partnerId as string };
      const ref = db.collection("partners").doc();
      const cityId = String(a.city ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "casablanca";
      const known = (await tx.get(db.doc(`cities/${cityId}`))).exists;
      tx.set(ref, {
        name: a.businessName,
        type: a.type,
        status: "prospect",
        cityId: known ? cityId : "casablanca",
        district: "",
        address: "",
        contactName: a.contactName,
        contactEmail: a.email,
        contactPhone: a.phone ?? "",
        link: a.link ?? "",
        model: "purchase",
        defaultCommissionPercent: 0,
        notes: `Candidature du site : ${a.message ?? ""}`.slice(0, 2000),
        applicationId,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
      tx.update(appRef, { status: "converted", partnerId: ref.id, handledAt: FieldValue.serverTimestamp(), handledBy: actor.uid });
      return { partnerId: ref.id };
    }
    tx.update(appRef, { status: action === "decline" ? "declined" : "new", handledAt: FieldValue.serverTimestamp(), handledBy: actor.uid });
    return { partnerId: null };
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `partnerApplication.${action}`, targetType: "partnerApplication", targetId: applicationId, after: result });
  return result;
});
