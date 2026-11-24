import { venueKey } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/admin";

/**
 * docs/25, lot C — mémoire des restaurants : les lieux où chaque membre est déjà venu (réservations passées,
 * confirmées ou pointées, dont le lieu avait été communiqué). Clés « p:<partenaire> » et « n:<nom> » (venueKey).
 */
export async function visitedVenueKeys(uids: string[], excludeSessionId?: string, now = Date.now()): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  for (const uid of new Set(uids)) {
    const keys = new Set<string>();
    const snap = await db.collection("reservations").where("userId", "==", uid).get();
    for (const d of snap.docs) {
      const r = d.data();
      if (r.sessionId === excludeSessionId || !["confirmed", "attended", "no_show"].includes(String(r.status))) continue;
      const start = (r.sessionSnapshot?.startAt as Timestamp | undefined)?.toMillis() ?? Infinity;
      if (start >= now || !r.venue?.name) continue;
      for (const k of venueKey({ partnerId: r.venue.partnerId ?? null, name: r.venue.name })) keys.add(k);
    }
    out.set(uid, keys);
  }
  return out;
}

/** Nombre de personnes (parmi `uids`) déjà venues dans ce lieu. */
export function seenCount(visited: Map<string, Set<string>>, uids: string[], venue: { partnerId?: string | null; name?: string | null }): number {
  const keys = venueKey(venue);
  return uids.filter((u) => keys.some((k) => visited.get(u)?.has(k))).length;
}
