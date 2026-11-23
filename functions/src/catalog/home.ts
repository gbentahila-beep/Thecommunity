import { homeSettingsFromInput, homeSettingsInputSchema } from "@thecommunity/shared";
import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";

/**
 * Étape 23 — accueil modifiable par l'équipe (settings/home) : bannière, sections et leur ordre, activités
 * mises en avant (« Coups de cœur », aussi en tête du catalogue). Lu par le site avec le SDK Admin.
 */
export const adminSaveHomeSettings = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = homeSettingsInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const settings = homeSettingsFromInput(parsed.data);
  if (settings.featuredExperienceIds.length) {
    const docs = await db.getAll(...settings.featuredExperienceIds.map((id) => db.doc(`experiences/${id}`)));
    const bad = docs.filter((d) => !d.exists || d.get("status") !== "published").map((d) => d.id);
    if (bad.length) refuse("not_published", `Activité introuvable ou non publiée : ${bad.join(", ")}.`);
  }
  await db.doc("settings/home").set({ ...settings, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  await audit({
    actorUid: actor.uid,
    actorRole: roleOf(req),
    action: "settings.home",
    targetType: "settings",
    targetId: "home",
    after: { banner: settings.banner?.enabled ? settings.banner.text.fr : null, sections: settings.sections.filter((s) => s.enabled).map((s) => s.id), featured: settings.featuredExperienceIds },
  });
  return { ok: true };
});
