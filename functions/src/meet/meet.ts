import { avoidSchema, INVITES_PER_DAY, inviteSchema, meetAgainSchema, meetWindowOpen, pairKey } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireAuth, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";

/**
 * Étape 31 — « Mes rencontres ». Un souhait « revoir » reste PRIVÉ (meetWishes, jamais lu par le navigateur) ;
 * seule la réciprocité crée une connexion visible des deux (connections/{paire}). Pas de messagerie : on s'invite à
 * une expérience (notification). « Ne plus être réuni » (avoids/{uid}) efface souhaits et connexion et est pris en
 * compte par la composition des groupes.
 */

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate() : new Date(String(v ?? 0)));
const connId = (a: string, b: string) => pairKey(a, b).replace("|", "_");

async function avoidsOf(uid: string): Promise<string[]> {
  return ((await db.doc(`avoids/${uid}`).get()).get("uids") as string[] | undefined) ?? [];
}

/** Le groupe révélé, terminé, où les deux personnes étaient (et où `uid` était présent·e). */
async function sharedGroup(groupId: string, uid: string, otherUid: string) {
  const g = (await db.doc(`groups/${groupId}`).get()).data();
  if (!g || g.status !== "revealed" || !(g.memberIds as string[]).includes(uid) || !(g.memberIds as string[]).includes(otherUid) || uid === otherUid) {
    throw new HttpsError("not-found", "Groupe introuvable.", { reason: "not_found" });
  }
  const s = (await db.doc(`sessions/${g.sessionId}`).get()).data() ?? {};
  const mine = await db.collection("reservations").where("sessionId", "==", g.sessionId).where("userId", "==", uid).get();
  if (!mine.docs.some((d) => ["attended", "confirmed"].includes(String(d.get("status"))))) refuse("not_attended", "Vous n'étiez pas à cette expérience.");
  return { g, s, endAt: iso(s.endAt ?? s.startAt) };
}

export const setMeetAgain = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = meetAgainSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { groupId, otherUid, wish } = parsed.data;
  const { g, s, endAt } = await sharedGroup(groupId, uid, otherUid);
  if (!meetWindowOpen(endAt, new Date())) refuse("meet_window", "Il est trop tôt ou trop tard pour cette rencontre.");
  if ((await avoidsOf(uid)).includes(otherUid)) refuse("avoided", "Vous avez demandé à ne plus être réuni·e avec cette personne.");
  const mineRef = db.doc(`meetWishes/${uid}_${otherUid}`);
  const theirsRef = db.doc(`meetWishes/${otherUid}_${uid}`);
  const connRef = db.doc(`connections/${connId(uid, otherUid)}`);
  if (!wish) {
    await mineRef.delete();
    await connRef.delete();
    return { ok: true, matched: false };
  }
  // L'autre a pu demander à ne plus être réuni·e avec moi : mon souhait est gardé mais ne crée jamais de lien (et rien n'est dit).
  const blocked = (await avoidsOf(otherUid)).includes(uid);
  const names = Object.fromEntries((g.members as { uid: string; firstName: string }[]).filter((m) => m.uid === uid || m.uid === otherUid).map((m) => [m.uid, m.firstName]));
  const title = String(s.experienceSnapshot?.title?.fr ?? "");
  const matched = await db.runTransaction(async (tx) => {
    const [theirs, conn] = await Promise.all([tx.get(theirsRef), tx.get(connRef)]);
    tx.set(mineRef, { from: uid, to: otherUid, groupId, sessionId: g.sessionId, createdAt: FieldValue.serverTimestamp() });
    if (blocked || !theirs.exists || conn.exists) return conn.exists;
    tx.create(connRef, {
      uids: [uid, otherUid].sort(),
      names,
      groupId,
      sessionId: g.sessionId,
      experienceTitle: title,
      metAt: s.startAt ?? null,
      matchedAt: FieldValue.serverTimestamp(),
    });
    for (const [to, other] of [[uid, otherUid], [otherUid, uid]] as const) {
      tx.set(db.collection(`users/${to}/notifications`).doc(), {
        type: "meet_match",
        title: { fr: "C'est réciproque !", en: "It's mutual!", ar: "الإعجاب متبادل!" },
        body: {
          fr: `${names[other] ?? ""} aimerait aussi vous revoir. Invitez-vous à une prochaine expérience depuis « Mes rencontres ».`,
          en: `${names[other] ?? ""} would also like to see you again. Invite each other to a next experience from “My connections”.`,
          ar: `${names[other] ?? ""} يرغب أيضاً في لقائك مجدداً. ادعوا بعضكما إلى تجربة قادمة من «لقاءاتي».`,
        },
        link: "/espace/rencontres",
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return true;
  });
  return { ok: true, matched };
});

export const setAvoid = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = avoidSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { otherUid, avoid } = parsed.data;
  if (otherUid === uid) invalidArgument([{ path: ["otherUid"], message: "self" }]);
  // Seulement quelqu'un avec qui l'on a partagé un groupe révélé.
  const shared = await db.collection("groups").where("memberIds", "array-contains", uid).where("status", "==", "revealed").get();
  if (!shared.docs.some((d) => (d.get("memberIds") as string[]).includes(otherUid))) throw new HttpsError("not-found", "Personne introuvable.", { reason: "not_found" });
  await db.doc(`avoids/${uid}`).set({ uids: avoid ? FieldValue.arrayUnion(otherUid) : FieldValue.arrayRemove(otherUid), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (avoid) {
    const batch = db.batch();
    batch.delete(db.doc(`meetWishes/${uid}_${otherUid}`));
    batch.delete(db.doc(`meetWishes/${otherUid}_${uid}`));
    batch.delete(db.doc(`connections/${connId(uid, otherUid)}`));
    await batch.commit();
  }
  await audit({ actorUid: uid, actorRole: roleOf(req), action: avoid ? "meet.avoid" : "meet.unavoid", targetType: "user", targetId: otherUid });
  return { ok: true };
});

export const inviteToSession = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = inviteSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, toUids } = parsed.data;
  const s = (await db.doc(`sessions/${sessionId}`).get()).data() ?? {};
  if (!["published", "full"].includes(String(s.status)) || iso(s.startAt).getTime() <= Date.now()) refuse("not_open", "Cette date n'est plus ouverte.");
  const conns = await db.getAll(...toUids.map((t) => db.doc(`connections/${connId(uid, t)}`)));
  if (conns.some((c) => !c.exists)) refuse("not_connected", "Vous ne pouvez inviter que des personnes avec qui c'est réciproque.");
  const since = Timestamp.fromMillis(Date.now() - 86_400_000);
  const sent = (await db.collection("invitations").where("from", "==", uid).where("createdAt", ">=", since).count().get()).data().count;
  if (sent + toUids.length > INVITES_PER_DAY) refuse("too_many_invites", "Trop d'invitations aujourd'hui : réessayez demain.");
  const me = String((await db.doc(`users/${uid}`).get()).get("firstName") ?? "");
  const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
  const title = String(e.title?.fr ?? s.experienceSnapshot?.title?.fr ?? "");
  const when = iso(s.startAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Casablanca" });
  const batch = db.batch();
  for (const to of toUids) {
    batch.set(db.collection("invitations").doc(), { from: uid, to, sessionId, createdAt: FieldValue.serverTimestamp() });
    batch.set(db.collection(`users/${to}/notifications`).doc(), {
      type: "meet_invite",
      title: { fr: `${me} vous invite`, en: `${me} invites you`, ar: `${me} يدعوك` },
      body: {
        fr: `${me} vous propose de vous retrouver à « ${title} », le ${when}.`,
        en: `${me} suggests meeting up again at “${String(e.title?.en ?? title)}”, on ${when}.`,
        ar: `يقترح عليك ${me} أن تلتقيا في «${String(e.title?.ar ?? title)}» يوم ${when}.`,
      },
      link: `/experiences/${String(e.slug ?? "")}`,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  await audit({ actorUid: uid, actorRole: roleOf(req), action: "meet.invite", targetType: "session", targetId: sessionId, after: { count: toUids.length } });
  return { ok: true, invited: toUids.length };
});
