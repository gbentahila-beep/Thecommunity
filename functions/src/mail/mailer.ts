import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";

export type MailAttachment = { filename: string; storagePath: string };
export type MailMessage = {
  to: string;
  toName?: string;
  locale: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
  /** Type d'e-mail (pour la boîte d'envoi) et éléments liés. */
  kind: string;
  refs?: Record<string, string>;
};

type Provider = "outbox" | "brevo";

/**
 * Réglages d'envoi (settings/email). Par défaut : boîte d'envoi de TEST — l'e-mail est rangé et consultable
 * dans le back-office, rien n'est envoyé. Envoi réel avec Brevo : provider "brevo" + clé BREVO_API_KEY
 * (secret Cloud, jamais dans le code ni dans la base).
 */
async function emailSettings(): Promise<{ provider: Provider; fromEmail: string; fromName: string }> {
  const s = (await db.doc("settings/email").get()).data() ?? {};
  return {
    provider: s.provider === "brevo" ? "brevo" : "outbox",
    fromEmail: typeof s.fromEmail === "string" && s.fromEmail ? s.fromEmail : "no-reply@thehostclub.ma",
    fromName: typeof s.fromName === "string" && s.fromName ? s.fromName : "The Host Club",
  };
}

async function sendWithBrevo(msg: MailMessage, from: { fromEmail: string; fromName: string }): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: false, error: "missing_api_key" };
  const bucket = getStorage().bucket();
  const attachment = await Promise.all(
    (msg.attachments ?? []).map(async (a) => ({ name: a.filename, content: (await bucket.file(a.storagePath).download())[0].toString("base64") })),
  );
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from.fromEmail, name: from.fromName },
      to: [{ email: msg.to, ...(msg.toName ? { name: msg.toName } : {}) }],
      subject: msg.subject,
      htmlContent: msg.html,
      textContent: msg.text,
      ...(attachment.length ? { attachment } : {}),
    }),
  });
  if (!r.ok) return { ok: false, error: `brevo_${r.status}` };
  const body = (await r.json().catch(() => ({}))) as { messageId?: string };
  return { ok: true, id: body.messageId };
}

/**
 * Envoie (ou range dans la boîte d'envoi de test) un e-mail, et en garde toujours une trace dans `mail`
 * — lisible par l'équipe seulement. Ne lève jamais : un e-mail raté ne doit pas casser un paiement.
 */
export async function sendMail(msg: MailMessage): Promise<{ id: string; status: "outbox" | "sent" | "failed" }> {
  const ref = db.collection("mail").doc();
  try {
    const settings = await emailSettings();
    const base = { ...msg, attachments: msg.attachments ?? [], refs: msg.refs ?? {}, provider: settings.provider, from: `${settings.fromName} <${settings.fromEmail}>`, createdAt: FieldValue.serverTimestamp() };
    if (settings.provider === "outbox") {
      await ref.set({ ...base, status: "outbox" });
      return { id: ref.id, status: "outbox" };
    }
    const res = await sendWithBrevo(msg, settings);
    await ref.set({ ...base, status: res.ok ? "sent" : "failed", ...(res.ok ? { providerId: res.id ?? null, sentAt: FieldValue.serverTimestamp() } : { error: res.error }) });
    if (!res.ok) logger.error("Envoi d'e-mail échoué", { kind: msg.kind, error: res.error });
    return { id: ref.id, status: res.ok ? "sent" : "failed" };
  } catch (e) {
    logger.error("Envoi d'e-mail impossible", { kind: msg.kind, error: String(e) });
    await ref.set({ ...msg, status: "failed", error: String(e).slice(0, 300), createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    return { id: ref.id, status: "failed" };
  }
}
