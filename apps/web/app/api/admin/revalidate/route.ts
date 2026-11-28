import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/data/firestore-source";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/http/same-origin";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Rafraîchit les pages publiques mises en cache après une modification dans le back-office
 * (nouvelle expérience, date, photo). Réservé à l'équipe et, depuis l'étape 24, aux comptes rattachés à un organisateur
 * (une réponse à un avis doit apparaître tout de suite sur la fiche). Ne renvoie aucune donnée.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const team = user.role === "admin" || user.role === "superadmin";
  const organizer = !team && Boolean((await adminDb().doc(`users/${user.uid}`).get()).get("organizerId"));
  if (!team && !organizer) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  revalidateTag(CATALOG_TAG, { expire: 0 }); // données du catalogue relues immédiatement
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
