import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * Audit du 23/11 (lot 6) — retour du navigateur après la page du CMI (okUrl / failUrl, en POST ou GET).
 * N'ACCORDE RIEN : seule la notification serveur du CMI (cmiCallback) confirme une place. On renvoie la personne
 * vers sa réservation (ou la page Abonnement) avec l'état connu à cet instant.
 */
async function back(req: NextRequest) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paiement") ?? "";
  const ok = url.searchParams.get("r") === "ok";
  const home = new URL("/espace/reservations", url.origin);
  if (!FIREBASE_ENABLED || !/^[A-Za-z0-9_-]{1,128}$/.test(paymentId)) return NextResponse.redirect(home, 303);
  const pay = (await adminDb().doc(`payments/${paymentId}`).get()).data();
  if (!pay || pay.provider !== "cmi") return NextResponse.redirect(home, 303);
  // Notification serveur pas encore arrivée : « en cours » ; la page se mettra à jour d'elle-même au prochain affichage.
  const flag = pay.status === "succeeded" ? "accepte" : pay.status === "failed" || !ok ? "refuse" : "en-cours";
  const path = pay.purpose === "membership" ? "/abonnement" : `/espace/reservations/${pay.reservationId}`;
  return NextResponse.redirect(new URL(`${path}?paiement=${flag}`, url.origin), 303);
}

export const POST = back;
export const GET = back;
