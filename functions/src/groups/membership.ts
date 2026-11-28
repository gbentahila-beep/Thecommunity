import { FieldValue, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";

/**
 * Audit du 23/11 : une personne qui quitte une date (annulation, exclusion, suspension, changement de date) est
 * retirée de sa table DANS la même transaction : elle ne voit plus le groupe ni ses prénoms, et ne peut plus lire
 * ni écrire dans le chat (les règles et le serveur s'appuient sur `memberIds` et `arrivedUids`).
 * Écriture seulement : `group` doit avoir été lu dans la transaction avant toute écriture.
 */
export function removeFromGroup(tx: Transaction, group: DocumentSnapshot, uid: string, seats: number) {
  const g = group.data();
  if (!g || !((g.memberIds as string[] | undefined) ?? []).includes(uid)) return;
  const members = ((g.members as { uid: string }[] | undefined) ?? []).filter((m) => m.uid !== uid);
  tx.update(group.ref, {
    memberIds: FieldValue.arrayRemove(uid),
    arrivedUids: FieldValue.arrayRemove(uid),
    members,
    seats: Math.max(0, Number(g.seats ?? 0) - seats),
    [`late.${uid}`]: FieldValue.delete(),
    [`chatNotifiedAt.${uid}`]: FieldValue.delete(),
    removedUids: FieldValue.arrayUnion(uid),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
