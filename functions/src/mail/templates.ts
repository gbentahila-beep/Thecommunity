import { SITE_URL } from "../invoices/format";

type L = "fr" | "en" | "ar";
const lang = (l: string): L => (l === "en" || l === "ar" ? l : "fr");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const prefix = (l: L) => (l === "fr" ? "" : `/${l}`);

/** Gabarit commun : bandeau prune avec le logo et le motif « le fil » (identité 10f), lisible sur téléphone. */
function layout(l: L, o: { heading: string; paragraphs: string[]; cta?: { label: string; href: string }; footer: string }) {
  const dir = l === "ar" ? "rtl" : "ltr";
  const html = `<!doctype html><html lang="${l}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f8efe9;font-family:Helvetica,Arial,sans-serif;color:#221c1e">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#561a29;border-radius:16px 16px 0 0;padding:22px 24px"><img src="${SITE_URL}/images/brand/email-logo.png" width="200" height="35" alt="The Host Club." style="display:block;border:0;color:#f8efe8;font-family:Georgia,serif;font-size:22px"></div>
<div style="height:16px;background:#561a29 url('${SITE_URL}/images/brand/email-band.png') 0 0/280px 16px repeat-x"></div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
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

export function groupRevealedMail(o: { locale: string; firstName: string; title: string; when: string; table: string; venue: string | null; reservationId: string }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const t = {
    fr: { subject: `Votre table est prête : ${o.title}`, heading: `${o.firstName ? `${o.firstName}, v` : "V"}otre table vous attend`, p: [`Pour « ${o.title} », ${o.when}, vous êtes à la ${o.table}.`, o.venue ? `Rendez-vous : ${o.venue}.` : "Le lieu figure sur votre réservation.", "Découvrez les prénoms et centres d'intérêt de votre groupe sur votre réservation. À très vite !"], cta: "Voir ma table" },
    en: { subject: `Your table is ready: ${o.title}`, heading: `${o.firstName ? `${o.firstName}, y` : "Y"}our table is waiting`, p: [`For “${o.title}”, ${o.when}, you're at ${o.table}.`, o.venue ? `Meeting point: ${o.venue}.` : "The venue is on your booking.", "See your group's first names and interests on your booking. See you soon!"], cta: "See my table" },
    ar: { subject: `مائدتك جاهزة: ${o.title}`, heading: "مائدتك في انتظارك", p: [`في « ${o.title} »، ${o.when}، مكانك في ${o.table}.`, o.venue ? `المكان: ${o.venue}.` : "المكان مذكور في حجزك.", "اكتشف أسماء أفراد مجموعتك واهتماماتهم في صفحة حجزك. إلى اللقاء!"], cta: "عرض مائدتي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}

/** Pied des e-mails de service (sans facture jointe). */
const NOTICE_FOOTER: Record<L, string> = {
  fr: "Vous recevez cet e-mail car vous avez une réservation sur The Host Club.",
  en: "You're receiving this email because you have a booking on The Host Club.",
  ar: "تتوصل بهذه الرسالة لأن لديك حجزًا على The Host Club.",
};

export function reminderMail(o: { locale: string; kind: "d1" | "h3"; firstName: string; title: string; when: string; where: string; reservationId: string }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const d1 = o.kind === "d1";
  const t = {
    fr: {
      subject: d1 ? `C'est demain : ${o.title}` : `Dans 3 heures : ${o.title}`,
      heading: d1 ? `${o.firstName ? `${o.firstName}, c` : "C"}'est demain !` : "À tout à l'heure !",
      p: [`« ${o.title} », ${o.when}.`, `Lieu : ${o.where}.`, d1 ? "Un empêchement ? Prévenez-nous depuis votre réservation pour libérer votre place (l'annulation n'est plus remboursée à moins de 48 h)." : "Pensez à arriver quelques minutes en avance : votre prénom vous attend."],
      cta: "Voir ma réservation",
    },
    en: {
      subject: d1 ? `Tomorrow: ${o.title}` : `In 3 hours: ${o.title}`,
      heading: d1 ? `${o.firstName ? `${o.firstName}, i` : "I"}t's tomorrow!` : "See you soon!",
      p: [`“${o.title}”, ${o.when}.`, `Venue: ${o.where}.`, d1 ? "Can't make it? Let us know from your booking to free up your spot (cancellations within 48 hours aren't refunded)." : "Try to arrive a few minutes early: your name is waiting for you."],
      cta: "View my booking",
    },
    ar: {
      subject: d1 ? `غدًا: ${o.title}` : `بعد 3 ساعات: ${o.title}`,
      heading: d1 ? "الموعد غدًا!" : "إلى اللقاء قريبًا!",
      p: [`« ${o.title} »، ${o.when}.`, `المكان: ${o.where}.`, d1 ? "طرأ لك مانع؟ أخبرنا من صفحة حجزك لتحرير مكانك (الإلغاء قبل أقل من 48 ساعة غير قابل للاسترداد)." : "احرص على الحضور قبل الموعد بدقائق: اسمك في انتظارك."],
      cta: "عرض حجزي",
    },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}

export function changeMail(o: { locale: string; kind: "date" | "venue"; firstName: string; title: string; when: string; where: string; reservationId: string }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const date = o.kind === "date";
  const t = {
    fr: { subject: date ? `Nouvelle date : ${o.title}` : `Nouveau lieu : ${o.title}`, heading: date ? "Votre réservation a changé de date" : "Le lieu a changé", p: [`« ${o.title} » : ${o.when}.`, `Lieu : ${o.where}.`, "La nouvelle date ne vous convient pas ? Écrivez-nous : nous annulons votre place avec remboursement intégral."], cta: "Voir ma réservation" },
    en: { subject: date ? `New date: ${o.title}` : `New venue: ${o.title}`, heading: date ? "Your booking has a new date" : "The venue has changed", p: [`“${o.title}”: ${o.when}.`, `Venue: ${o.where}.`, "Doesn't suit you? Write to us: we'll cancel your spot with a full refund."], cta: "View my booking" },
    ar: { subject: date ? `موعد جديد: ${o.title}` : `مكان جديد: ${o.title}`, heading: date ? "تغيّر موعد حجزك" : "تغيّر المكان", p: [`« ${o.title} »: ${o.when}.`, `المكان: ${o.where}.`, "لا يناسبك؟ راسلنا: نلغي مقعدك مع استرداد كامل."], cta: "عرض حجزي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}
