import { db, FieldValue } from "./admin";

/** Journal des actions sensibles (docs/04 §6). Écrit uniquement par le serveur, lisible par les admins. */
export async function audit(entry: {
  actorUid: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.collection("auditLogs").add({ ...entry, at: FieldValue.serverTimestamp() });
}
