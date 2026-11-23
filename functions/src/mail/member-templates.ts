import { SITE_URL } from "../invoices/format";
import { lang, layout, NOTICE_FOOTER, prefix, type L } from "./templates";

/**
 * Audit du 23/11 — e-mails au membre ajoutés pour les annulations, la liste d'attente, le jour J, les remboursements,
 * la rétractation et les signalements. Mêmes gabarit et ton (vouvoiement) que les autres e-mails ; FR, AR, EN.
 * Tant que `settings/email.provider` n'est pas « brevo », ils sont rangés dans la boîte d'envoi de test du back-office.
 */

type Out = { subject: string; html: string; text: string };
const bookingHref = (l: L, id: string) => `${SITE_URL}${prefix(l)}/espace/reservations/${id}`;
const CTA_BOOKING: Record<L, string> = { fr: "Voir ma réservation", en: "View my booking", ar: "عرض حجزي" };

function build(l: L, t: { subject: string; heading: string; p: string[]; cta?: { label: string; href: string } }): Out {
  return { subject: t.subject, ...layout(l, { heading: t.heading, paragraphs: t.p, ...(t.cta ? { cta: t.cta } : {}), footer: NOTICE_FOOTER[l] }) };
}

/** Réservation annulée par l'équipe (une réservation, une date entière ou une suspension). */
export function cancelledByTeamMail(o: { locale: string; firstName: string; title: string; when: string; refund: string | null; refundPending?: boolean; sessionReason?: string | null; reservationId: string }): Out {
  const l = lang(o.locale);
  const session = Boolean(o.sessionReason);
  const t = {
    fr: {
      subject: session ? `Date annulée : ${o.title}` : `Réservation annulée : ${o.title}`,
      heading: session ? "Nous sommes désolés : cette date est annulée" : "Votre réservation a été annulée",
      p: [
        `« ${o.title} », ${o.when}.`,
        ...(session ? [`Motif : ${o.sessionReason}.`] : ["L'équipe Wenzy a annulé votre réservation. Pour toute question, répondez simplement à cet e-mail."]),
        o.refund ? (o.refundPending ? `${o.refund} vous seront remboursés : le remboursement est en cours.` : `${o.refund} vous sont remboursés.`) : "Aucun montant n'était à rembourser sur cette réservation.",
      ],
    },
    en: {
      subject: session ? `Date cancelled: ${o.title}` : `Booking cancelled: ${o.title}`,
      heading: session ? "We're sorry: this date is cancelled" : "Your booking has been cancelled",
      p: [
        `“${o.title}”, ${o.when}.`,
        ...(session ? [`Reason: ${o.sessionReason}.`] : ["The Wenzy team has cancelled your booking. Any question? Just reply to this email."]),
        o.refund ? (o.refundPending ? `${o.refund} will be refunded: the refund is in progress.` : `${o.refund} is refunded to you.`) : "There was nothing to refund on this booking.",
      ],
    },
    ar: {
      subject: session ? `تم إلغاء الموعد: ${o.title}` : `تم إلغاء الحجز: ${o.title}`,
      heading: session ? "نعتذر: تم إلغاء هذا الموعد" : "تم إلغاء حجزك",
      p: [
        `« ${o.title} »، ${o.when}.`,
        ...(session ? [`السبب: ${o.sessionReason}.`] : ["ألغى فريق Wenzy حجزك. لأي سؤال، ردّ على هذه الرسالة."]),
        o.refund ? (o.refundPending ? `سيتم استرجاع ${o.refund}: الاسترداد قيد المعالجة.` : `تم استرجاع ${o.refund}.`) : "لم يكن هناك أي مبلغ للاسترداد.",
      ],
    },
  }[l];
  return build(l, { ...t, cta: { label: CTA_BOOKING[l], href: bookingHref(l, o.reservationId) } });
}

/** Place libérée proposée depuis la liste d'attente (à payer avant l'échéance, ou confirmée si elle est gratuite). */
export function waitlistOfferMail(o: { locale: string; firstName: string; title: string; when: string; deadline: string | null; amount: string | null; reservationId: string }): Out {
  const l = lang(o.locale);
  const free = !o.amount;
  const t = {
    fr: {
      subject: `Une place s'est libérée : ${o.title}`,
      heading: `${o.firstName ? `${o.firstName}, u` : "U"}ne place est pour vous`,
      p: [`« ${o.title} », ${o.when}.`, free ? "Vous étiez sur la liste d'attente : la place est à vous, elle est confirmée." : `Vous étiez sur la liste d'attente : la place vous est réservée jusqu'au ${o.deadline}. Payez ${o.amount} pour la confirmer ; ensuite, elle sera proposée à la personne suivante.`],
      cta: free ? "Voir ma réservation" : "Confirmer ma place",
    },
    en: {
      subject: `A spot opened up: ${o.title}`,
      heading: `${o.firstName ? `${o.firstName}, a` : "A"} spot is yours`,
      p: [`“${o.title}”, ${o.when}.`, free ? "You were on the waiting list: the spot is yours and confirmed." : `You were on the waiting list: the spot is held for you until ${o.deadline}. Pay ${o.amount} to confirm it; after that it goes to the next person.`],
      cta: free ? "View my booking" : "Confirm my spot",
    },
    ar: {
      subject: `تحرر مكان: ${o.title}`,
      heading: "المكان من أجلك",
      p: [`« ${o.title} »، ${o.when}.`, free ? "كنت على قائمة الانتظار: المكان لك وتم تأكيده." : `كنت على قائمة الانتظار: المكان محجوز لك حتى ${o.deadline}. ادفع ${o.amount} لتأكيده؛ بعد ذلك يُعرض على الشخص التالي.`],
      cta: free ? "عرض حجزي" : "تأكيد مكاني",
    },
  }[l];
  return build(l, { subject: t.subject, heading: t.heading, p: t.p, cta: { label: t.cta, href: bookingHref(l, o.reservationId) } });
}

/** À l'heure du début : « Vous êtes arrivé·e ? » (le check-in évite d'être noté absent). */
export function arrivalCheckMail(o: { locale: string; firstName: string; title: string; until: string; reservationId: string }): Out {
  const l = lang(o.locale);
  const t = {
    fr: { subject: `Vous êtes arrivé·e ? ${o.title}`, heading: `${o.firstName ? `${o.firstName}, v` : "V"}ous êtes arrivé·e ?`, p: [`« ${o.title} » commence maintenant.`, `Indiquez votre arrivée depuis votre réservation (jusqu'à ${o.until}) : vous retrouvez votre groupe et le chat, et votre place n'est pas notée comme une absence.`], cta: "Je suis arrivé·e" },
    en: { subject: `Have you arrived? ${o.title}`, heading: `${o.firstName ? `${o.firstName}, h` : "H"}ave you arrived?`, p: [`“${o.title}” is starting now.`, `Check in from your booking (until ${o.until}): you'll find your group and the chat, and your spot won't be counted as a no-show.`], cta: "I've arrived" },
    ar: { subject: `هل وصلت؟ ${o.title}`, heading: "هل وصلت؟", p: [`« ${o.title} » يبدأ الآن.`, `سجّل وصولك من صفحة حجزك (حتى ${o.until}): ستجد مجموعتك والمحادثة، ولن يُحتسب مكانك غيابًا.`], cta: "وصلت" },
  }[l];
  return build(l, { subject: t.subject, heading: t.heading, p: t.p, cta: { label: t.cta, href: `${bookingHref(l, o.reservationId)}#arrivee` } });
}

/** Remboursement relancé sans succès : la personne sait qu'il est en cours et que l'équipe s'en occupe. */
export function refundPendingMail(o: { locale: string; firstName: string; title: string; amount: string; reservationId: string }): Out {
  const l = lang(o.locale);
  const t = {
    fr: { subject: `Votre remboursement est en cours : ${o.title}`, heading: "Votre remboursement est en cours", p: [`${o.amount} vous sont dus pour « ${o.title} ».`, "Le remboursement prend plus de temps que prévu chez notre prestataire de paiement. L'équipe le suit et vous écrira s'il faut quoi que ce soit de votre part."] },
    en: { subject: `Your refund is in progress: ${o.title}`, heading: "Your refund is in progress", p: [`${o.amount} is owed to you for “${o.title}”.`, "The refund is taking longer than expected with our payment provider. The team is following it and will write to you if anything is needed."] },
    ar: { subject: `استردادك قيد المعالجة: ${o.title}`, heading: "استردادك قيد المعالجة", p: [`لك ${o.amount} عن « ${o.title} ».`, "يستغرق الاسترداد وقتًا أطول من المتوقع لدى مزوّد الدفع. الفريق يتابعه وسيراسلك إن احتاج إلى شيء منك."] },
  }[l];
  return build(l, { ...t, cta: { label: CTA_BOOKING[l], href: bookingHref(l, o.reservationId) } });
}

/** Rétractation d'un carnet ou d'un pass (7 jours, rien d'utilisé). */
export function withdrawalMail(o: { locale: string; firstName: string; offer: string; amount: string; pending: boolean }): Out {
  const l = lang(o.locale);
  const href = `${SITE_URL}${prefix(l)}/espace/factures`;
  const t = {
    fr: { subject: `Rétractation confirmée : ${o.offer}`, heading: "Votre rétractation est confirmée", p: [`${o.offer} est annulé.`, o.pending ? `${o.amount} vous seront remboursés : le remboursement est en cours.` : `${o.amount} vous sont remboursés.`, "L'avoir correspondant est disponible dans « Mes factures »."], cta: "Mes factures" },
    en: { subject: `Withdrawal confirmed: ${o.offer}`, heading: "Your withdrawal is confirmed", p: [`${o.offer} is cancelled.`, o.pending ? `${o.amount} will be refunded: the refund is in progress.` : `${o.amount} is refunded to you.`, "The credit note is available under “My invoices”."], cta: "My invoices" },
    ar: { subject: `تم تأكيد التراجع: ${o.offer}`, heading: "تم تأكيد تراجعك", p: [`تم إلغاء ${o.offer}.`, o.pending ? `سيتم استرجاع ${o.amount}: الاسترداد قيد المعالجة.` : `تم استرجاع ${o.amount}.`, "إشعار الدائن متاح في « فواتيري »."], cta: "فواتيري" },
  }[l];
  return build(l, { subject: t.subject, heading: t.heading, p: t.p, cta: { label: t.cta, href } });
}

/** Accusé de réception d'un signalement (jamais le nom de la personne signalée, jamais d'engagement sur la suite). */
export function reportReceivedMail(o: { locale: string; firstName: string; title: string }): Out {
  const l = lang(o.locale);
  const t = {
    fr: { subject: "Nous avons bien reçu votre signalement", heading: "Merci de nous avoir prévenus", p: [`Votre signalement concernant « ${o.title} » est bien arrivé. Il est lu par l'équipe le plus vite possible (objectif : sous 48 heures) et reste confidentiel : la personne concernée ne saura jamais qui l'a signalée.`, "En cas de danger immédiat au Maroc : 19 (police), 15 (Protection civile), 112 depuis un mobile."] },
    en: { subject: "We've received your report", heading: "Thank you for letting us know", p: [`Your report about “${o.title}” has reached us. The team reads it as quickly as possible (target: within 48 hours) and it stays confidential: the person concerned will never know who reported them.`, "In immediate danger in Morocco: 19 (police), 15 (civil protection), 112 from a mobile."] },
    ar: { subject: "توصلنا ببلاغك", heading: "شكرًا لإخبارنا", p: [`وصلنا بلاغك بخصوص « ${o.title} ». يقرؤه الفريق في أسرع وقت (الهدف: خلال 48 ساعة) ويبقى سريًا: لن يعرف الشخص المعني أبدًا من أبلغ عنه.`, "في حالة خطر فوري بالمغرب: 19 (الشرطة)، 15 (الوقاية المدنية)، 112 من الهاتف المحمول."] },
  }[l];
  return build(l, t);
}
