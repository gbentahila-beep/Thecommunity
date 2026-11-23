import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * Téléchargement d'une facture / d'un avoir en PDF : réservé à son titulaire et à l'équipe.
 * Le fichier n'est jamais lisible directement dans Storage (règles : tout refusé).
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/factures/[id]">) {
  if (!FIREBASE_ENABLED) return NextResponse.json({ error: "firebase-disabled" }, { status: 404 });
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{1,140}$/.test(id)) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const inv = (await adminDb().doc(`invoices/${id}`).get()).data();
  const isTeam = user.role === "admin" || user.role === "superadmin";
  // Même réponse « introuvable » pour un document d'autrui : on ne révèle pas son existence.
  if (!inv || (inv.userId !== user.uid && !isTeam)) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (!inv.pdfReady) return NextResponse.json({ error: "pdf-not-ready" }, { status: 409 });
  const [bytes] = await adminStorage().bucket().file(inv.pdfPath).download();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${String(inv.number).replace(/[^A-Za-z0-9-]/g, "")}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
