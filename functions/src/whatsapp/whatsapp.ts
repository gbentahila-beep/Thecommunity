import { waNumber } from "@thecommunity/shared";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";

/**
 * Envoi WhatsApp automatique (docs/22, décision 44), sur le modèle des e-mails : chaque message est rangé dans
 * `whatsapp` (lisible par l'équipe seulement). Par défaut, boîte d'envoi : rien ne part, l'équipe envoie à la main
 * depuis WhatsApp Web (lien pré-rempli). Envoi réel : `settings/whatsapp` { provider: "meta", phoneNumberId,
 * templates } + jeton WHATSAPP_TOKEN (secret Cloud). WhatsApp n'accepte, pour un premier message, que des
 * **messages modèles validés par Meta** : leur texte est dans docs/22 § 17.H.
 */
export type WhatsAppKind = "request" | "reminder" | "recap" | "waitlist_offer";
export type WhatsAppMessage = { to: string; kind: WhatsAppKind; text: string; params: string[]; refs?: Record<string, string> };

type Settings = { provider: "outbox" | "meta"; phoneNumberId: string; language: string; templates: Record<WhatsAppKind, string> };

async function settings(): Promise<Settings> {
  const s = (await db.doc("settings/whatsapp").get()).data() ?? {};
  return {
    provider: s.provider === "meta" && s.phoneNumberId ? "meta" : "outbox",
    phoneNumberId: String(s.phoneNumberId ?? ""),
    language: String(s.language ?? "fr"),
    templates: { request: String(s.templates?.request ?? "wenzy_demande_lieu"), reminder: String(s.templates?.reminder ?? "wenzy_relance_lieu"), recap: String(s.templates?.recap ?? "wenzy_recap_lieu"), waitlist_offer: String(s.templates?.waitlist_offer ?? "wenzy_place_liberee") },
  };
}

async function sendWithMeta(msg: WhatsAppMessage, to: string, s: Settings): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, error: "missing_token" };
  const r = await fetch(`https://graph.facebook.com/v21.0/${s.phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: s.templates[msg.kind], language: { code: s.language }, components: [{ type: "body", parameters: msg.params.map((text) => ({ type: "text", text: text.slice(0, 1000) })) }] },
    }),
  });
  if (!r.ok) return { ok: false, error: `meta_${r.status}` };
  const body = (await r.json().catch(() => ({}))) as { messages?: { id?: string }[] };
  return { ok: true, id: body.messages?.[0]?.id };
}

/** Envoie (ou range dans la boîte d'envoi) un message WhatsApp ; ne lève jamais. Renvoie le statut. */
export async function sendWhatsApp(msg: WhatsAppMessage): Promise<"outbox" | "sent" | "failed" | "no_number"> {
  const to = waNumber(msg.to);
  if (!to) return "no_number";
  const ref = db.collection("whatsapp").doc();
  try {
    const s = await settings();
    const base = { to, kind: msg.kind, text: msg.text, params: msg.params, refs: msg.refs ?? {}, provider: s.provider, createdAt: FieldValue.serverTimestamp() };
    if (s.provider === "outbox") {
      await ref.set({ ...base, status: "outbox" });
      return "outbox";
    }
    const res = await sendWithMeta(msg, to, s);
    await ref.set({ ...base, status: res.ok ? "sent" : "failed", ...(res.ok ? { providerId: res.id ?? null, sentAt: FieldValue.serverTimestamp() } : { error: res.error }) });
    if (!res.ok) logger.error("Envoi WhatsApp échoué", { kind: msg.kind, error: res.error });
    return res.ok ? "sent" : "failed";
  } catch (e) {
    logger.error("Envoi WhatsApp impossible", { kind: msg.kind, error: String(e) });
    await ref.set({ to, kind: msg.kind, text: msg.text, status: "failed", error: String(e).slice(0, 300), createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    return "failed";
  }
}
