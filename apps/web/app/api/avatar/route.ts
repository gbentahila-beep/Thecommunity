import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

const PATH = /^users\/([A-Za-z0-9]{1,128})\/avatar\/[\w.-]{1,120}$/;
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * Photo de profil d'un membre (docs/22) : les photos ne sont jamais publiques dans Storage. Elles sont servies ici
 * à la personne elle-même, aux membres d'un de ses groupes et à l'équipe ; sinon « introuvable » (on affiche alors
 * sa tête de Bab).
 */
export async function GET(req: Request) {
  if (!FIREBASE_ENABLED) return NextResponse.json({ error: "firebase-disabled" }, { status: 404 });
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const m = PATH.exec(path);
  if (!m) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const owner = m[1]!;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const isTeam = user.role === "admin" || user.role === "superadmin";
  let allowed = isTeam || user.uid === owner;
  if (!allowed) {
    const groups = await adminDb().collection("groups").where("memberIds", "array-contains", user.uid).get();
    allowed = groups.docs.some((g) => ((g.get("memberIds") as string[] | undefined) ?? []).includes(owner));
  }
  // La photo doit être celle du profil (pas un autre fichier du même dossier).
  if (allowed) allowed = (await adminDb().doc(`users/${owner}`).get()).get("photoPath") === path;
  if (!allowed) return NextResponse.json({ error: "not-found" }, { status: 404 });
  try {
    const [bytes] = await adminStorage().bucket().file(path).download();
    const ext = path.split(".").pop()?.toLowerCase() ?? "jpg";
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "content-type": TYPES[ext] ?? "image/jpeg", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
    });
  } catch {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
}
