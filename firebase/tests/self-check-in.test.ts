/**
 * Arrivée autonome (docs/16, phase 7), contre l'émulateur Firestore : le participant indique son arrivée lui-même,
 * de 30 min avant le début à 1 h après ; une seule fois ; jamais pour la réservation de quelqu'un d'autre.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkInSelf } from "../../functions/src/reservations/self-check-in";

const PROJECT = "demo-thecommunity";
let admin: App;
const db = () => adminDb(admin);
const run = Date.now().toString(36);

beforeAll(() => {
  admin = initAdmin({ projectId: PROJECT }, "admin-self-check-in");
});
afterAll(async () => {
  await deleteApp(admin);
});

const reason = (p: Promise<unknown>) => p.then(() => "ok", (e: { details?: { reason?: string } }) => e.details?.reason ?? String(e));

describe("arrivée autonome", () => {
  it("fenêtre, propriétaire, une seule fois ; la réservation reste confirmée", async () => {
    const start = new Date("2026-12-05T19:00:00.000Z");
    const id = `arrivee-${run}`;
    await db().doc(`reservations/${id}`).set({ userId: `u-${run}`, status: "confirmed", sessionSnapshot: { startAt: Timestamp.fromDate(start) } });
    expect(await reason(checkInSelf(`u-${run}`, id, new Date("2026-12-05T18:00:00.000Z")))).toBe("too_early");
    expect(await reason(checkInSelf(`autre-${run}`, id, new Date("2026-12-05T18:45:00.000Z")))).not.toBe("ok");
    expect(await reason(checkInSelf(`u-${run}`, id, new Date("2026-12-05T20:30:00.000Z")))).toBe("too_late");
    await checkInSelf(`u-${run}`, id, new Date("2026-12-05T18:45:00.000Z"));
    const after = (await db().doc(`reservations/${id}`).get()).data()!;
    expect(after.arrivedAt).toBeTruthy();
    expect(after.status).toBe("confirmed");
    // Une seconde fois : rien ne change (même hors fenêtre).
    expect(await reason(checkInSelf(`u-${run}`, id, new Date("2026-12-06T10:00:00.000Z")))).toBe("ok");
    const cancelled = `annulee-${run}`;
    await db().doc(`reservations/${cancelled}`).set({ userId: `u-${run}`, status: "cancelled", sessionSnapshot: { startAt: Timestamp.fromDate(start) } });
    expect(await reason(checkInSelf(`u-${run}`, cancelled, new Date("2026-12-05T18:45:00.000Z")))).toBe("not_checkable");
  });
});
