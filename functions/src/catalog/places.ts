import { categoryInputSchema, cityInputSchema } from "@thecommunity/shared";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";

/** Paramètres → Villes (super-admin) : ajouter une ville, la renommer, l'ouvrir ou la marquer « bientôt ». Journalisé. */
export const adminSaveCity = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const v = cityInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const c = v.data;
  const ref = db.doc(`cities/${c.id}`);
  const before = await ref.get();
  const doc = {
    name: { fr: c.nameFr, ...(c.nameAr ? { ar: c.nameAr } : {}), ...(c.nameEn ? { en: c.nameEn } : {}) },
    isActive: c.isActive,
    // Une ville ouverte n'est plus « bientôt ».
    isComingSoon: c.isActive ? false : c.isComingSoon,
    order: c.order,
    districts: c.districts,
    // Étape 19 : région, pays, photo (vides = effacés).
    region: c.region || null,
    country: c.country || null,
    imagePath: c.imagePath || null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
    ...(before.exists ? {} : { countryCode: "MA", timezone: "Africa/Casablanca", currency: "MAD", createdAt: FieldValue.serverTimestamp() }),
  };
  // Le nom complet est remplacé (une traduction effacée disparaît vraiment).
  await ref.set(doc, { mergeFields: Object.keys(doc) });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before.exists ? "city.update" : "city.create", targetType: "city", targetId: c.id, before: before.data() ?? null, after: c });
  return { id: c.id, created: !before.exists };
});

/**
 * Paramètres → Catégories (super-admin) : créer une catégorie ou une sous-catégorie, ou la modifier (noms, description,
 * ordre, visibilité, mode de réservation par défaut, pictogramme, couleur, image). Journalisé.
 * Étape 19 : les catégories sont dynamiques ; les cinq historiques gardent leurs adresses (/casablanca/eat…).
 * Un seul niveau de sous-catégories : la parente doit être une catégorie principale, et une catégorie qui a des
 * sous-catégories ne peut pas devenir elle-même une sous-catégorie.
 */
export const adminSaveCategory = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const v = categoryInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const c = v.data;
  const ref = db.doc(`categories/${c.id}`);
  const before = await ref.get();
  const parentId = c.parentId || null;
  if (parentId) {
    if (parentId === c.id) throw new HttpsError("invalid-argument", "Une catégorie ne peut pas être sa propre parente.", { reason: "invalid_parent" });
    const parent = await db.doc(`categories/${parentId}`).get();
    if (!parent.exists || parent.get("parentId")) throw new HttpsError("invalid-argument", "La catégorie parente doit être une catégorie principale.", { reason: "invalid_parent" });
    const children = await db.collection("categories").where("parentId", "==", c.id).limit(1).get();
    if (!children.empty) throw new HttpsError("failed-precondition", "Cette catégorie a des sous-catégories : elle reste principale.", { reason: "has_children" });
  }
  const loc = (o: { fr: string; ar: string; en: string }) => ({ fr: o.fr, ...(o.ar ? { ar: o.ar } : {}), ...(o.en ? { en: o.en } : {}) });
  const doc = {
    name: loc(c.name),
    shortName: loc(c.shortName),
    description: loc(c.description),
    order: c.order,
    isActive: c.isActive,
    defaultBookingMode: c.defaultBookingMode,
    icon: c.icon,
    color: c.color || null,
    imagePath: c.imagePath || null,
    parentId,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
    ...(before.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };
  await ref.set(doc, { mergeFields: Object.keys(doc) });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before.exists ? "category.update" : "category.create", targetType: "category", targetId: c.id, before: before.data() ?? null, after: c });
  return { id: c.id, created: !before.exists };
});
