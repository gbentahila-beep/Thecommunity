import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Rafraîchit les pages publiques mises en cache après une modification dans le back-office
 * (nouvelle expérience, date, photo). Réservé aux admins.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
