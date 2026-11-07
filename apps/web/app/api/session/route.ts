import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED, SESSION_COOKIE, SESSION_DAYS, USE_EMULATORS } from "@/lib/firebase/config";

/** Refuse les appels venant d'un autre site (protection CSRF en plus du cookie SameSite=Lax). */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !origin || origin === req.nextUrl.origin;
}

/** Échange un jeton d'identification Firebase récent contre un cookie de session httpOnly. */
export async function POST(req: NextRequest) {
  if (!FIREBASE_ENABLED) return NextResponse.json({ error: "firebase-disabled" }, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  if (!body || typeof body.idToken !== "string") return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    const decoded = await adminAuth().verifyIdToken(body.idToken, true);
    // Un cookie n'est émis que pour une connexion récente (moins de 5 minutes).
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) return NextResponse.json({ error: "recent-login-required" }, { status: 401 });
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const cookie = await adminAuth().createSessionCookie(body.idToken, { expiresIn });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: !USE_EMULATORS,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "invalid-token" }, { status: 401 });
  }
}

/** Déconnexion : supprime le cookie et révoque les sessions de l'utilisateur. */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (FIREBASE_ENABLED && cookie) {
    const decoded = await adminAuth().verifySessionCookie(cookie).catch(() => null);
    if (decoded) await adminAuth().revokeRefreshTokens(decoded.sub).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
