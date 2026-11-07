import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Droit d'accès (loi 09-08) : toutes les données du compte connecté, au format JSON. */
export async function GET() {
  if (!FIREBASE_ENABLED) return NextResponse.json({ error: "firebase-disabled" }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const db = adminDb();
  const [profile, reservations, payments, notifications, favorites, requests] = await Promise.all([
    db.doc(`users/${user.uid}`).get(),
    db.collection("reservations").where("userId", "==", user.uid).get(),
    db.collection("payments").where("userId", "==", user.uid).get(),
    db.collection(`users/${user.uid}/notifications`).get(),
    db.collection(`users/${user.uid}/favorites`).get(),
    db.collection("dataRequests").where("userId", "==", user.uid).get(),
  ]);
  const json = (v: unknown) => JSON.parse(JSON.stringify(v, (_k, x) => (x && typeof x === "object" && "_seconds" in x ? new Date(x._seconds * 1000).toISOString() : x)));
  const body = json({
    exportedAt: new Date().toISOString(),
    account: { uid: user.uid, email: user.email },
    profile: profile.data() ?? null,
    reservations: reservations.docs.map((d) => ({ id: d.id, ...d.data() })),
    payments: payments.docs.map((d) => ({ id: d.id, ...d.data() })),
    notifications: notifications.docs.map((d) => ({ id: d.id, ...d.data() })),
    favorites: favorites.docs.map((d) => d.id),
    dataRequests: requests.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="the-community-mes-donnees.json"',
      "Cache-Control": "no-store",
    },
  });
}
