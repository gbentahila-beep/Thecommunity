import { categoryInputSchema, cityInputSchema, CATEGORY_KEYS } from "@thecommunity/shared";
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
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
    ...(before.exists ? {} : { countryCode: "MA", timezone: "Africa/Casablanca", currency: "MAD", createdAt: FieldValue.serverTimestamp() }),
  };
  // Le nom complet est remplacé (une traduction effacée disparaît vraiment).
  await ref.set(doc, { mergeFields: Object.keys(doc) });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before.exists ? "city.update" : "city.create", targetType: "city", targetId: c.id, before: before.data() ?? null, after: c });
  return { id: c.id, created: !before.exists };
});

/** Paramètres → Univers (super-admin) : noms, description, ordre, visibilité, mode de réservation par défaut. Journalisé. */
export const adminSaveCategory = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const v = categoryInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const c = v.data;
  // Les univers sont fixes (couleurs et pictogrammes du site) : on les modifie, on n'en crée pas.
  if (!(CATEGORY_KEYS as readonly string[]).includes(c.id)) throw new HttpsError("invalid-argument", "Univers inconnu.", { reason: "unknown_category" });
  const ref = db.doc(`categories/${c.id}`);
  const before = await ref.get();
  const loc = (o: { fr: string; ar: string; en: string }) => ({ fr: o.fr, ...(o.ar ? { ar: o.ar } : {}), ...(o.en ? { en: o.en } : {}) });
  const doc = {
    name: loc(c.name),
    shortName: loc(c.shortName),
    description: loc(c.description),
    order: c.order,
    isActive: c.isActive,
    defaultBookingMode: c.defaultBookingMode,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };
  await ref.set(doc, { mergeFields: Object.keys(doc) });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "category.update", targetType: "category", targetId: c.id, before: before.data() ?? null, after: c });
  return { id: c.id };
});
