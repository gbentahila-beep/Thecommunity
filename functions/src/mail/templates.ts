import { SITE_URL } from "../invoices/format";

type L = "fr" | "en" | "ar";
const lang = (l: string): L => (l === "en" || l === "ar" ? l : "fr");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const prefix = (l: L) => (l === "fr" ? "" : `/${l}`);

/** Gabarit commun : sobre, lisible sur téléphone, aux couleurs du site. */
function layout(l: L, o: { heading: string; paragraphs: string[]; cta?: { label: string; href: string }; footer: string }) {
  const dir = l === "ar" ? "rtl" : "ltr";
  const html = `<!doctype html><html lang="${l}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f8efe9;font-family:Helvetica,Arial,sans-serif;color:#221c1e">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#561a29;margin:0 0 20px">The Host Club.</p>
<div style="background:#fff;border-radius:16px;padding:24px">
<h1 style="font-family:Georgia,serif;font-size:22px;color:#561a29;margin:0 0 12px">${esc(o.heading)}</h1>
${o.paragraphs.map((p) => `<p style="line-height:1.55;margin:0 0 12px">${esc(p)}</p>`).join("\n")}
${o.cta ? `<p style="margin:20px 0 4px"><a href="${esc(o.cta.href)}" style="display:inline-block;background:#561a29;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${esc(o.cta.label)}</a></p>` : ""}
</div>
<p style="font-size:12px;color:#6b6166;line-height:1.5;margin:16px 4px">${esc(o.footer)}</p>
</div></body></html>`;
  const text = [o.heading, "", ...o.paragraphs, ...(o.cta ? ["", `${o.cta.label} : ${o.cta.href}`] : []), "", o.footer].join("\n");
  return { html, text };
}

const FOOTER: Record<L, string> = {
  fr: "Vous recevez cet e-mail car vous avez effectué un achat sur The Host Club. Votre document est joint en PDF et disponible dans votre espace, rubrique « Mes factures ».",
  en: "You're receiving this email because you made a purchase on The Host Club. Your document is attached as a PDF and available in your account under “My invoices”.",
  ar: "تتوصل بهذه الرسالة لأنك قمت بعملية شراء على The Host Club. وثيقتك مرفقة بصيغة PDF ومتاحة في حسابك ضمن « فواتيري ».",
};
const TEST_NOTE: Record<L, string> = {
  fr: "Paiement de TEST : aucune somme n'a été débitée.",
  en: "TEST payment: nothing was charged.",
  ar: "دفع تجريبي: لم يُقتطع أي مبلغ.",
};

export function reservationConfirmedMail(o: { locale: string; firstName: string; title: string; when: string; seats: number; total: string; number: string; reservationId: string; test: boolean }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const t = {
    fr: { subject: `C'est réservé : ${o.title}`, heading: `À bientôt, ${o.firstName || "et bienvenue"} !`, p: [`Votre place est confirmée pour « ${o.title} », ${o.when}.`, `${o.seats} place(s) · ${o.total} · document ${o.number}.`], cta: "Voir ma réservation" },
    en: { subject: `You're booked: ${o.title}`, heading: `See you soon${o.firstName ? `, ${o.firstName}` : ""}!`, p: [`Your seat is confirmed for “${o.title}”, ${o.when}.`, `${o.seats} seat(s) · ${o.total} · document ${o.number}.`], cta: "View my booking" },
    ar: { subject: `تم الحجز: ${o.title}`, heading: `إلى اللقاء قريبًا${o.firstName ? ` ${o.firstName}` : ""}!`, p: [`تم تأكيد مقعدك في « ${o.title} »، ${o.when}.`, `${o.seats} مقعد · ${o.total} · الوثيقة ${o.number}.`], cta: "عرض حجزي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: [...t.p, ...(o.test ? [TEST_NOTE[l]] : [])], cta: { label: t.cta, href }, footer: FOOTER[l] }) };
}

export function membershipMail(o: { locale: string; firstName: string; planName: string; until: string; total: string; number: string; test: boolean }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/abonnement`;
  const t = {
    fr: { subject: "Bienvenue parmi les membres", heading: `Merci${o.firstName ? `, ${o.firstName}` : ""} !`, p: [`Votre abonnement « ${o.planName} » est actif jusqu'au ${o.until}. Vos prix membres s'appliquent dès maintenant.`, `${o.total} · document ${o.number}.`], cta: "Mon abonnement" },
    en: { subject: "Welcome to the members", heading: `Thank you${o.firstName ? `, ${o.firstName}` : ""}!`, p: [`Your “${o.planName}” membership is active until ${o.until}. Member prices apply right away.`, `${o.total} · document ${o.number}.`], cta: "My membership" },
    ar: { subject: "مرحبًا بك بين الأعضاء", heading: `شكرًا${o.firstName ? ` ${o.firstName}` : ""}!`, p: [`اشتراكك « ${o.planName} » مفعّل حتى ${o.until}. أسعار الأعضاء تُطبَّق من الآن.`, `${o.total} · الوثيقة ${o.number}.`], cta: "اشتراكي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: [...t.p, ...(o.test ? [TEST_NOTE[l]] : [])], cta: { label: t.cta, href }, footer: FOOTER[l] }) };
}

export function refundMail(o: { locale: string; firstName: string; what: string; amount: string; number: string; relatedNumber: string; test: boolean }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/factures`;
  const t = {
    fr: { subject: `Remboursement de ${o.amount}`, heading: `Votre remboursement est en route`, p: [`Nous avons remboursé ${o.amount} pour « ${o.what} » sur votre moyen de paiement d'origine. Le délai d'apparition dépend de votre banque.`, `Avoir ${o.number} (sur ${o.relatedNumber}).`], cta: "Mes factures" },
    en: { subject: `Refund of ${o.amount}`, heading: "Your refund is on its way", p: [`We've refunded ${o.amount} for “${o.what}” to your original payment method. How long it takes to appear depends on your bank.`, `Credit note ${o.number} (for ${o.relatedNumber}).`], cta: "My invoices" },
    ar: { subject: `استرداد ${o.amount}`, heading: "استردادك في الطريق", p: [`أعدنا ${o.amount} عن « ${o.what} » إلى وسيلة الدفع الأصلية. تختلف مدة ظهوره حسب بنكك.`, `إشعار دائن ${o.number} (عن ${o.relatedNumber}).`], cta: "فواتيري" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: [...t.p, ...(o.test ? [TEST_NOTE[l]] : [])], cta: { label: t.cta, href }, footer: FOOTER[l] }) };
}
