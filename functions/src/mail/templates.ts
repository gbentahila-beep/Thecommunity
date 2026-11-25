import { SITE_URL } from "../invoices/format";

export type L = "fr" | "en" | "ar";
export const lang = (l: string): L => (l === "en" || l === "ar" ? l : "fr");
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const prefix = (l: L) => (l === "fr" ? "" : `/${l}`);

/** Gabarit commun Wenzy : en-tête encre avec le logo, bandeau en dégradé corail → violet, lisible sur téléphone. */
export function layout(l: L, o: { heading: string; paragraphs: string[]; list?: { label: string; href: string }[]; cta?: { label: string; href: string }; footer: string }) {
  const dir = l === "ar" ? "rtl" : "ltr";
  const html = `<!doctype html><html lang="${l}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f6f1ea;font-family:Helvetica,Arial,sans-serif;color:#141414">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#141414;border-radius:16px 16px 0 0;padding:18px 24px"><img src="${SITE_URL}/images/brand/email-logo.png" width="150" height="60" alt="Wenzy" style="display:block;border:0;color:#f6f1ea;font-family:Georgia,serif;font-size:22px"></div>
<div style="height:8px;background:#ff6a4d url('${SITE_URL}/images/brand/email-band.png') 0 0/100% 8px no-repeat;background-image:linear-gradient(100deg,#ff6a4d,#c25be8)"></div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;color:#141414;margin:0 0 12px">${esc(o.heading)}</h1>
${o.paragraphs.map((p) => `<p style="line-height:1.55;margin:0 0 12px">${esc(p)}</p>`).join("\n")}
${o.list?.length ? `<ul style="padding:0 0 0 18px;margin:0 0 12px">${o.list.map((i) => `<li style="line-height:1.55;margin:0 0 6px"><a href="${esc(i.href)}" style="color:#8a35b5;font-weight:bold">${esc(i.label)}</a></li>`).join("")}</ul>` : ""}
${o.cta ? `<p style="margin:20px 0 4px"><a href="${esc(o.cta.href)}" style="display:inline-block;background:#ff6a4d;background-image:linear-gradient(100deg,#ff6a4d,#c25be8);color:#141414;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${esc(o.cta.label)}</a></p>` : ""}
</div>
<p style="font-size:12px;color:#66625c;line-height:1.5;margin:16px 4px">${esc(o.footer)}</p>
</div></body></html>`;
  const text = [o.heading, "", ...o.paragraphs, ...(o.list ?? []).map((i) => `- ${i.label} : ${i.href}`), ...(o.cta ? ["", `${o.cta.label} : ${o.cta.href}`] : []), "", o.footer].join("\n");
  return { html, text };
}

const FOOTER: Record<L, string> = {
  fr: "Vous recevez cet e-mail car vous avez effectué un achat sur Wenzy. Votre document est joint en PDF et disponible dans votre espace, rubrique « Mes factures ».",
  en: "You're receiving this email because you made a purchase on Wenzy. Your document is attached as a PDF and available in your account under “My invoices”.",
  ar: "تتوصل بهذه الرسالة لأنك قمت بعملية شراء على Wenzy. وثيقتك مرفقة بصيغة PDF ومتاحة في حسابك ضمن « فواتيري ».",
};
const TEST_NOTE: Record<L, string> = {
  fr: "Paiement de TEST : aucune somme n'a été débitée.",
  en: "TEST payment: nothing was charged.",
  ar: "دفع تجريبي: لم يُقتطع أي مبلغ.",
};

export function reservationConfirmedMail(o: { locale: string; firstName: string; title: string; when: string; seats: number; total: string; number: string; reservationId: string; test: boolean; onSite?: string | null; ticket?: boolean }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  // docs/22 : billet seulement avec une hôtesse ou un organisateur ; sinon, chacun indique son arrivée dans l'appli.
  const ticket = o.ticket !== false;
  const t = {
    fr: { subject: `C'est réservé : ${o.title}`, heading: `À bientôt, ${o.firstName || "et bienvenue"} !`, p: [`Votre place est confirmée pour « ${o.title} », ${o.when}.`, `${o.seats} place(s) · ${o.total} · document ${o.number}.`, ticket ? "Votre billet avec QR code vous attend dans votre réservation : présentez-le à l'accueil." : "Le jour J, indiquez votre arrivée depuis votre réservation (« Je suis arrivé·e ») : vous y retrouverez votre groupe."], cta: ticket ? "Voir mon billet" : "Voir ma réservation" },
    en: { subject: `You're booked: ${o.title}`, heading: `See you soon${o.firstName ? `, ${o.firstName}` : ""}!`, p: [`Your seat is confirmed for “${o.title}”, ${o.when}.`, `${o.seats} seat(s) · ${o.total} · document ${o.number}.`, ticket ? "Your ticket with its QR code is in your booking: show it when you arrive." : "On the day, check in from your booking (“I'm here”): that's where you'll find your group."], cta: ticket ? "View my ticket" : "View my booking" },
    ar: { subject: `تم الحجز: ${o.title}`, heading: `إلى اللقاء قريبًا${o.firstName ? ` ${o.firstName}` : ""}!`, p: [`تم تأكيد مقعدك في « ${o.title} »، ${o.when}.`, `${o.seats} مقعد · ${o.total} · الوثيقة ${o.number}.`, ticket ? "تذكرتك برمز QR موجودة في حجزك: اعرضها عند الاستقبال." : "يوم التجربة، أكّد وصولك من حجزك («وصلت»): ستجد هناك مجموعتك."], cta: ticket ? "عرض تذكرتي" : "عرض حجزي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: [...t.p, ...(o.onSite ? [o.onSite] : []), ...(o.test ? [TEST_NOTE[l]] : [])], cta: { label: t.cta, href }, footer: FOOTER[l] }) };
}

export function membershipMail(o: { locale: string; firstName: string; planName: string; until: string; total: string; number: string; test: boolean; carnet?: boolean }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/abonnement`;
  // docs/22 § 17.I : pass (places incluses) ou carnet (crédits).
  const t = {
    fr: { subject: o.carnet ? "Votre carnet est prêt" : "Votre pass est actif", heading: `Merci${o.firstName ? `, ${o.firstName}` : ""} !`, p: [o.carnet ? `« ${o.planName} » : vos crédits sont valables jusqu'au ${o.until}. 1 crédit par place, à choisir au moment de réserver.` : `« ${o.planName} » est actif jusqu'au ${o.until} : vos places sont incluses, sans frais Wenzy.`, `${o.total} · document ${o.number}.`], cta: o.carnet ? "Mon carnet" : "Mon pass" },
    en: { subject: o.carnet ? "Your pack is ready" : "Your pass is active", heading: `Thank you${o.firstName ? `, ${o.firstName}` : ""}!`, p: [o.carnet ? `“${o.planName}”: your credits are valid until ${o.until}. 1 credit per seat, chosen when you book.` : `“${o.planName}” is active until ${o.until}: your seats are included, no Wenzy fees.`, `${o.total} · document ${o.number}.`], cta: o.carnet ? "My pack" : "My pass" },
    ar: { subject: o.carnet ? "دفترك جاهز" : "الباس الخاص بك مفعّل", heading: `شكرًا${o.firstName ? ` ${o.firstName}` : ""}!`, p: [o.carnet ? `« ${o.planName} »: رصيدك صالح حتى ${o.until}. رصيد واحد لكل مكان، تختاره عند الحجز.` : `« ${o.planName} » مفعّل حتى ${o.until}: أماكنك مشمولة دون رسوم Wenzy.`, `${o.total} · الوثيقة ${o.number}.`], cta: o.carnet ? "دفتري" : "الباس" },
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
export const NOTICE_FOOTER: Record<L, string> = {
  fr: "Vous recevez cet e-mail car vous avez une réservation sur Wenzy.",
  en: "You're receiving this email because you have a booking on Wenzy.",
  ar: "تتوصل بهذه الرسالة لأن لديك حجزًا على Wenzy.",
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

export function changeMail(o: { locale: string; kind: "date" | "venue"; firstName: string; title: string; when: string; where: string; reservationId: string; self?: boolean }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const date = o.kind === "date";
  // Audit 23/11 : changement de date fait par le membre lui-même (confirmation, avec l'invitation calendrier jointe).
  const self = o.self === true && date;
  const t = {
    fr: { subject: date ? `Nouvelle date : ${o.title}` : `Nouveau lieu : ${o.title}`, heading: self ? "Votre changement de date est confirmé" : date ? "Votre réservation a changé de date" : "Le lieu a changé", p: [`« ${o.title} » : ${o.when}.`, `Lieu : ${o.where}.`, self ? "L'invitation jointe met à jour votre agenda. En cas d'annulation, le remboursement reste calculé sur votre date d'origine." : "La nouvelle date ne vous convient pas ? Écrivez-nous : nous annulons votre place avec remboursement intégral."], cta: "Voir ma réservation" },
    en: { subject: date ? `New date: ${o.title}` : `New venue: ${o.title}`, heading: self ? "Your date change is confirmed" : date ? "Your booking has a new date" : "The venue has changed", p: [`“${o.title}”: ${o.when}.`, `Venue: ${o.where}.`, self ? "The attached invitation updates your calendar. If you cancel, the refund is still based on your original date." : "Doesn't suit you? Write to us: we'll cancel your spot with a full refund."], cta: "View my booking" },
    ar: { subject: date ? `موعد جديد: ${o.title}` : `مكان جديد: ${o.title}`, heading: self ? "تم تأكيد تغيير الموعد" : date ? "تغيّر موعد حجزك" : "تغيّر المكان", p: [`« ${o.title} »: ${o.when}.`, `المكان: ${o.where}.`, self ? "الدعوة المرفقة تُحدّث مفكرتك. في حال الإلغاء، يُحتسب الاسترداد على موعدك الأصلي." : "لا يناسبك؟ راسلنا: نلغي مقعدك مع استرداد كامل."], cta: "عرض حجزي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}

/** Étape 5h : instructions de virement (référence, montant, coordonnées, échéance). */
export function transferInstructionsMail(o: {
  locale: string; firstName: string; what: string; amount: string; reference: string; deadline: string | null;
  holder: string; bank: string; rib: string; iban: string; swift: string; paymentId: string;
  /** Rappel envoyé environ 12 h avant l'échéance (B). */
  reminder?: boolean;
}) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/paiement/virement/${o.paymentId}`;
  const bankLines = {
    fr: [`Bénéficiaire : ${o.holder}`, `Banque : ${o.bank}`, `RIB : ${o.rib}`, ...(o.iban ? [`IBAN : ${o.iban}`] : []), ...(o.swift ? [`SWIFT / BIC : ${o.swift}`] : [])],
    en: [`Beneficiary: ${o.holder}`, `Bank: ${o.bank}`, `RIB: ${o.rib}`, ...(o.iban ? [`IBAN: ${o.iban}`] : []), ...(o.swift ? [`SWIFT / BIC: ${o.swift}`] : [])],
    ar: [`المستفيد: ${o.holder}`, `البنك: ${o.bank}`, `RIB: ${o.rib}`, ...(o.iban ? [`IBAN: ${o.iban}`] : []), ...(o.swift ? [`SWIFT / BIC: ${o.swift}`] : [])],
  }[l];
  const t = {
    fr: {
      subject: `Virement à effectuer : ${o.reference}`,
      heading: "Plus qu'une étape : votre virement",
      p: [
        `Pour « ${o.what} », faites un virement de ${o.amount}${o.deadline ? ` avant le ${o.deadline}` : ""}.`,
        `Indiquez impérativement la référence ${o.reference} dans le motif du virement.`,
        ...bankLines,
        o.deadline ? "Votre place est réservée jusqu'à cette échéance. Dès réception, nous confirmons votre réservation et vous envoyons votre billet." : "Dès réception, nous activons votre achat et vous envoyons votre facture.",
      ],
      cta: "Voir les instructions",
    },
    en: {
      subject: `Bank transfer to make: ${o.reference}`,
      heading: "One last step: your bank transfer",
      p: [
        `For “${o.what}”, please transfer ${o.amount}${o.deadline ? ` before ${o.deadline}` : ""}.`,
        `Make sure to write the reference ${o.reference} in the transfer description.`,
        ...bankLines,
        o.deadline ? "Your spot is held until then. As soon as the transfer arrives, we confirm your booking and send your ticket." : "As soon as the transfer arrives, we activate your purchase and send your invoice.",
      ],
      cta: "View the instructions",
    },
    ar: {
      subject: `تحويل بنكي مطلوب: ${o.reference}`,
      heading: "خطوة أخيرة: تحويلك البنكي",
      p: [
        `من أجل « ${o.what} »، يُرجى تحويل ${o.amount}${o.deadline ? ` قبل ${o.deadline}` : ""}.`,
        `اكتب المرجع ${o.reference} في خانة سبب التحويل.`,
        ...bankLines,
        o.deadline ? "مكانك محجوز حتى هذا الموعد. فور توصلنا بالتحويل نؤكد حجزك ونرسل لك تذكرتك." : "فور توصلنا بالتحويل نفعّل مشترياتك ونرسل لك الفاتورة.",
      ],
      cta: "عرض التعليمات",
    },
  }[l];
  if (o.reminder) {
    const r = {
      fr: { subject: `Rappel : virement ${o.reference} à faire${o.deadline ? ` avant le ${o.deadline}` : ""}`, heading: "Petit rappel pour votre virement" },
      en: { subject: `Reminder: transfer ${o.reference}${o.deadline ? ` due before ${o.deadline}` : ""}`, heading: "A quick reminder about your transfer" },
      ar: { subject: `تذكير: التحويل ${o.reference}${o.deadline ? ` قبل ${o.deadline}` : ""}`, heading: "تذكير بخصوص تحويلك" },
    }[l];
    return { subject: r.subject, ...layout(l, { heading: r.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
  }
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}

/** Étape 5h : virement non reçu à l'échéance, place libérée. */
export function transferExpiredMail(o: { locale: string; firstName: string; title: string; reference: string; reservationId: string }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const t = {
    fr: { subject: `Place libérée : ${o.title}`, heading: "Nous n'avons pas reçu votre virement", p: [`Le virement ${o.reference} pour « ${o.title} » n'est pas arrivé à temps : la place a été libérée.`, "Vous l'avez déjà envoyé ? Répondez à cet e-mail avec la preuve du virement : nous vous redonnons une place s'il en reste, sinon nous vous remboursons."], cta: "Voir ma réservation" },
    en: { subject: `Spot released: ${o.title}`, heading: "We haven't received your transfer", p: [`Transfer ${o.reference} for “${o.title}” didn't arrive in time, so the spot was released.`, "Already sent it? Reply to this email with proof of transfer: we'll give you a spot if one is left, otherwise we'll refund you."], cta: "View my booking" },
    ar: { subject: `تم تحرير المكان: ${o.title}`, heading: "لم نتوصل بتحويلك", p: [`لم يصل التحويل ${o.reference} الخاص بـ « ${o.title} » في الوقت المحدد، فتم تحرير المكان.`, "هل أرسلته بالفعل؟ رد على هذه الرسالة مع إثبات التحويل: نمنحك مكانًا إن بقي، وإلا نسترد لك المبلغ."], cta: "عرض حجزي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}

/**
 * Étape 20 : e-mails aux organisateurs (espace /pro, en français) : décision sur le compte ou sur une activité.
 */
export function organizerMail(o: { heading: string; paragraphs: string[]; ctaLabel: string; path: string }) {
  return {
    subject: o.heading,
    ...layout("fr", {
      heading: o.heading,
      paragraphs: o.paragraphs,
      cta: { label: o.ctaLabel, href: `${SITE_URL}${o.path}` },
      footer: "Vous recevez cet e-mail car vous avez un compte organisateur sur Wenzy.",
    }),
  };
}

/** Étape 22 — e-mail simple au participant (suivi d'une demande), en français. */
export function noticeMail(o: { heading: string; paragraphs: string[]; ctaLabel: string; path: string }) {
  return {
    subject: o.heading,
    ...layout("fr", {
      heading: o.heading,
      paragraphs: o.paragraphs,
      cta: { label: o.ctaLabel, href: `${SITE_URL}${o.path}` },
      footer: "Vous recevez cet e-mail au sujet d'une réservation faite sur Wenzy.",
    }),
  };
}

/** Alertes « nouvelles expériences » : e-mail de confirmation (visiteur sans compte, double confirmation). */
export function alertConfirmMail(o: { locale: string; token: string }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/alertes?confirmer=${encodeURIComponent(o.token)}`;
  const t = {
    fr: { subject: "Confirmez vos alertes Wenzy", heading: "Une dernière étape", p: ["Vous avez demandé une alerte pour les nouvelles tables et activités de Wenzy.", "Confirmez votre adresse : vous recevrez ensuite un e-mail dès qu'une nouvelle expérience est publiée. Vous pourrez arrêter à tout moment, depuis chaque e-mail."], cta: "Confirmer mes alertes", footer: "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail : sans confirmation, votre adresse est effacée sous 7 jours." },
    en: { subject: "Confirm your Wenzy alerts", heading: "One last step", p: ["You asked to get alerts for new tables and activities from Wenzy.", "Confirm your address: you'll then get an email as soon as a new experience is published. You can stop at any time, from any email."], cta: "Confirm my alerts", footer: "Didn't ask for this? Just ignore this email: without confirmation, your address is deleted within 7 days." },
    ar: { subject: "أكّد تنبيهات Wenzy", heading: "خطوة أخيرة", p: ["طلبت أن تصلك تنبيهات بالطاولات والأنشطة الجديدة في Wenzy.", "أكّد عنوانك: ستصلك بعد ذلك رسالة كلما نُشرت تجربة جديدة. ويمكنك التوقف في أي وقت، من كل رسالة."], cta: "تأكيد التنبيهات", footer: "لست صاحب هذا الطلب؟ تجاهل هذه الرسالة: دون تأكيد، يُحذف عنوانك خلال 7 أيام." },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: t.footer }) };
}

/** Alertes « nouvelles expériences » : une ou plusieurs expériences viennent d'être publiées. */
export function newExperiencesMail(o: { locale: string; items: { title: string; slug: string }[]; stopHref: string | null }) {
  const l = lang(o.locale);
  const list = o.items.map((i) => ({ label: i.title, href: `${SITE_URL}${prefix(l)}/experiences/${i.slug}` }));
  const one = o.items.length === 1;
  const stop = o.stopHref ?? `${SITE_URL}${prefix(l)}/espace/preferences`;
  const t = {
    fr: { subject: one ? `Nouveau : ${o.items[0].title}` : `${o.items.length} nouvelles expériences à découvrir`, heading: one ? "Une nouvelle expérience vient d'ouvrir" : "De nouvelles expériences viennent d'ouvrir", p: ["Les places partent vite : réservez la vôtre, en solo ou à plusieurs."], cta: "Voir toutes les expériences", footer: `Vous recevez cet e-mail car vous avez demandé une alerte pour les nouvelles expériences. Pour ne plus les recevoir : ${stop}` },
    en: { subject: one ? `New: ${o.items[0].title}` : `${o.items.length} new experiences to discover`, heading: one ? "A new experience just opened" : "New experiences just opened", p: ["Spots go fast: book yours, on your own or with friends."], cta: "See all experiences", footer: `You're receiving this email because you asked for alerts about new experiences. To stop them: ${stop}` },
    ar: { subject: one ? `جديد: ${o.items[0].title}` : `${o.items.length} تجارب جديدة للاكتشاف`, heading: one ? "فُتحت تجربة جديدة" : "فُتحت تجارب جديدة", p: ["الأماكن تنفد بسرعة: احجز مكانك، وحدك أو مع أصدقائك."], cta: "عرض كل التجارب", footer: `تصلك هذه الرسالة لأنك طلبت تنبيهات بالتجارب الجديدة. لإيقافها: ${stop}` },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, list, cta: { label: t.cta, href: `${SITE_URL}${prefix(l)}/experiences` }, footer: t.footer }) };
}

/** docs/22 § 8 (timeline du 24/11) : la veille à 21h30, le lieu, l'adresse et la cuisine, avec le résumé de la table sans les noms. */
export function venueRevealedMail(o: { locale: string; firstName: string; title: string; when: string; venue: string | null; cuisine: string | null; summary: string | null; checkInFrom: string; reservationId: string }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const t = {
    fr: { subject: `Votre lieu est révélé : ${o.title}`, heading: `${o.firstName ? `${o.firstName}, v` : "V"}otre lieu est révélé`, p: [`« ${o.title} », ${o.when}.`, ...(o.venue ? [`Rendez-vous : ${o.venue}.`] : []), ...(o.cuisine ? [`Cuisine : ${o.cuisine}.`] : []), ...(o.summary ? [`À votre table : ${o.summary}.`] : []), `Check-in à partir de ${o.checkInFrom} depuis votre réservation : vous y découvrirez votre table et les prénoms.`], cta: "Voir ma réservation" },
    en: { subject: `Your venue is revealed: ${o.title}`, heading: `${o.firstName ? `${o.firstName}, y` : "Y"}our venue is revealed`, p: [`“${o.title}”, ${o.when}.`, ...(o.venue ? [`Meeting point: ${o.venue}.`] : []), ...(o.cuisine ? [`Cuisine: ${o.cuisine}.`] : []), ...(o.summary ? [`At your table: ${o.summary}.`] : []), `Check in from ${o.checkInFrom} in your booking: you'll see your table and first names there.`], cta: "View my booking" },
    ar: { subject: `تم الكشف عن المكان: ${o.title}`, heading: "تم الكشف عن مكانك", p: [`« ${o.title} »، ${o.when}.`, ...(o.venue ? [`المكان: ${o.venue}.`] : []), ...(o.cuisine ? [`المطبخ: ${o.cuisine}.`] : []), ...(o.summary ? [`على مائدتك: ${o.summary}.`] : []), `سجّل وصولك ابتداءً من ${o.checkInFrom} من صفحة حجزك: ستكتشف هناك مائدتك والأسماء.`], cta: "عرض حجزي" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}

/** docs/22 § 13 (timeline du 24/11) : récapitulatif au lieu, le jour J à 11h (nombre de tables, prénoms, régimes et allergies partagés). */
export function venueBriefMail(o: { venue: string; title: string; when: string; tables: { label: string; names: string[] }[]; people: number; notes: string[] }) {
  return {
    subject: `Wenzy · ${o.when} · ${o.tables.length} table${o.tables.length > 1 ? "s" : ""}, ${o.people} personne${o.people > 1 ? "s" : ""}`,
    ...layout("fr", {
      heading: `Récapitulatif pour ${o.venue}`,
      paragraphs: [
        `« ${o.title} », ${o.when} : ${o.tables.length} table${o.tables.length > 1 ? "s" : ""}, ${o.people} personne${o.people > 1 ? "s" : ""}.`,
        ...o.tables.map((t) => `${t.label} : ${t.names.join(", ")}.`),
        o.notes.length ? `Régimes et allergies : ${o.notes.join(" ; ")}.` : "Aucun régime ni allergie signalé.",
        "Chacun règle sa consommation sur place. Merci pour votre accueil !",
      ],
      footer: "Message envoyé par Wenzy à ses lieux partenaires : le jour même à 11h (la veille au soir pour un début avant 14h).",
    }),
  };
}

/** Alerte à l'équipe (lieu à renseigner, minimum non atteint, table de 7…), en français. */
export function teamAlertMail(o: { subject: string; paragraphs: string[]; path: string }) {
  return {
    subject: o.subject,
    ...layout("fr", { heading: o.subject, paragraphs: o.paragraphs, cta: { label: "Ouvrir dans le back-office", href: `${SITE_URL}${o.path}` }, footer: "Alerte automatique du back-office Wenzy." }),
  };
}

/** Demande, relance ou récapitulatif envoyé à un lieu partenaire (même texte que le message WhatsApp). */
export function venueMessageMail(o: { subject: string; text: string; link: string; cta: string }) {
  return {
    subject: o.subject,
    ...layout("fr", { heading: o.subject, paragraphs: o.text.split("\n").filter((l) => !l.includes(o.link)), cta: { label: o.cta, href: o.link }, footer: "Message envoyé par Wenzy à ses lieux partenaires. Une question ? Répondez à cet e-mail ou appelez-nous." }),
  };
}

/** Décision 46 : pas assez d'inscrits ; une autre date (ou un événement compatible) est proposée. */
export function proposalMail(o: { locale: string; firstName: string; title: string; when: string; proposed: string; deadline: string; reservationId: string }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/reservations/${o.reservationId}`;
  const t = {
    fr: { subject: `Une autre date vous est proposée : ${o.title}`, heading: `${o.firstName ? `${o.firstName}, p` : "P"}as assez d'inscrits`, p: [`« ${o.title} », ${o.when} : il n'y a pas assez d'inscrits pour former une table.`, `Nous vous proposons : ${o.proposed}. Acceptez-la sans repayer, ou choisissez le remboursement intégral, avant le ${o.deadline}. Sans réponse, vous serez remboursé·e automatiquement.`], cta: "Répondre" },
    en: { subject: `Another date is suggested: ${o.title}`, heading: "Not enough people", p: [`“${o.title}”, ${o.when}: there aren't enough people to form a table.`, `We suggest: ${o.proposed}. Accept it at no extra cost, or choose a full refund, before ${o.deadline}. Without an answer, you'll be refunded automatically.`], cta: "Answer" },
    ar: { subject: `نقترح عليك موعدًا آخر: ${o.title}`, heading: "عدد المسجلين غير كافٍ", p: [`« ${o.title} »، ${o.when}: عدد المسجلين غير كافٍ لتكوين مائدة.`, `نقترح عليك: ${o.proposed}. اقبله دون دفع إضافي، أو اختر الاسترداد الكامل، قبل ${o.deadline}. بدون رد، سيتم الاسترداد تلقائيًا.`], cta: "الرد" },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: t.cta, href }, footer: NOTICE_FOOTER[l] }) };
}

/** Garde-fous du pass (décision 8) : avertissement après une absence, suspension après la deuxième. */
export function absenceMail(o: { locale: string; firstName: string; title: string; suspendedUntil: string | null; lateCancel?: boolean }) {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/abonnement`;
  const s = o.suspendedUntil;
  // Audit 23/11 : annulation à moins de 24 h d'une place incluse dans le pass = absence.
  if (o.lateCancel) {
    const lc = {
      fr: s
        ? { subject: "Votre pass est suspendu 2 semaines", heading: "Pass suspendu", p: [`Annulation à moins de 24 h (« ${o.title} ») : c'est votre deuxième absence en 90 jours. Votre pass est suspendu jusqu'au ${s} : vous pouvez réserver, mais vos places ne sont plus incluses d'ici là.`] }
        : { subject: "Annulation tardive notée", heading: "Annulation à moins de 24 h", p: [`Votre place de « ${o.title} » était incluse dans votre pass : une annulation à moins de 24 h compte comme une absence.`, "C'est un avertissement : à la prochaine absence, votre pass sera suspendu 2 semaines. Pensez à annuler plus tôt : la place profite alors à quelqu'un d'autre."] },
      en: s
        ? { subject: "Your pass is suspended for 2 weeks", heading: "Pass suspended", p: [`Cancellation within 24 hours (“${o.title}”): this is your second no-show in 90 days. Your pass is suspended until ${s}: you can still book, but your seats aren't included until then.`] }
        : { subject: "Late cancellation noted", heading: "Cancelled within 24 hours", p: [`Your seat for “${o.title}” was included in your pass: cancelling within 24 hours counts as a no-show.`, "This is a warning: next time, your pass will be suspended for 2 weeks. Cancel earlier so someone else can take the seat."] },
      ar: s
        ? { subject: "تم تعليق الباس لمدة أسبوعين", heading: "الباس معلّق", p: [`إلغاء قبل أقل من 24 ساعة (« ${o.title} »): إنه غيابك الثاني خلال 90 يومًا. الباس معلّق حتى ${s}: يمكنك الحجز، لكن أماكنك لم تعد مشمولة حتى ذلك الحين.`] }
        : { subject: "تم تسجيل إلغاء متأخر", heading: "إلغاء قبل أقل من 24 ساعة", p: [`كان مكانك في « ${o.title} » مشمولًا بالباس: الإلغاء قبل أقل من 24 ساعة يُحتسب غيابًا.`, "هذا تنبيه: في الغياب القادم، سيُعلّق الباس أسبوعين. ألغِ مبكرًا ليستفيد غيرك من المكان."] },
    }[l];
    return { subject: lc.subject, ...layout(l, { heading: lc.heading, paragraphs: lc.p, cta: { label: l === "fr" ? "Mon pass" : l === "en" ? "My pass" : "الباس", href }, footer: NOTICE_FOOTER[l] }) };
  }
  const t = {
    fr: s
      ? { subject: "Votre pass est suspendu 2 semaines", heading: "Pass suspendu", p: [`Deuxième absence sans check-in (« ${o.title} »). Votre pass est suspendu jusqu'au ${s} : vous pouvez réserver, mais vos places ne sont plus incluses d'ici là.`, "Un empêchement ? Annulez depuis votre réservation : la place revient à quelqu'un d'autre."] }
      : { subject: "Absence notée", heading: `${o.firstName ? `${o.firstName}, n` : "N"}ous ne vous avons pas vu`, p: [`Pas de check-in pour « ${o.title} » : c'est noté comme une absence.`, "C'est un avertissement : à la prochaine absence, votre pass sera suspendu 2 semaines. Un empêchement ? Annulez depuis votre réservation."] },
    en: s
      ? { subject: "Your pass is suspended for 2 weeks", heading: "Pass suspended", p: [`Second no-show without check-in (“${o.title}”). Your pass is suspended until ${s}: you can still book, but your seats aren't included until then.`, "Can't make it? Cancel from your booking so someone else can take your seat."] }
      : { subject: "No-show noted", heading: "We missed you", p: [`No check-in for “${o.title}”: it's noted as a no-show.`, "This is a warning: next time, your pass will be suspended for 2 weeks. Can't make it? Cancel from your booking."] },
    ar: s
      ? { subject: "تم تعليق الباس لمدة أسبوعين", heading: "الباس معلّق", p: [`غياب ثانٍ دون تسجيل الوصول (« ${o.title} »). الباس معلّق حتى ${s}: يمكنك الحجز، لكن أماكنك لم تعد مشمولة حتى ذلك الحين.`, "طرأ لك مانع؟ ألغِ من صفحة حجزك ليستفيد غيرك من المكان."] }
      : { subject: "تم تسجيل غياب", heading: "افتقدناك", p: [`لا تسجيل وصول في « ${o.title} »: سُجّل كغياب.`, "هذا تنبيه: في الغياب القادم، سيُعلّق الباس أسبوعين. طرأ لك مانع؟ ألغِ من صفحة حجزك."] },
  }[l];
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, cta: { label: l === "fr" ? "Mon pass" : l === "en" ? "My pass" : "الباس", href }, footer: NOTICE_FOOTER[l] }) };
}
