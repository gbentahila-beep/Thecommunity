/**
 * Alertes « nouvelles tables et activités » (accueil), contre l'émulateur Firestore : file d'attente à la
 * première publication, inscription d'un visiteur avec double confirmation, envoi groupé (membres abonnés +
 * visiteurs confirmés), jamais deux fois, arrêt par le lien de l'e-mail, ménage des inscriptions non confirmées.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  confirmVisitor,
  queueIfFirstPublication,
  sendPendingNewExperienceAlerts,
  stopVisitor,
  subscribeVisitor,
  subscriberId,
} from "../../functions/src/experiences/new-experience-alerts";

const PROJECT = "demo-thecommunity";
let admin: App;
const db = () => adminDb(admin);
const run = Date.now().toString(36);
const mailsTo = async (to: string, kind: string) => (await db().collection("mail").where("to", "==", to).where("kind", "==", kind).get()).docs.map((d) => d.data());

beforeAll(() => {
  admin = initAdmin({ projectId: PROJECT }, "admin-alerts");
});
afterAll(async () => {
  await deleteApp(admin);
});

describe("alertes nouvelles expériences", () => {
  const visitor = `visiteur.${run}@example.com`;
  const memberEmail = `membre.${run}@example.com`;
  const expId = `alerte-${run}`;
  const slug = `atelier-alerte-${run}`;

  it("visiteur confirmé + membre abonné reçoivent l'alerte, une seule fois ; arrêt par le lien", async () => {
    // Inscription : « en attente », e-mail de confirmation avec le jeton ; pas de second e-mail tout de suite.
    expect(await subscribeVisitor(visitor, "fr")).toBe("sent");
    const pending = (await db().doc(`alertSubscribers/${subscriberId(visitor)}`).get()).data()!;
    expect(pending.status).toBe("pending");
    expect(String((await mailsTo(visitor, "alerts_confirm"))[0]!.text)).toContain(`/alertes?confirmer=${pending.token}`);
    expect(await subscribeVisitor(visitor.toUpperCase(), "fr")).toBe("recent");
    expect(await mailsTo(visitor, "alerts_confirm")).toHaveLength(1);
    expect(await confirmVisitor(pending.token)).toBe(true);
    expect(await subscribeVisitor(visitor, "fr")).toBe("already");
    expect(await confirmVisitor("a".repeat(48))).toBe(false);

    // Un membre qui a activé l'alerte, un autre non.
    await db().doc(`users/alerte-on-${run}`).set({ email: memberEmail, locale: "en", status: "active", notificationPrefs: { email: true, push: false, marketingEmail: false, newExperiences: true } });
    await db().doc(`users/alerte-off-${run}`).set({ email: `off.${run}@example.com`, locale: "fr", status: "active", notificationPrefs: { email: true, push: false, marketingEmail: false } });

    // Première publication → mise en file (une seule fois dans la vie de l'expérience).
    const exp = { slug, title: { fr: "Atelier alerte", en: "Alert workshop" } };
    await db().doc(`experiences/${expId}`).set({ ...exp, status: "published" });
    expect(await queueIfFirstPublication(expId, { ...exp, status: "draft" }, { ...exp, status: "published" })).toBe(true);
    expect(await queueIfFirstPublication(expId, { ...exp, status: "published" }, { ...exp, status: "published", price: 1 })).toBe(false);

    const res = await sendPendingNewExperienceAlerts();
    expect(res.experiences).toBeGreaterThanOrEqual(1);
    const toVisitor = (await mailsTo(visitor, "new_experiences"))[0]!;
    expect(String(toVisitor.text)).toContain(`/experiences/${slug}`);
    expect(String(toVisitor.text)).toContain(`/alertes?arreter=${pending.token}`);
    expect(String((await mailsTo(memberEmail, "new_experiences"))[0]!.text)).toContain("Alert workshop");
    expect(await mailsTo(`off.${run}@example.com`, "new_experiences")).toHaveLength(0);

    // Jamais deux fois : ni au passage suivant, ni après un retrait puis une republication.
    await sendPendingNewExperienceAlerts();
    expect(await queueIfFirstPublication(expId, { ...exp, status: "draft" }, { ...exp, status: "published" })).toBe(false);
    await sendPendingNewExperienceAlerts();
    expect(await mailsTo(visitor, "new_experiences")).toHaveLength(1);

    // Arrêt depuis le lien de l'e-mail : l'adresse est effacée.
    await stopVisitor(pending.token);
    expect((await db().doc(`alertSubscribers/${subscriberId(visitor)}`).get()).exists).toBe(false);
  });

  it("efface une inscription jamais confirmée au bout de 7 jours", async () => {
    const old = `ancien.${run}@example.com`;
    await db().doc(`alertSubscribers/${subscriberId(old)}`).set({ email: old, locale: "fr", status: "pending", token: "b".repeat(48), createdAt: Timestamp.fromMillis(Date.now() - 8 * 86_400_000) });
    await sendPendingNewExperienceAlerts();
    expect((await db().doc(`alertSubscribers/${subscriberId(old)}`).get()).exists).toBe(false);
  });
});
