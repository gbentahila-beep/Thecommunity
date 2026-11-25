/**
 * Centre d'aide — articles rédigés à partir du fonctionnement réel du site (délais, règles, écrans).
 * Français : référence. Anglais : traduction. Arabe : content/help-ar.ts (fusionné ci-dessous).
 * Liens internes : syntaxe [texte](/chemin). Jetons {{…}} : informations légales (lib/legal-info.ts) ou « à compléter ».
 */
import { ACCEPTED_HOLD_HOURS, HOLD_MINUTES, REVIEW_WINDOW_DAYS, WAITLIST_OFFER_HOURS } from "@thecommunity/shared";
import { HELP_ARTICLES_AR } from "./help-ar";
import { HELP_ARTICLES_Z, HELP_CATEGORIES_Z, HELP_MOVED, HELP_ORDER, HELP_REMOVED } from "./help-z";

/** Trois publics (étape AB) : participants, lieux partenaires (qui accueillent nos groupes), organisateurs (qui publient leurs activités). */
export type HelpAudience = "clients" | "partners" | "organizers";
export type HelpCategoryKey = "start" | "bookings" | "day-of" | "membership" | "account" | "safety" | "partner-join" | "partner-hosting" | "org-start" | "org-run";
type LRaw = { fr: string; en: string };
type L = { fr: string; en: string; ar: string };
export type HelpLang = "fr" | "en" | "ar";
export type HelpBlock = string | string[];
type HelpArticleRaw = { slug: string; category: HelpCategoryKey; title: LRaw; summary: LRaw; body: { fr: HelpBlock[]; en: HelpBlock[] }; related?: string[] };
type HelpCategoryRaw = { key: HelpCategoryKey; audience: HelpAudience; title: LRaw; description: LRaw };
export type HelpArticle = { slug: string; category: HelpCategoryKey; title: L; summary: L; body: Record<HelpLang, HelpBlock[]>; related?: string[] };
export type HelpCategory = { key: HelpCategoryKey; audience: HelpAudience; title: L; description: L };

const HELP_CATEGORIES_RAW: HelpCategoryRaw[] = [
  { key: "start", audience: "clients", title: { fr: "Bien démarrer", en: "Getting started" }, description: { fr: "Le principe, votre compte, votre première expérience.", en: "How it works, your account, your first experience." } },
  { key: "bookings", audience: "clients", title: { fr: "Expériences et réservations", en: "Experiences and bookings" }, description: { fr: "Réserver, payer, annuler, liste d'attente, avis.", en: "Booking, paying, cancelling, waiting list, reviews." } },
  { key: "membership", audience: "clients", title: { fr: "Carnet et Pass", en: "Pack and Pass" }, description: { fr: "Carnet et Pass, absences.", en: "Pack and Pass, no-shows." } },
  { key: "account", audience: "clients", title: { fr: "Mon compte", en: "My account" }, description: { fr: "Connexion, notifications, langue, données personnelles.", en: "Signing in, notifications, language, personal data." } },
  { key: "safety", audience: "clients", title: { fr: "Sécurité", en: "Safety" }, description: { fr: "Se sentir bien pendant une expérience, signaler un problème.", en: "Feeling at ease during an experience, reporting a problem." } },
  { key: "partner-join", audience: "partners", title: { fr: "Devenir partenaire", en: "Becoming a partner" }, description: { fr: "Qui peut nous rejoindre, nos critères, comment ça se passe.", en: "Who can join, our criteria, how it works." } },
  { key: "partner-hosting", audience: "partners", title: { fr: "Accueillir un groupe", en: "Hosting a group" }, description: { fr: "Préparer une date, annulations, incidents.", en: "Preparing a date, cancellations, incidents." } },
];

const HELP_ARTICLES_RAW: HelpArticleRaw[] = [
  { slug: "le-lieu-secret", category: "bookings", title: {"fr": "Le lieu secret des Tables", "en": "The secret venue for Tables"}, summary: {"fr": "Le restaurant vous est dévoilé la veille à 21h30, avec l'adresse et la cuisine.", "en": "The restaurant is revealed the evening before at 9:30 pm, with the address and cuisine."}, body: {"fr": ["Pour les Tables, nos restaurants partenaires de la gamme choisie sont réservés la veille dans l'après-midi ; le nombre final leur est envoyé à la fermeture des réservations (la veille à 20h30).", ["Il vous est dévoilé la veille à 21h30, pour tous les rendez-vous (dîner, café, brunch), par notification et e-mail, avec l'adresse, la carte, la cuisine et un aperçu de votre table.", "Plusieurs restaurants peuvent accueillir les tables d'une même date.", "S'il change, nous vous prévenons aussitôt."]], "en": ["For Tables, our partner restaurants in the chosen tier are booked the afternoon before; they get the final number when bookings close (8:30 pm the evening before).", ["It's revealed the evening before at 9:30 pm, for every gathering (dinner, coffee, brunch), by notification and email, with the address, map, cuisine and a preview of your table.", "Several restaurants may host the tables of one date.", "If it changes, you're told straight away."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  { slug: "check-in-et-ma-table", category: "bookings", title: {"fr": "Le check-in et ma table", "en": "Check-in and my table"}, summary: {"fr": "Une fois sur place, faites votre check-in : vous découvrez votre table et les prénoms.", "en": "Once there, check in: you'll meet your table and see first names."}, body: {"fr": ["À la révélation, vous recevez un résumé de votre table sans les noms (âges, langues, secteurs, centres d'intérêt).", ["Le jour J, de 30 minutes avant à 1 h après le début, appuyez sur « Je suis arrivé·e » dans votre réservation.", "Vous voyez alors votre table, les prénoms et qui est déjà arrivé.", "Après la rencontre, vous pouvez écrire à votre table pendant 14 jours, sans que votre numéro soit affiché."]], "en": ["When the venue is revealed, you get a summary of your table without names (ages, languages, fields, interests).", ["On the day, from 30 minutes before to 1 hour after the start, tap “I'm here” in your booking.", "You then see your table, first names and who has already arrived.", "After the event, you can message your table for 14 days, without your number being shown."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  { slug: "pas-assez-de-participants", category: "bookings", title: {"fr": "Pas assez de participants", "en": "Not enough participants"}, summary: {"fr": "Vous acceptez une autre date proposée, ou vous êtes remboursé·e intégralement.", "en": "You accept another suggested date, or you're refunded in full."}, body: {"fr": ["S'il n'y a pas assez d'inscrits pour former une table, et si vous avez accepté la gamme voisine, vous y êtes placé·e. Sinon, l'équipe peut maintenir la date, ou vous proposer la semaine suivante ou un rendez-vous équivalent.", ["Vous acceptez sans repayer, ou vous choisissez le remboursement intégral.", "Vous n'êtes jamais déplacé·e sans votre accord ; sans réponse à l'heure indiquée, vous êtes remboursé·e."]], "en": ["If there aren't enough people to form a table and you accepted the neighbouring tier, you're placed there. Otherwise, the team may keep the date, or offer you the following week or an equivalent gathering.", ["You accept at no extra cost, or choose a full refund.", "You're never moved without your consent; without an answer by the stated time, you're refunded."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  { slug: "absences", category: "membership", title: {"fr": "Absences et suspension du pass", "en": "No-shows and pass suspension"}, summary: {"fr": "Pas de check-in = absence ; à la deuxième, le pass est suspendu 2 semaines.", "en": "No check-in = no-show; after the second, the pass is suspended for 2 weeks."}, body: {"fr": ["Une place réservée et non utilisée prive quelqu'un d'autre d'une table. Si vous ne pouvez pas venir, annulez depuis votre réservation.", ["Sans check-in, la place est notée comme une absence.", "Avec le Pass : une première absence donne un avertissement ; une deuxième dans les 90 jours suspend le pass 14 jours.", "Vous étiez bien là ? Écrivez-nous : l'absence est annulée."]], "en": ["A booked seat that isn't used keeps someone else from a table. If you can't come, cancel from your booking.", ["Without check-in, the seat counts as a no-show.", "With the Pass: a first no-show is a warning; a second within 90 days suspends the pass for 14 days.", "You were there? Write to us: the no-show is cancelled."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  { slug: "gammes-des-tables", category: "bookings", title: {"fr": "Les gammes des Tables", "en": "Table tiers"}, summary: {"fr": "Casual, Premium ou Exclusive : la gamme fixe le budget sur place.", "en": "Casual, Premium or Exclusive: the tier sets the on-site budget."}, body: {"fr": ["Chaque rendez-vous des Tables existe en plusieurs gammes, pour réunir des personnes prêtes à dépenser le même budget : Casual et Premium chaque semaine (dîner, café, brunch), Exclusive le premier mercredi du mois pour le dîner.", ["Casual : convivial et accessible.", "Premium : plus soigné.", "Exclusive : les plus belles adresses."], "Le budget habituel par personne est affiché sur chaque fiche. En réservant, cochez « j'accepte la gamme voisine » : si votre gamme n'a pas assez d'inscrits, vous êtes placé·e dans la gamme voisine plutôt que sans table."], "en": ["Each Tables gathering comes in several tiers, to bring together people happy to spend the same budget: Casual and Premium every week (dinner, coffee, brunch), Exclusive on the first Wednesday of the month for dinner.", ["Casual: friendly and affordable.", "Premium: more refined.", "Exclusive: the finest places."], "The usual budget per person is shown on each page. When booking, tick “I accept the neighbouring tier”: if your tier doesn't have enough people, you're placed in the neighbouring tier rather than left without a table."]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  // ——— Bien démarrer ———
  { slug: "comment-fonctionne-wenzy", category: "start", title: {"fr": "Comment fonctionne Wenzy ?", "en": "How does Wenzy work?"}, summary: {"fr": "Des rendez-vous en petit groupe pour rencontrer de nouvelles personnes : 35 DH en ligne, le reste sur place.", "en": "Small-group events to meet new people: 35 DH online, the rest on site."}, body: {"fr": ["Chaque semaine, la communauté Wenzy se retrouve à Casablanca, en petits groupes, à des rendez-vous fixes : le Dîner du mercredi (20h30), l'activité du samedi (une activité différente chaque semaine), le Café du samedi (16h) et le Brunch du dimanche (12h30). Le site les range en trois univers : Tables (avec, de temps en temps, des éditions spéciales : Girls only, Expats, New in town), Activités et Événements (afterworks, soirées).", ["Choisissez votre rendez-vous dans l'[agenda](/experiences), votre gamme, et réservez la date de la semaine : 35 DH en ligne, ou rien avec le Pass.", "Pour les Tables, le logiciel compose des tables de 4 à 6 d'après votre profil ; le lieu vous est dévoilé la veille à 21h30.", "Sur place, faites votre check-in : vous découvrez votre table et les prénoms. Votre repas ou l'activité se règle sur place."], "Ce n'est pas une application de rencontre amoureuse : l'idée est d'élargir son cercle."], "en": ["Every week, the Wenzy community gets together in Casablanca, in small groups, at fixed gatherings: Wednesday Dinner (8:30 pm), the Saturday activity (a different one each week), Saturday Coffee (4 pm) and Sunday Brunch (12:30 pm). The site groups them into three universes: Tables (with special editions now and then: Girls only, Expats, New in town), Activities and Events (afterworks, evenings).", ["Choose your gathering in the [calendar](/experiences), your tier, and book this week's date: 35 DH online, or nothing with the Pass.", "For Tables, we put together tables of 4 to 6 based on your profile; the venue is revealed the evening before at 9:30 pm.", "On site, check in: you meet your table and see first names. Your meal or the activity is paid on site."], "This is not a dating app: the idea is to widen your circle."]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  {
    slug: "creer-mon-compte",
    category: "start",
    title: { fr: "Créer mon compte et compléter mon profil", en: "Creating my account and completing my profile" },
    summary: { fr: "Inscription, confirmation de l'e-mail et questionnaire : ce qui est demandé et pourquoi.", en: "Sign-up, email confirmation and questionnaire: what we ask and why." },
    body: {
      fr: [
        "Pour réserver, il faut un compte. Créez-le depuis la page [Inscription](/inscription) avec votre adresse e-mail et un mot de passe.",
        ["Confirmez votre adresse e-mail grâce au lien reçu : c'est obligatoire avant de réserver.", "Répondez au court questionnaire de profil (prénom, date de naissance, langues parlées, centres d'intérêt).", "Vous devez avoir 18 ans ou plus."],
        "Ces réponses nous servent uniquement à composer des groupes équilibrés. Au sein d'un groupe, seuls votre prénom, votre photo (si vous en avez mis une) et vos centres d'intérêt sont visibles.",
      ],
      en: [
        "You need an account to book. Create one from the [Sign up](/inscription) page with your email address and a password.",
        ["Confirm your email address with the link we send you: this is required before booking.", "Answer the short profile questionnaire (first name, date of birth, languages spoken, interests).", "You must be 18 or older."],
        "We only use these answers to put balanced groups together. Within a group, only your first name, your photo (if you added one) and your interests are visible.",
      ],
    },
    related: ["mot-de-passe-et-e-mail", "mes-donnees-personnelles"],
  },
  {
    slug: "venir-seul",
    category: "start",
    title: { fr: "Puis-je venir en solo ?", en: "Can I come on my own?" },
    summary: { fr: "Oui, c'est même le principe : nos expériences sont pensées pour celles et ceux qui viennent seuls.", en: "Yes, that's the whole idea: our experiences are designed for people who come on their own." },
    body: {
      fr: [
        "Oui. Nos expériences sont pensées pour celles et ceux qui viennent seuls : pour les dîners et les activités en groupe, notre équipe compose chaque table ou chaque équipe en tenant compte des langues parlées, des centres d'intérêt et de l'équilibre du groupe.",
        "Vous venez à deux ? Selon l'expérience, vous pouvez réserver plusieurs places en une seule fois (le nombre maximum est indiqué au moment de réserver).",
      ],
      en: [
        "Yes. Our experiences are designed for people who come alone: for dinners and group activities, our team puts each table or team together based on languages spoken, interests and group balance.",
        "Coming with someone? Depending on the experience, you can book several seats at once (the maximum is shown when you book).",
      ],
    },
    related: ["comment-fonctionne-wenzy", "regime-allergies-et-langues"],
  },
  // ——— Expériences et réservations ———
  {
    slug: "reserver-une-place",
    category: "bookings",
    title: { fr: "Réserver une place", en: "Booking a seat" },
    summary: { fr: `Votre place est bloquée ${HOLD_MINUTES} minutes le temps de payer.`, en: `Your seat is held for ${HOLD_MINUTES} minutes while you pay.` },
    body: {
      fr: [
        "Sur la fiche d'un rendez-vous, choisissez votre gamme puis « Réserver ». Une seule date est ouverte à la fois : celle de la semaine, jusqu'à la veille 20h30 ; la suivante s'ouvre ensuite (avec le Pass, une semaine plus tôt).",
        `Dès que vous lancez le paiement, la place est bloquée pour vous pendant ${HOLD_MINUTES} minutes. Passé ce délai sans paiement, elle est libérée pour les autres membres.`,
        "Une fois le paiement accepté, la réservation apparaît comme « Confirmée » dans [Mes réservations](/espace/reservations). Vous ne pouvez avoir qu'une réservation par date.",
        "Les réservations ferment la veille à 20h30 pour les Tables (2 h avant pour les autres expériences) : les restaurants sont réservés l'après-midi même, et le lieu vous est dévoilé à 21h30.",
      ],
      en: [
        "On a meet-up page, choose your range then “Book”. One date is open at a time: this week's, until 8:30 pm the day before; the next one opens then (a week earlier with the Pass).",
        `As soon as you start paying, the seat is held for you for ${HOLD_MINUTES} minutes. If no payment is made in that time, it is released for other members.`,
        "Once payment is accepted, the booking shows as “Confirmed” in [My bookings](/espace/reservations). You can only hold one booking per date.",
        "Bookings close at 8:30 pm the day before for Tables (2 hours before for other experiences): restaurants are booked that afternoon, and the venue is revealed at 9:30 pm.",
      ],
    },
    related: ["payer-ma-reservation", "annuler-une-reservation", "experiences-sur-demande"],
  },
  {
    slug: "experiences-sur-demande",
    category: "bookings",
    title: { fr: "Les expériences « sur demande »", en: "“On request” experiences" },
    summary: { fr: `Vous envoyez une demande, l'équipe valide, puis vous avez ${ACCEPTED_HOLD_HOURS} h pour payer.`, en: `You send a request, the team approves it, then you have ${ACCEPTED_HOLD_HOURS} hours to pay.` },
    body: {
      fr: [
        "Certaines expériences sont sur demande : plutôt que de réserver directement, vous envoyez une demande avec un court message (et, si vous le souhaitez, votre compte Instagram).",
        ["Notre équipe étudie chaque demande et l'accepte ou la refuse.", `Si elle est acceptée, une place vous est réservée : vous avez ${ACCEPTED_HOLD_HOURS} heures pour payer.`, "Aucun paiement n'est demandé tant que la demande n'est pas acceptée."],
        "Vous suivez l'avancement de vos demandes dans [Mes réservations](/espace/reservations) et dans vos notifications.",
      ],
      en: [
        "Some experiences are on request: instead of booking directly, you send a request with a short message (and your Instagram account if you wish).",
        ["Our team reviews each request and accepts or declines it.", `If accepted, a seat is reserved for you: you have ${ACCEPTED_HOLD_HOURS} hours to pay.`, "Nothing is charged until your request is accepted."],
        "You can follow your requests in [My bookings](/espace/reservations) and in your notifications.",
      ],
    },
    related: ["reserver-une-place", "payer-ma-reservation"],
  },
  { slug: "payer-ma-reservation", category: "bookings", title: {"fr": "Payer ma réservation", "en": "Paying for my booking"}, summary: {"fr": "En ligne, vous ne payez que Wenzy : 35 DH la place, ou votre pass, ou un crédit du carnet.", "en": "Online, you only pay Wenzy: 35 DH per seat, or your pass, or a pack credit."}, body: {"fr": ["Le seul montant payé en ligne est le prix Wenzy : 35 DH par place. Avec le Pass, votre place est incluse ; avec le Carnet, vous utilisez un crédit par place.", ["Votre repas, votre consommation ou le prix de l'activité se règlent sur place, directement au lieu ou à l'organisateur.", "La place est bloquée 15 minutes le temps du paiement (jusqu'à l'échéance indiquée pour un virement).", "Une facture des frais Wenzy est disponible dans « Mes factures »."]], "en": ["The only amount paid online is the Wenzy price: 35 DH per seat. With the Pass, your seat is included; with the Pack, you use one credit per seat.", ["Your meal, drinks or the activity price are paid on site, directly to the venue or organizer.", "The seat is held for 15 minutes while you pay (until the stated deadline for a bank transfer).", "An invoice for the Wenzy fee is available under “My invoices”."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  { slug: "annuler-une-reservation", category: "bookings", title: {"fr": "Annuler ou déplacer une réservation", "en": "Cancelling or moving a booking"}, summary: {"fr": "Les frais Wenzy sont remboursés selon les conditions de l'événement ; vous pouvez aussi changer de date.", "en": "The Wenzy fee is refunded under the event's terms; you can also change date."}, body: {"fr": ["Depuis votre réservation, « Annuler » vous indique d'abord le montant remboursé, selon les conditions affichées sur l'événement (le plus souvent : remboursement intégral jusqu'à 48 h avant).", ["« Déplacer sur une autre date » : jusqu'à la fermeture des réservations, sans repayer, s'il reste de la place.", "Avec le Carnet, le crédit revient si l'annulation est dans les délais remboursés.", "Si nous annulons, vous êtes intégralement remboursé·e."]], "en": ["From your booking, “Cancel” first shows the refund amount, under the terms shown on the event (most often: full refund up to 48 hours before).", ["“Move to another date”: until bookings close, at no extra cost, if seats are left.", "With the Pack, the credit comes back if you cancel within the refundable period.", "If we cancel, you're refunded in full."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  {
    slug: "liste-d-attente",
    category: "bookings",
    title: { fr: "La liste d'attente", en: "The waiting list" },
    summary: { fr: `Complet ? Inscrivez-vous : si une place se libère, vous avez ${WAITLIST_OFFER_HOURS} h pour la prendre.`, en: `Sold out? Join the list: if a seat frees up, you have ${WAITLIST_OFFER_HOURS} hours to take it.` },
    body: {
      fr: [
        "Quand une date est complète, le bouton « Rejoindre la liste d'attente » remplace la réservation. L'inscription est gratuite et sans engagement.",
        `Si une place se libère, elle est proposée dans l'ordre d'inscription. Vous recevez une notification et disposez de ${WAITLIST_OFFER_HOURS} heures pour réserver ; passé ce délai, la place est proposée à la personne suivante.`,
        "Vous pouvez quitter la liste à tout moment depuis la page de réservation.",
      ],
      en: [
        "When a date is full, a “Join the waiting list” button replaces booking. Joining is free with no commitment.",
        `If a seat frees up, it's offered in sign-up order. You get a notification and have ${WAITLIST_OFFER_HOURS} hours to book; after that, the seat goes to the next person.`,
        "You can leave the list at any time from the booking page.",
      ],
    },
    related: ["reserver-une-place", "annuler-une-reservation"],
  },
  {
    slug: "regime-allergies-et-langues",
    category: "bookings",
    title: { fr: "Régime alimentaire, allergies et langues", en: "Diet, allergies and languages" },
    summary: { fr: "Prévenez-nous dès la réservation : nous vérifions avec le lieu.", en: "Tell us when you book: we check with the venue." },
    body: {
      fr: [
        "Végétarien, sans gluten, allergie, autre contrainte ? Indiquez-le au moment de réserver, rubrique « Pour votre accueil ». Avec votre accord, nous le transmettons au lieu partenaire, qui prépare votre accueil. Vous pouvez le modifier depuis votre réservation jusqu'au début de l'expérience. Un doute ? Écrivez-nous via la page [Contact](/contact).",
        "Le menu ou ce qui est servi est indiqué sur chaque fiche, rubrique « Ce qui est inclus ».",
        "Côté langues, chaque expérience indique celles qui y sont parlées (français, darija, arabe, anglais…). Au moment de réserver, choisissez la ou les langues que vous aimeriez parler pendant l'expérience : cela nous aide à vous placer dans un groupe où vous pourrez participer à la conversation.",
      ],
      en: [
        "Vegetarian, gluten-free, an allergy or another requirement? Tell us when you book, under “For your welcome”. With your consent, we pass it on to the partner venue so it can prepare. You can change it from your booking until the experience starts. Any doubt? Write to us via the [Contact](/contact) page.",
        "The menu or what's served is shown on each experience page under “What's included”.",
        "As for languages, each experience lists the ones spoken (French, Darija, Arabic, English…). When you book, pick the language(s) you'd like to speak during the experience: it helps us place you in a group where you can join the conversation.",
      ],
    },
    related: ["venir-seul", "reserver-une-place"],
  },
  {
    slug: "laisser-un-avis",
    category: "bookings",
    title: { fr: "Laisser un avis", en: "Leaving a review" },
    summary: { fr: `Après l'expérience, vous avez ${REVIEW_WINDOW_DAYS} jours pour noter et commenter.`, en: `After the experience, you have ${REVIEW_WINDOW_DAYS} days to rate and comment.` },
    body: {
      fr: [
        `Une fois l'expérience passée, ouvrez votre réservation dans [Mes réservations](/espace/reservations) : vous pouvez donner une note de 1 à 5 et un commentaire pendant ${REVIEW_WINDOW_DAYS} jours.`,
        "Les avis restent visibles sur la fiche de l'expérience, même lorsqu'aucune nouvelle date n'est programmée. Seul votre prénom et l'initiale de votre nom apparaissent.",
        "Un avis qui ne respecte pas nos [règles de la communauté](/charte) peut être masqué par l'équipe.",
      ],
      en: [
        `Once the experience is over, open your booking in [My bookings](/espace/reservations): you can give a rating from 1 to 5 and a comment for ${REVIEW_WINDOW_DAYS} days.`,
        "Reviews stay visible on the experience page, even when no new date is scheduled. Only your first name and last-name initial are shown.",
        "A review that breaks our [community rules](/charte) may be hidden by the team.",
      ],
    },
    related: ["signaler-un-comportement"],
  },
  // ——— Abonnement ———
  { slug: "comment-fonctionne-l-abonnement", category: "membership", title: {"fr": "Le Pass et le Carnet", "en": "The Pass and the Pack"}, summary: {"fr": "Le Pass inclut votre place ; le Carnet offre une sortie sur trois.", "en": "The Pass includes your seat; the Pack gives one outing free in three."}, body: {"fr": ["Deux façons de sortir plus souvent, sur la page [Carnet et Pass](/abonnement) :", ["Pass (1 semaine à 1 an) : votre place est incluse à chaque réservation, accès en avant-première, événements réservés aux abonnés, priorité sur la liste d'attente. 2 réservations à venir au maximum.", "Carnet (70 DH) : 3 sorties dont 1 offerte, valables 3 mois, 1 crédit par place (invité compris).", "Paiement en une fois, sans renouvellement automatique. Le repas ou l'activité se règle toujours sur place."]], "en": ["Two ways to go out more often, on the [Pack and Pass](/abonnement) page:", ["Pass (1 week to 1 year): your seat is included in every booking, early access, members-only events, priority on the waiting list. Up to 2 upcoming bookings.", "Pack (70 DH): 3 outings including 1 free, valid for 3 months, 1 credit per seat (guest included).", "One-off payment, no automatic renewal. The meal or activity is always paid on site."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  {
    slug: "renouveler-mon-abonnement",
    category: "membership",
    title: { fr: "Prolonger mon pass ou racheter un carnet", en: "Extending my pass or buying another pack" },
    summary: { fr: "Un pass s'achète à tout moment et prolonge le pass en cours ; un carnet ajoute 3 crédits.", en: "A pass can be bought any time and extends your current one; a pack adds 3 credits." },
    body: {
      fr: [
        "Sur la page [Abonnement](/abonnement), achetez un nouveau pass quand vous voulez : sa durée s'ajoute à la fin du pass en cours, sans perdre de jours.",
        "Un nouveau carnet ajoute 3 crédits à ceux qui vous restent, et repousse leur validité à 3 mois.",
        "Sans nouvel achat, le pass s'arrête à sa date de fin et chaque place se paie de nouveau 35 DH.",
      ],
      en: [
        "On the [Membership](/abonnement) page, buy a new pass whenever you like: its duration is added to the end of your current pass, without losing any days.",
        "A new pack adds 3 credits to the ones you have left, and extends their validity to 3 months.",
        "Without a new purchase, the pass ends on its end date and each seat costs 35 DH again.",
      ],
    },
    related: ["comment-fonctionne-l-abonnement"],
  },
  // ——— Mon compte ———
  {
    slug: "mot-de-passe-et-e-mail",
    category: "account",
    title: { fr: "Mot de passe oublié, e-mail non reçu", en: "Forgotten password, email not received" },
    summary: { fr: "Réinitialiser le mot de passe et retrouver l'e-mail de confirmation.", en: "Resetting your password and finding the confirmation email." },
    body: {
      fr: [
        "Mot de passe oublié : depuis la page [Connexion](/connexion), choisissez « Mot de passe oublié » et suivez le lien reçu par e-mail.",
        "E-mail de confirmation introuvable : vérifiez vos courriers indésirables et l'onglet « Promotions », puis demandez un nouvel envoi depuis la page de réservation.",
        "Toujours bloqué·e ? Écrivez-nous via la page [Contact](/contact) avec l'adresse utilisée pour le compte.",
      ],
      en: [
        "Forgotten password: on the [Sign in](/connexion) page, choose “Forgot password” and follow the link we email you.",
        "Can't find the confirmation email? Check your spam and “Promotions” folders, then request a new one from the booking page.",
        "Still stuck? Write to us via the [Contact](/contact) page with the address used for your account.",
      ],
    },
    related: ["creer-mon-compte"],
  },
  {
    slug: "notifications-et-langue",
    category: "account",
    title: { fr: "Notifications et langue du site", en: "Notifications and site language" },
    summary: { fr: "Choisir les e-mails reçus et passer en français, arabe ou anglais.", en: "Choose which emails you get and switch between French, Arabic and English." },
    body: {
      fr: [
        "Dans [Préférences](/espace/preferences), choisissez les e-mails que vous souhaitez recevoir. Les messages indispensables (confirmation, annulation, remboursement) sont toujours envoyés.",
        "Le site est disponible en français, en arabe et en anglais : utilisez le sélecteur FR · عربي · EN en haut de page ou en bas de page.",
      ],
      en: [
        "In [Preferences](/espace/preferences), choose which emails you want to receive. Essential messages (confirmation, cancellation, refund) are always sent.",
        "The site is available in French, Arabic and English: use the FR · عربي · EN switch at the top or bottom of the page.",
      ],
    },
    related: ["mes-donnees-personnelles"],
  },
  {
    slug: "mes-donnees-personnelles",
    category: "account",
    title: { fr: "Mes données personnelles", en: "My personal data" },
    summary: { fr: "Télécharger vos données ou demander la suppression de votre compte (loi 09-08).", en: "Download your data or ask for your account to be deleted (Law 09-08)." },
    body: {
      fr: [
        "Conformément à la loi n° 09-08, vous pouvez accéder à vos données, les rectifier ou vous opposer à leur traitement.",
        ["Télécharger vos données : [Préférences](/espace/preferences) → « Télécharger mes données ».", "Supprimer votre compte : même page → « Supprimer mon compte ». Votre profil, votre photo et vos notifications sont supprimés ; vos réservations sont anonymisées pour la comptabilité.", "Pour toute autre demande : {{privacyEmail}}."],
        "Tout est détaillé dans la [politique de confidentialité](/confidentialite).",
      ],
      en: [
        "Under Law No. 09-08, you can access your data, correct it or object to its processing.",
        ["Download your data: [Preferences](/espace/preferences) → “Download my data”.", "Delete your account: same page → “Delete my account”. Your profile, photo and notifications are deleted; your bookings are anonymised for accounting.", "For any other request: {{privacyEmail}}."],
        "Everything is explained in the [privacy policy](/confidentialite).",
      ],
    },
    related: ["notifications-et-langue"],
  },
  // ——— Sécurité ———
  {
    slug: "securite-pendant-une-experience",
    category: "safety",
    title: { fr: "Se sentir en sécurité pendant une expérience", en: "Feeling safe during an experience" },
    summary: { fr: "Lieux publics, petits groupes, aucune coordonnée partagée, liberté de partir.", en: "Public places, small groups, no contact details shared, free to leave." },
    body: {
      fr: [
        ["Les expériences ont lieu dans des lieux publics ou chez des partenaires sélectionnés, jamais chez un participant.", "Au sein du groupe, seuls le prénom, la photo de profil et les centres d'intérêt sont visibles : ni téléphone, ni e-mail, ni nom de famille.", "Vous pouvez partir à tout moment, sans vous justifier.", "L'alcool n'est jamais obligatoire ; des boissons sans alcool sont toujours proposées."],
        "En cas d'urgence au Maroc : Police 19, Gendarmerie royale 177, Protection civile 15. Toutes nos règles sont sur la page [Sécurité](/securite).",
      ],
      en: [
        ["Experiences take place in public places or at selected partner venues, never at a participant's home.", "Within the group, only first names, profile photos and interests are visible: no phone numbers, emails or last names.", "You can leave at any time without giving a reason.", "Alcohol is never compulsory; alcohol-free drinks are always available."],
        "In an emergency in Morocco: Police 19, Royal Gendarmerie 177, Civil Protection 15. All our rules are on the [Safety](/securite) page.",
      ],
    },
    related: ["signaler-un-comportement"],
  },
  {
    slug: "signaler-un-comportement",
    category: "safety",
    title: { fr: "Signaler un comportement", en: "Reporting someone's behaviour" },
    summary: { fr: "Chaque signalement est lu par l'équipe et reste confidentiel.", en: "Every report is read by the team and kept confidential." },
    body: {
      fr: [
        "Pendant l'expérience, parlez-en au personnel du lieu ou contactez notre équipe. Après l'expérience, utilisez le lien « Signaler un comportement » sur la page de votre réservation, ou écrivez à {{safetyEmail}}.",
        "Indiquez la date, l'expérience et ce qui s'est passé. Votre signalement reste confidentiel : la personne concernée ne sait pas qui l'a signalée.",
        "Selon la gravité, nous pouvons avertir, suspendre ou exclure un membre. En cas de danger immédiat, appelez d'abord le 19 (Police).",
      ],
      en: [
        "During the experience, tell the venue staff or contact our team. Afterwards, use the “Report someone's behaviour” link on your booking page, or email {{safetyEmail}}.",
        "Give the date, the experience and what happened. Your report is confidential: the person concerned doesn't know who reported them.",
        "Depending on how serious it is, we may warn, suspend or remove a member. If you're in immediate danger, call 19 (Police) first.",
      ],
    },
    related: ["securite-pendant-une-experience", "laisser-un-avis"],
  },
  // ——— Partenaires : devenir partenaire ———
  {
    slug: "devenir-partenaire",
    category: "partner-join",
    title: { fr: "Devenir lieu ou organisateur partenaire", en: "Becoming a partner venue or organiser" },
    summary: { fr: "Restaurants, studios, ateliers, lieux, organisateurs indépendants : comment nous rejoindre.", en: "Restaurants, studios, workshops, venues, independent organisers: how to join us." },
    body: {
      fr: [
        "Vous tenez un restaurant, un café, un studio de sport ou de bien-être, un atelier créatif, un lieu atypique, ou vous animez des activités ? Nous cherchons des partenaires pour accueillir nos petits groupes à Casablanca.",
        ["Remplissez le [formulaire de candidature](/devenir-partenaire) (5 minutes).", "Notre équipe vous recontacte pour un échange et, si possible, une visite.", "Nous construisons ensemble le format : contenu, horaires, nombre de places, prix."],
        "Comme lieu partenaire, vous ne gérez ni la vente ni le paiement : nous nous en chargeons, et nous vous amenons un groupe constitué. Vous préférez publier et gérer vos propres activités ? Voyez [l'espace organisateur](/aide/espace-organisateur).",
      ],
      en: [
        "Do you run a restaurant, café, sport or wellness studio, creative workshop or unusual venue, or do you lead activities? We're looking for partners to host our small groups in Casablanca.",
        ["Fill in the [application form](/devenir-partenaire) (5 minutes).", "Our team gets back to you for a chat and, where possible, a visit.", "Together we design the format: content, times, number of seats, price."],
        "As a partner venue, you don't handle sales or payment: we do, and we bring you a ready-made group. Would you rather publish and manage your own activities? See [the organiser area](/aide/espace-organisateur).",
      ],
    },
    related: ["criteres-de-selection", "remuneration-partenaire", "espace-organisateur"],
  },
  {
    slug: "criteres-de-selection",
    category: "partner-join",
    title: { fr: "Nos critères de sélection", en: "Our selection criteria" },
    summary: { fr: "Accueil, qualité, sécurité et capacité à recevoir un petit groupe.", en: "Hospitality, quality, safety and room for a small group." },
    body: {
      fr: [
        "Nous choisissons nos partenaires avec soin, car ils font l'expérience de nos membres.",
        ["Un lieu ouvert au public, propre, sûr et facile d'accès.", "Un espace où un petit groupe peut échanger confortablement (table dédiée, salle, terrasse…).", "Une offre de qualité, avec des options sans alcool et, pour la restauration, une attention aux régimes et allergies.", "Un interlocuteur joignable le jour J.", "Le respect de nos [règles de la communauté](/charte) par votre équipe."],
      ],
      en: [
        "We choose our partners carefully, because they shape our members' experience.",
        ["A venue open to the public, clean, safe and easy to reach.", "A space where a small group can talk comfortably (dedicated table, room, terrace…).", "A quality offer, with alcohol-free options and, for food, care for diets and allergies.", "A contact person who can be reached on the day.", "Your team's respect for our [community rules](/charte)."],
      ],
    },
    related: ["devenir-partenaire"],
  },
  { slug: "remuneration-partenaire", category: "partner-join", title: {"fr": "Comment êtes-vous rémunéré ?", "en": "How are you paid?"}, summary: {"fr": "Vos clients vous paient sur place ; Wenzy ne prend aucune commission.", "en": "Your guests pay you on site; Wenzy takes no commission."}, body: {"fr": ["Deux façons de travailler avec nous :", ["Lieu partenaire (restaurant, café, club…) : nous vous amenons des groupes ; chacun règle sa consommation chez vous. Nous vous envoyons une demande, vous acceptez ou refusez, puis le récapitulatif (prénoms, allergies) 1 h avant.", "Organisateur : vous publiez vos activités ; le participant vous règle le prix sur place. Wenzy ne perçoit que ses frais de réservation, payés par le participant."], "Il n'y a ni commission ni reversement."], "en": ["Two ways to work with us:", ["Partner venue (restaurant, café, club…): we bring you groups; everyone pays for what they order with you. We send you a request, you accept or decline, then the recap (first names, allergies) 1 hour before.", "Organizer: you publish your activities; the participant pays you the price on site. Wenzy only receives its booking fee, paid by the participant."], "There is no commission and no payout."]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  {
    slug: "espace-organisateur",
    category: "partner-join",
    title: { fr: "Proposer vos activités vous-même : l'espace organisateur", en: "List your own activities: the organizer space" },
    summary: { fr: "Inscription, validation, relecture des activités, commission et reversements.", en: "Sign-up, approval, activity review, commission and payouts." },
    body: {
      fr: [
        "Clubs, ateliers, guides, coachs : vous pouvez aussi publier vos propres activités sur Wenzy, depuis l'[espace organisateur](/pro).",
        ["Créez votre compte organisateur : présentation, catégories, pièces justificatives (registre de commerce ou statut d'auto-entrepreneur, attestation d'assurance) et acceptation du [contrat organisateur](/contrat-organisateur).", "L'équipe vérifie votre demande, en général sous 48 h ouvrées, et peut vous demander un complément.", "Créez vos activités et vos dates, puis « Envoyer pour validation » : chaque nouvelle activité est relue avant sa mise en ligne.", "Suivez vos réservations, pointez vos participants à l'entrée (code ou QR code du billet), acceptez ou refusez les demandes, annulez une date si besoin (chacun est remboursé intégralement)."],
        "Wenzy encaisse le paiement en ligne pour votre compte, garde sa commission (taux indiqué dans « Finances ») et vous reverse le reste par virement, au plus tard 15 jours après chaque activité.",
      ],
      en: [
        "Clubs, workshops, guides, coaches: you can also list your own activities on Wenzy, from the [organizer space](/pro).",
        ["Create your organizer account: introduction, categories, supporting documents (trade register or self-employed status, insurance certificate) and acceptance of the [organizer agreement](/contrat-organisateur).", "The team reviews your application, usually within 2 working days, and may ask for more information.", "Create your activities and dates, then “Submit for review”: every new activity is checked before going live.", "Follow your bookings, check participants in at the door (ticket code or QR code), accept or decline requests, cancel a date if needed (everyone is fully refunded)."],
        "Wenzy collects online payment on your behalf, keeps its commission (rate shown under “Finances”) and transfers the rest to you no later than 15 days after each activity.",
      ],
    },
    related: ["devenir-partenaire", "remuneration-partenaire"],
  },
  // ——— Partenaires : accueillir un groupe ———
  {
    slug: "preparer-l-accueil-d-un-groupe",
    category: "partner-hosting",
    title: { fr: "Préparer l'accueil d'un groupe", en: "Getting ready to host a group" },
    summary: { fr: "Ce que nous vous transmettons avant chaque date, et ce que nous attendons le jour J.", en: "What we send you before each date, and what we expect on the day." },
    body: {
      fr: [
        "Avant chaque date, notre équipe vous communique le nombre de participants confirmés et les besoins particuliers (régimes, allergies), sans autre donnée personnelle.",
        ["Prévoyez la table ou l'espace convenu à l'heure indiquée.", "Accueillez le groupe sous le nom « Wenzy ».", "Prévenez-nous immédiatement en cas d'imprévu (retard, fermeture, problème technique)."],
        "Lieu partenaire qui accueille nos groupes : tout passe par votre interlocuteur Wenzy. Organisateur qui publie ses propres activités : vous retrouvez vos dates, vos participants (régimes et allergies compris, avec leur accord) et le pointage à l'entrée dans l'[espace organisateur](/pro).",
      ],
      en: [
        "Before each date, our team sends you the number of confirmed participants and any special needs (diets, allergies), with no other personal data.",
        ["Have the agreed table or space ready at the stated time.", "Welcome the group under the name “Wenzy”.", "Tell us immediately if anything comes up (delay, closure, technical problem)."],
        "Partner venue hosting our groups: everything goes through your Wenzy contact. Organiser publishing your own activities: your dates, participants (diets and allergies included, with their consent) and check-in are in the [organiser area](/pro).",
      ],
    },
    related: ["annulations-cote-partenaire", "incident-avec-un-participant"],
  },
  {
    slug: "annulations-cote-partenaire",
    category: "partner-hosting",
    title: { fr: "Annulations et changements de date", en: "Cancellations and date changes" },
    summary: { fr: "Prévenez-nous au plus tôt : nous informons et remboursons les participants.", en: "Tell us as early as possible: we inform and refund participants." },
    body: {
      fr: [
        "Si vous ne pouvez plus accueillir une date, prévenez-nous au plus tôt. Nous déplaçons la date ou l'annulons, et nous nous chargeons d'informer les participants et de les rembourser.",
        "Les annulations côté participants (selon les conditions d'annulation de l'activité, le plus souvent gratuites jusqu'à 48 h avant) sont gérées par nous ; le nombre final de participants vous est confirmé avant la date.",
        "Les conséquences d'une annulation tardive de part et d'autre sont prévues dans l'accord de partenariat.",
      ],
      en: [
        "If you can no longer host a date, tell us as early as possible. We move or cancel the date, and we take care of informing and refunding participants.",
        "Participant cancellations (under the activity's cancellation terms, usually free up to 48 hours before) are handled by us; the final headcount is confirmed to you before the date.",
        "What happens after a late cancellation on either side is set out in the partnership agreement.",
      ],
    },
    related: ["preparer-l-accueil-d-un-groupe", "remuneration-partenaire"],
  },
  {
    slug: "incident-avec-un-participant",
    category: "partner-hosting",
    title: { fr: "Signaler un problème avec un participant", en: "Reporting a problem with a participant" },
    summary: { fr: "Votre équipe peut demander à une personne de partir ; prévenez-nous ensuite.", en: "Your team may ask someone to leave; let us know afterwards." },
    body: {
      fr: [
        "Chaque membre accepte nos [règles de la communauté](/charte). Si un participant ne les respecte pas, votre équipe peut lui demander de partir.",
        "Signalez-nous ensuite ce qui s'est passé (date, heure, faits) à {{safetyEmail}} ou via la page [Contact](/contact). Nous prenons les mesures nécessaires, pouvant aller jusqu'à l'exclusion.",
        "En cas de danger immédiat, appelez d'abord le 19 (Police) ou le 15 (Protection civile).",
      ],
      en: [
        "Every member accepts our [community rules](/charte). If a participant breaks them, your team may ask them to leave.",
        "Then tell us what happened (date, time, facts) at {{safetyEmail}} or via the [Contact](/contact) page. We take the necessary steps, up to removing the member.",
        "If there's immediate danger, call 19 (Police) or 15 (Civil Protection) first.",
      ],
    },
    related: ["preparer-l-accueil-d-un-groupe"],
  },
  // ——— 18 : toutes les activités ———
  {
    "slug": "questionnaire-avant-l-experience",
    "category": "bookings",
    "title": {
      "fr": "À quoi sert le questionnaire de réservation ?",
      "en": "What is the booking questionnaire for?"
    },
    "summary": {
      "fr": "Quelques questions à choix (niveau, allure, envies) pour vous placer avec les bonnes personnes.",
      "en": "A few multiple-choice questions (level, pace, preferences) to place you with the right people."
    },
    "body": {
      "fr": [
        "Certaines expériences comportent un court questionnaire, 10 questions au plus, que vous remplissez pendant la réservation, juste avant le paiement. Vous retrouvez ensuite vos réponses sur la page de la réservation (rubrique « Votre questionnaire »).",
        [
          "Au padel ou en course à pied, il sert à réunir des personnes de niveau ou d'allure proches : par exemple, quatre joueurs de même niveau par terrain.",
          "Au paintball ou à table, il peut au contraire servir à mélanger les profils : débutants et habitués, personnes qui écoutent et personnes qui animent.",
          "Uniquement des réponses à choisir : aucune question ouverte, rien de sensible."
        ],
        "Vos réponses ne sont jamais montrées aux autres participants. Vous pouvez les modifier jusqu'au début de l'expérience ; elles sont effacées automatiquement 30 jours après.",
        "Répondre est nécessaire pour réserver : c'est ce qui nous permet de composer des groupes où chacun trouve sa place. Seules les questions marquées « facultatif » peuvent rester sans réponse."
      ],
      "en": [
        "Some experiences include a short questionnaire, 10 questions at most, that you fill in while booking, just before payment. You'll find your answers afterwards on the booking page (“Your questionnaire”).",
        [
          "For padel or running, it groups people with a similar level or pace: for example, four players of the same level per court.",
          "For paintball or at the table, it can instead mix profiles: beginners and regulars, listeners and people who get things going.",
          "Multiple choice only: no open questions, nothing sensitive."
        ],
        "Your answers are never shown to other participants. You can change them until the experience starts; they're deleted automatically 30 days after it.",
        "Answering is required to book: it's what lets us put groups together where everyone fits in. Only questions marked “optional” can be left blank."
      ]
    },
    "related": [
      "reserver-une-place",
      "niveau-materiel-et-tenue"
    ]
  },
  {
    "slug": "niveau-materiel-et-tenue",
    "category": "bookings",
    "title": {
      "fr": "Niveau, matériel, tenue : comment me préparer ?",
      "en": "Level, equipment, outfit: how do I get ready?"
    },
    "summary": {
      "fr": "Tout est indiqué sur la fiche de l'expérience, dans « Avant de venir ».",
      "en": "Everything is on the experience page, under “Before you come”."
    },
    "body": {
      "fr": [
        "Pour le sport, les jeux et les ateliers, la fiche de l'expérience précise ce qu'il faut savoir avant de venir :",
        [
          "Le niveau attendu : tous niveaux, débutant, intermédiaire ou confirmé.",
          "Le matériel fourni (raquettes, masque, tablier…) et ce que vous devez apporter (baskets propres, bouteille d'eau…).",
          "La tenue conseillée.",
          "L'âge minimum, s'il est supérieur à 18 ans.",
          "Si l'activité a lieu en plein air."
        ],
        "Pas sûr de votre niveau ? Choisissez une expérience « tous niveaux » et répondez honnêtement au questionnaire : nous vous placerons avec des personnes de votre niveau."
      ],
      "en": [
        "For sport, games and workshops, the experience page tells you what to know before you come:",
        [
          "The expected level: all levels, beginner, intermediate or advanced.",
          "Equipment provided (rackets, mask, apron…) and what you need to bring (clean trainers, water bottle…).",
          "The suggested outfit.",
          "The minimum age, if it's above 18.",
          "Whether the activity takes place outdoors."
        ],
        "Not sure about your level? Pick an “all levels” experience and answer the questionnaire honestly: we'll place you with people at your level."
      ]
    },
    "related": [
      "questionnaire-avant-l-experience",
      "activites-physiques-et-meteo"
    ]
  },
  {
    "slug": "activites-physiques-et-meteo",
    "category": "safety",
    "title": {
      "fr": "Activités physiques, âge minimum et météo",
      "en": "Physical activities, minimum age and weather"
    },
    "summary": {
      "fr": "Ce que vous acceptez en réservant une activité physique, et ce qui se passe s'il pleut.",
      "en": "What you accept when booking a physical activity, and what happens if it rains."
    },
    "body": {
      "fr": [
        "Pour les expériences marquées « Activité physique » (sport, padel, paintball, randonnée…), vous cochez une case en réservant : vous acceptez nos [conditions de participation aux activités physiques](/conditions-activites-physiques) et confirmez être en état de pratiquer.",
        [
          "Allez à votre rythme et suivez les consignes de l'encadrant et du lieu.",
          "En cas de doute sur votre santé, demandez l'avis d'un médecin avant de réserver. Ne nous envoyez aucun document médical.",
          "Certaines activités demandent un âge minimum plus élevé que 18 ans : il est vérifié à la réservation."
        ],
        "En plein air, si la météo ne permet pas l'activité en sécurité, nous vous prévenons au plus tôt : elle est reportée (vous gardez votre place ou êtes remboursé, au choix) ou annulée et intégralement remboursée."
      ],
      "en": [
        "For experiences marked “Physical activity” (sport, padel, paintball, hiking…), you tick a box when booking: you accept our [terms for physical activities](/conditions-activites-physiques) and confirm you're fit to take part.",
        [
          "Go at your own pace and follow the instructions of the coach and the venue.",
          "If you have any doubt about your health, ask a doctor before booking. Don't send us any medical document.",
          "Some activities require a minimum age above 18: it's checked when you book."
        ],
        "Outdoors, if the weather doesn't allow the activity to be done safely, we let you know as early as possible: it's postponed (you keep your spot or get a refund, your choice) or cancelled with a full refund."
      ]
    },
    "related": [
      "securite-pendant-une-experience",
      "niveau-materiel-et-tenue"
    ]
  },
  {
    "slug": "proposer-une-sortie",
    "category": "start",
    "title": {
      "fr": "Puis-je proposer ma propre sortie ?",
      "en": "Can I propose my own outing?"
    },
    "summary": {
      "fr": "Oui, si l'équipe vous a donné le statut de membre de confiance.",
      "en": "Yes, if the team has made you a trusted member."
    },
    "body": {
      "fr": [
        "L'équipe propose à certains habitués de devenir « membres de confiance ». Une rubrique « Proposer une sortie » apparaît alors dans leur espace.",
        [
          "Décrivez votre idée : univers, déroulé, quartier, lieu envisagé, dates, nombre de participants, prix envisagé.",
          "L'équipe la relit, vérifie le lieu, la sécurité et le prix, puis crée la fiche de l'expérience : rien n'est publié sans elle.",
          "Vous êtes prévenu dans vos notifications, que la proposition soit retenue ou non."
        ],
        "L'expérience publiée est organisée et vendue par Wenzy, aux mêmes conditions que les autres. Vous n'avez jamais à encaisser d'argent auprès des participants.",
        "Pas encore membre de confiance ? Une idée de sortie est toujours la bienvenue : [écrivez-nous](/contact)."
      ],
      "en": [
        "The team invites some regulars to become “trusted members”. A “Propose an outing” section then appears in their account.",
        [
          "Describe your idea: universe, how it goes, neighbourhood, venue in mind, dates, number of participants, intended price.",
          "The team reviews it, checks the venue, safety and price, then creates the experience page: nothing is published without it.",
          "You're told in your notifications whether the proposal goes ahead or not."
        ],
        "The published experience is organised and sold by Wenzy, on the same terms as the others. You never collect money from participants.",
        "Not a trusted member yet? Outing ideas are always welcome: [write to us](/contact)."
      ]
    },
    "related": [
      "comment-fonctionne-wenzy"
    ]
  },
  { slug: "payer-un-diner", category: "bookings", title: {"fr": "Combien vais-je payer ?", "en": "How much will I pay?"}, summary: {"fr": "35 DH en ligne, puis votre consommation ou le prix de l'activité sur place.", "en": "35 DH online, then your order or the activity price on site."}, body: {"fr": ["En ligne : 35 DH par place (ou votre pass, ou un crédit du carnet).", ["Tables : vous réglez votre consommation au restaurant. La gamme donne le budget habituel : par exemple pour un dîner, Casual 150 à 250 DH, Premium 250 à 400 DH, Exclusive 400 à 600 DH.", "Activités : le prix sur place (padel, cours, atelier…) est affiché sur la fiche."]], "en": ["Online: 35 DH per seat (or your pass, or a pack credit).", ["Tables: you pay for what you order at the restaurant. The tier gives the usual budget: for a dinner, Casual 150–250 DH, Premium 250–400 DH, Exclusive 400–600 DH.", "Activities: the on-site price (padel, class, workshop…) is shown on the page."]]}, related: ["comment-fonctionne-wenzy", "payer-ma-reservation", "annuler-une-reservation"] },
  {
    "slug": "assurance-et-activites-physiques",
    "category": "partner-hosting",
    "title": {
      "fr": "Assurance et activités physiques",
      "en": "Insurance and physical activities"
    },
    "summary": {
      "fr": "Pour le sport ou le paintball, nous vous demandons votre attestation de responsabilité civile.",
      "en": "For sport or paintball, we ask for your liability insurance certificate."
    },
    "body": {
      "fr": [
        "Pour accueillir une activité physique (sport, padel, paintball, randonnée…), nous vous demandons une copie de votre attestation d'assurance responsabilité civile, avec sa date de fin de validité.",
        [
          "Nous l'enregistrons sur votre fiche partenaire et vous prévenons avant son expiration.",
          "Vous restez responsable de vos installations, de votre matériel et de l'encadrement de l'activité.",
          "Les participants acceptent nos [conditions de participation aux activités physiques](/conditions-activites-physiques) avant de réserver ; présentez-leur les consignes de sécurité au début de l'activité."
        ],
        "Une question ? Écrivez-nous à {{supportEmail}}."
      ],
      "en": [
        "To host a physical activity (sport, padel, paintball, hiking…), we ask for a copy of your liability insurance certificate, with its expiry date.",
        [
          "We record it on your partner file and remind you before it expires.",
          "You remain responsible for your facilities, equipment and the coaching of the activity.",
          "Participants accept our [terms for physical activities](/conditions-activites-physiques) before booking; go through the safety instructions with them at the start."
        ],
        "Any questions? Write to us at {{supportEmail}}."
      ]
    },
    "related": [
      "preparer-l-accueil-d-un-groupe"
    ]
  },
];

/** Typographie française : espace insécable avant « ? ! : ; » et à l'intérieur des guillemets (évite un « ? » seul en début de ligne). */
const nbsp = (t: string) => t.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
for (const c of HELP_CATEGORIES_RAW) {
  c.title.fr = nbsp(c.title.fr);
  c.description.fr = nbsp(c.description.fr);
}
for (const a of HELP_ARTICLES_RAW) {
  a.title.fr = nbsp(a.title.fr);
  a.summary.fr = nbsp(a.summary.fr);
  a.body.fr = a.body.fr.map((b) => (Array.isArray(b) ? b.map(nbsp) : nbsp(b)));
}

/** Fusion de la version arabe (content/help-ar.ts) ; un article sans traduction arabe ferait échouer la compilation des pages. */
function arOf<T>(map: Record<string, T>, key: string): T {
  const v = map[key];
  if (!v) throw new Error(`Traduction arabe manquante pour l'aide : ${key}`);
  return v;
}
// Étape AB : rubriques et articles mis à jour ou ajoutés (content/help-z.ts, trois langues) ; les autres viennent d'ici.
void HELP_CATEGORIES_RAW;
export const HELP_CATEGORIES: HelpCategory[] = HELP_CATEGORIES_Z.map((c) => ({ ...c, title: { ...c.title, fr: nbsp(c.title.fr) }, description: { ...c.description, fr: nbsp(c.description.fr) } }));
const zSlugs = new Set(HELP_ARTICLES_Z.map((a) => a.slug));
export const HELP_ARTICLES: HelpArticle[] = [
  ...HELP_ARTICLES_RAW.filter((a) => !HELP_REMOVED.has(a.slug) && !zSlugs.has(a.slug)).map((a) => {
    const ar = arOf(HELP_ARTICLES_AR, a.slug);
    return { ...a, category: HELP_MOVED[a.slug] ?? a.category, title: { ...a.title, ar: ar.title }, summary: { ...a.summary, ar: ar.summary }, body: { ...a.body, ar: ar.body } };
  }),
  ...HELP_ARTICLES_Z.map((a) => ({ ...a, title: { ...a.title, fr: nbsp(a.title.fr) }, summary: { ...a.summary, fr: nbsp(a.summary.fr) }, body: { ...a.body, fr: a.body.fr.map((b) => (Array.isArray(b) ? b.map(nbsp) : nbsp(b))) } })),
].sort((a, b) => (HELP_ORDER.indexOf(a.slug) + 1 || 999) - (HELP_ORDER.indexOf(b.slug) + 1 || 999));

/** Page d'accueil de l'aide de chaque public. */
export const HELP_HUB: Record<HelpAudience, string> = { clients: "/aide", partners: "/aide/partenaires", organizers: "/aide/organisateurs" };

export const helpLang = (locale: string): HelpLang => (locale === "en" || locale === "ar" ? locale : "fr");
export const articleBySlug = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug);

/**
 * Étape 28 : paragraphes propres à un moyen de paiement, marqués « [[card]] », « [[bank_transfer]] » ou « [[none]] » :
 * seuls ceux du moyen ouvert sur le site sont affichés (plus de « bientôt par carte » contradictoire).
 */
export function forPaymentMethod<T extends string | string[]>(items: T[], method: "card" | "bank_transfer" | "none"): T[] {
  const keep = (line: string) => {
    const m = /^\[\[(card|bank_transfer|none)\]\]/.exec(line);
    return m ? (m[1] === method ? line.slice(m[0].length) : null) : line;
  };
  return items.flatMap((it) => {
    if (Array.isArray(it)) {
      const lines = it.flatMap((l) => (keep(l) === null ? [] : [keep(l)!]));
      return lines.length ? [lines as T] : [];
    }
    const l = keep(it);
    return l === null ? [] : [l as T];
  });
}
export const categoryOf = (key: HelpCategoryKey) => HELP_CATEGORIES.find((c) => c.key === key)!;
