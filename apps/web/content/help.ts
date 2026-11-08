/**
 * Centre d'aide — articles rédigés à partir du fonctionnement réel du site (délais, règles, écrans).
 * Français : référence. Anglais : traduction. Arabe : à traduire (la version française s'affiche avec une mention).
 * Liens internes : syntaxe [texte](/chemin). Jetons {{…}} : informations légales (lib/legal-info.ts) ou « à compléter ».
 */
import { ACCEPTED_HOLD_HOURS, HOLD_MINUTES, MEMBERSHIP_RENEW_WINDOW_DAYS, REVIEW_WINDOW_DAYS, WAITLIST_OFFER_HOURS } from "@thecommunity/shared";

export type HelpAudience = "clients" | "partners";
export type HelpCategoryKey = "start" | "bookings" | "membership" | "account" | "safety" | "partner-join" | "partner-hosting";
type L = { fr: string; en: string };
export type HelpBlock = string | string[];
export type HelpArticle = { slug: string; category: HelpCategoryKey; title: L; summary: L; body: { fr: HelpBlock[]; en: HelpBlock[] }; related?: string[] };
export type HelpCategory = { key: HelpCategoryKey; audience: HelpAudience; title: L; description: L };

export const HELP_CATEGORIES: HelpCategory[] = [
  { key: "start", audience: "clients", title: { fr: "Bien démarrer", en: "Getting started" }, description: { fr: "Le principe, votre compte, votre première expérience.", en: "How it works, your account, your first experience." } },
  { key: "bookings", audience: "clients", title: { fr: "Expériences et réservations", en: "Experiences and bookings" }, description: { fr: "Réserver, payer, annuler, liste d'attente, avis.", en: "Booking, paying, cancelling, waiting list, reviews." } },
  { key: "membership", audience: "clients", title: { fr: "Abonnement", en: "Membership" }, description: { fr: "Prix membre, accès anticipé, renouvellement.", en: "Member price, early access, renewal." } },
  { key: "account", audience: "clients", title: { fr: "Mon compte", en: "My account" }, description: { fr: "Connexion, notifications, langue, données personnelles.", en: "Signing in, notifications, language, personal data." } },
  { key: "safety", audience: "clients", title: { fr: "Sécurité", en: "Safety" }, description: { fr: "Se sentir bien pendant une expérience, signaler un problème.", en: "Feeling at ease during an experience, reporting a problem." } },
  { key: "partner-join", audience: "partners", title: { fr: "Devenir partenaire", en: "Becoming a partner" }, description: { fr: "Qui peut nous rejoindre, nos critères, comment ça se passe.", en: "Who can join, our criteria, how it works." } },
  { key: "partner-hosting", audience: "partners", title: { fr: "Accueillir un groupe", en: "Hosting a group" }, description: { fr: "Préparer une date, annulations, incidents.", en: "Preparing a date, cancellations, incidents." } },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ——— Bien démarrer ———
  {
    slug: "comment-fonctionne-the-host-club",
    category: "start",
    title: { fr: "Comment fonctionne The Host Club ?", en: "How does The Host Club work?" },
    summary: { fr: "Des expériences en petit groupe pour rencontrer de nouvelles personnes, sans rien organiser.", en: "Small-group experiences to meet new people, with nothing to organise." },
    body: {
      fr: [
        "The Host Club organise à Casablanca des expériences en petit groupe : dîners, ateliers, sport, jeux, sorties. Vous choisissez une date, nous nous occupons du lieu, du groupe et de l'accueil.",
        ["Choisissez une expérience dans le [catalogue](/experiences).", "Réservez votre place (seul, c'est très bien).", "Le jour J, retrouvez votre groupe dans un lieu public ou chez un partenaire sélectionné."],
        "Ce n'est pas une application de rencontre amoureuse : l'idée est d'élargir son cercle et de découvrir sa ville autrement.",
      ],
      en: [
        "The Host Club organises small-group experiences in Casablanca: dinners, workshops, sport, games, outings. You pick a date; we take care of the venue, the group and the welcome.",
        ["Choose an experience in the [catalogue](/experiences).", "Book your seat (coming alone is perfectly fine).", "On the day, meet your group in a public place or at a selected partner venue."],
        "This is not a dating app: the idea is to widen your circle and discover your city differently.",
      ],
    },
    related: ["creer-mon-compte", "venir-seul", "reserver-une-place"],
  },
  {
    slug: "creer-mon-compte",
    category: "start",
    title: { fr: "Créer mon compte et compléter mon profil", en: "Creating my account and completing my profile" },
    summary: { fr: "Inscription, confirmation de l'e-mail et questionnaire : ce qui est demandé et pourquoi.", en: "Sign-up, email confirmation and questionnaire: what we ask and why." },
    body: {
      fr: [
        "Pour réserver, il faut un compte. Créez-le depuis la page [Inscription](/inscription) avec votre adresse e-mail et un mot de passe.",
        ["Confirmez votre adresse e-mail grâce au lien reçu : c'est obligatoire avant de réserver.", "Répondez au court questionnaire de profil (prénom, date de naissance, langues parlées, centres d'intérêt).", "Vous devez avoir 18 ans ou plus."],
        "Ces réponses nous servent uniquement à composer des groupes équilibrés. Au sein d'un groupe, seuls votre prénom et vos centres d'intérêt sont visibles.",
      ],
      en: [
        "You need an account to book. Create one from the [Sign up](/inscription) page with your email address and a password.",
        ["Confirm your email address with the link we send you: this is required before booking.", "Answer the short profile questionnaire (first name, date of birth, languages spoken, interests).", "You must be 18 or older."],
        "We only use these answers to put balanced groups together. Within a group, only your first name and interests are visible.",
      ],
    },
    related: ["mot-de-passe-et-e-mail", "mes-donnees-personnelles"],
  },
  {
    slug: "venir-seul",
    category: "start",
    title: { fr: "Puis-je venir seul(e) ?", en: "Can I come on my own?" },
    summary: { fr: "Oui, c'est même le principe : la plupart des membres réservent seuls.", en: "Yes, that's the whole idea: most members book on their own." },
    body: {
      fr: [
        "Oui. La plupart des membres viennent seuls, et nos groupes sont pensés pour ça : notre équipe compose chaque table ou chaque équipe en tenant compte des langues parlées, des centres d'intérêt et de l'équilibre du groupe.",
        "Vous venez à deux ? Selon l'expérience, vous pouvez réserver plusieurs places en une seule fois (le nombre maximum est indiqué au moment de réserver).",
      ],
      en: [
        "Yes. Most members come alone, and our groups are designed for it: our team puts each table or team together based on languages spoken, interests and group balance.",
        "Coming with someone? Depending on the experience, you can book several seats at once (the maximum is shown when you book).",
      ],
    },
    related: ["comment-fonctionne-the-host-club", "regime-allergies-et-langues"],
  },
  // ——— Expériences et réservations ———
  {
    slug: "reserver-une-place",
    category: "bookings",
    title: { fr: "Réserver une place", en: "Booking a seat" },
    summary: { fr: `Votre place est bloquée ${HOLD_MINUTES} minutes le temps de payer.`, en: `Your seat is held for ${HOLD_MINUTES} minutes while you pay.` },
    body: {
      fr: [
        "Sur la fiche d'une expérience, choisissez une date puis « Réserver ». Indiquez le nombre de places si l'expérience le permet.",
        `Dès que vous lancez le paiement, la place est bloquée pour vous pendant ${HOLD_MINUTES} minutes. Passé ce délai sans paiement, elle est libérée pour les autres membres.`,
        "Une fois le paiement accepté, la réservation apparaît comme « Confirmée » dans [Mes réservations](/espace/reservations). Vous ne pouvez avoir qu'une réservation par date.",
        "Les réservations ferment quelques heures avant le début de l'expérience pour nous laisser composer les groupes.",
      ],
      en: [
        "On an experience page, pick a date then “Book”. Choose the number of seats if the experience allows it.",
        `As soon as you start paying, the seat is held for you for ${HOLD_MINUTES} minutes. If no payment is made in that time, it is released for other members.`,
        "Once payment is accepted, the booking shows as “Confirmed” in [My bookings](/espace/reservations). You can only hold one booking per date.",
        "Bookings close a few hours before the experience starts so we can put the groups together.",
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
  {
    slug: "payer-ma-reservation",
    category: "bookings",
    title: { fr: "Payer ma réservation", en: "Paying for my booking" },
    summary: { fr: "Paiement en ligne sur une page sécurisée ; un refus ne fait pas perdre la place tout de suite.", en: "Online payment on a secure page; a declined card doesn't lose your seat straight away." },
    body: {
      fr: [
        "Le paiement se fait en ligne, sur une page de paiement sécurisée. Nous ne voyons ni ne conservons jamais votre numéro de carte.",
        `Si le paiement est refusé, votre place reste bloquée jusqu'à la fin du délai de ${HOLD_MINUTES} minutes : vous pouvez réessayer depuis la page de votre réservation.`,
        "Tant que le paiement en ligne n'est pas ouvert, le site l'indique clairement (« mode test ») et aucune somme n'est débitée.",
        "Membre ? Le prix membre est appliqué automatiquement : vous voyez le prix public barré et votre prix à côté.",
        "Un code promo ? Saisissez-le avant de payer (« Vous avez un code promo ? ») : chaque code s'utilise une fois par personne. Les éventuels frais de service sont toujours affichés avant le paiement.",
      ],
      en: [
        "Payment is made online on a secure payment page. We never see or store your card number.",
        `If a payment is declined, your seat stays held until the end of the ${HOLD_MINUTES}-minute window: you can try again from your booking page.`,
        "Until online payment is open, the site says so clearly (“test mode”) and nothing is charged.",
        "A member? The member price is applied automatically: you'll see the public price struck through with your price next to it.",
        "Got a promo code? Enter it before paying (“Got a promo code?”): each code can be used once per person. Any service fee is always shown before payment.",
      ],
    },
    related: ["annuler-une-reservation", "comment-fonctionne-l-abonnement"],
  },
  {
    slug: "annuler-une-reservation",
    category: "bookings",
    title: { fr: "Annuler une réservation et être remboursé", en: "Cancelling a booking and getting a refund" },
    summary: { fr: "Gratuit jusqu'à 48 h avant le début ; intégralement remboursé si nous annulons.", en: "Free up to 48 hours before the start; fully refunded if we cancel." },
    body: {
      fr: [
        "Ouvrez la réservation dans [Mes réservations](/espace/reservations) puis « Annuler ma réservation ». Le montant remboursé est affiché avant que vous confirmiez.",
        ["Plus de 48 heures avant le début : annulation gratuite, remboursement intégral sur votre moyen de paiement.", "Moins de 48 heures avant : l'annulation reste possible (la place est proposée à la liste d'attente) mais elle n'est pas remboursée.", "Si nous annulons une date, vous êtes prévenu et intégralement remboursé. Si nous la déplaçons et que la nouvelle date ne vous convient pas, écrivez-nous : nous annulons votre place avec remboursement intégral."],
        "Le délai d'apparition du remboursement sur votre compte dépend de votre banque. Le détail figure dans les [conditions générales de vente](/cgv).",
      ],
      en: [
        "Open the booking in [My bookings](/espace/reservations) then “Cancel my booking”. The refund amount is shown before you confirm.",
        ["More than 48 hours before the start: free cancellation, full refund to your payment method.", "Less than 48 hours before: you can still cancel (the seat goes to the waiting list) but it isn't refunded.", "If we cancel a date, you're informed and fully refunded. If we move it and the new date doesn't suit you, write to us: we cancel your seat with a full refund."],
        "How long the refund takes to appear depends on your bank. Full details are in the [terms of sale](/cgv).",
      ],
    },
    related: ["liste-d-attente", "payer-ma-reservation"],
  },
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
        "Côté langues, chaque expérience indique celles qui y sont parlées (français, darija, arabe, anglais…). Au moment de réserver, choisissez la ou les langues que vous aimeriez parler à table : cela nous aide à vous placer dans un groupe où vous pourrez participer à la conversation.",
      ],
      en: [
        "Vegetarian, gluten-free, an allergy or another requirement? Tell us when you book, under “For your welcome”. With your consent, we pass it on to the partner venue so it can prepare. You can change it from your booking until the experience starts. Any doubt? Write to us via the [Contact](/contact) page.",
        "The menu or what's served is shown on each experience page under “What's included”.",
        "As for languages, each experience lists the ones spoken (French, Darija, Arabic, English…). When you book, pick the language(s) you'd like to speak at the table: it helps us place you in a group where you can join the conversation.",
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
        "Un avis qui ne respecte pas la [charte de bonne conduite](/securite) peut être masqué par l'équipe.",
      ],
      en: [
        `Once the experience is over, open your booking in [My bookings](/espace/reservations): you can give a rating from 1 to 5 and a comment for ${REVIEW_WINDOW_DAYS} days.`,
        "Reviews stay visible on the experience page, even when no new date is scheduled. Only your first name and last-name initial are shown.",
        "A review that breaks our [code of conduct](/securite) may be hidden by the team.",
      ],
    },
    related: ["signaler-un-comportement"],
  },
  // ——— Abonnement ———
  {
    slug: "comment-fonctionne-l-abonnement",
    category: "membership",
    title: { fr: "Comment fonctionne l'abonnement ?", en: "How does membership work?" },
    summary: { fr: "Une formule annuelle : prix membre, accès anticipé, expériences réservées aux membres.", en: "One annual plan: member price, early access, members-only experiences." },
    body: {
      fr: [
        "L'abonnement est une formule annuelle, valable 12 mois à partir du paiement. Ses avantages et son prix sont détaillés sur la page [Abonnement](/abonnement).",
        ["Un prix membre sur les expériences : le prix public apparaît barré, votre prix à côté.", "Un accès anticipé aux nouvelles dates, avant leur ouverture à tous.", "L'accès aux expériences réservées aux membres."],
        "Il n'y a pas de renouvellement automatique : rien n'est prélevé sans votre action.",
      ],
      en: [
        "Membership is an annual plan, valid for 12 months from payment. Its benefits and price are on the [Membership](/abonnement) page.",
        ["A member price on experiences: the public price is struck through with your price next to it.", "Early access to new dates, before they open to everyone.", "Access to members-only experiences."],
        "There's no automatic renewal: nothing is charged without you taking action.",
      ],
    },
    related: ["renouveler-mon-abonnement", "payer-ma-reservation"],
  },
  {
    slug: "renouveler-mon-abonnement",
    category: "membership",
    title: { fr: "Renouveler mon abonnement", en: "Renewing my membership" },
    summary: { fr: `Le renouvellement s'ouvre ${MEMBERSHIP_RENEW_WINDOW_DAYS} jours avant l'échéance, sans perdre de jours.`, en: `Renewal opens ${MEMBERSHIP_RENEW_WINDOW_DAYS} days before expiry, without losing any days.` },
    body: {
      fr: [
        `${MEMBERSHIP_RENEW_WINDOW_DAYS} jours avant la fin de votre abonnement, un bouton « Renouveler » apparaît sur la page [Abonnement](/abonnement).`,
        "Les 12 nouveaux mois s'ajoutent à la fin de la période en cours : renouveler en avance ne vous fait perdre aucun jour.",
        "Sans renouvellement, l'abonnement s'arrête simplement à son échéance et les prix publics s'appliquent de nouveau.",
      ],
      en: [
        `${MEMBERSHIP_RENEW_WINDOW_DAYS} days before your membership ends, a “Renew” button appears on the [Membership](/abonnement) page.`,
        "The 12 new months are added to the end of the current period: renewing early doesn't lose you any days.",
        "If you don't renew, membership simply ends on its expiry date and public prices apply again.",
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
        "Toujours bloqué ? Écrivez-nous via la page [Contact](/contact) avec l'adresse utilisée pour le compte.",
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
        ["Les expériences ont lieu dans des lieux publics ou chez des partenaires sélectionnés, jamais chez un participant.", "Au sein du groupe, seuls le prénom et les centres d'intérêt sont visibles : ni téléphone, ni e-mail, ni nom de famille.", "Vous pouvez partir à tout moment, sans vous justifier.", "L'alcool n'est jamais obligatoire ; des boissons sans alcool sont toujours proposées."],
        "En cas d'urgence au Maroc : Police 19, Gendarmerie royale 177, Protection civile 15. Toutes nos règles sont sur la page [Sécurité](/securite).",
      ],
      en: [
        ["Experiences take place in public places or at selected partner venues, never at a participant's home.", "Within the group, only first names and interests are visible: no phone numbers, emails or last names.", "You can leave at any time without giving a reason.", "Alcohol is never compulsory; alcohol-free drinks are always available."],
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
        "Vous ne gérez ni la vente ni le paiement : nous nous en chargeons, et nous vous amenons un groupe constitué.",
      ],
      en: [
        "Do you run a restaurant, café, sport or wellness studio, creative workshop or unusual venue, or do you lead activities? We're looking for partners to host our small groups in Casablanca.",
        ["Fill in the [application form](/devenir-partenaire) (5 minutes).", "Our team gets back to you for a chat and, where possible, a visit.", "Together we design the format: content, times, number of seats, price."],
        "You don't handle sales or payment: we do, and we bring you a ready-made group.",
      ],
    },
    related: ["criteres-de-selection", "remuneration-partenaire"],
  },
  {
    slug: "criteres-de-selection",
    category: "partner-join",
    title: { fr: "Nos critères de sélection", en: "Our selection criteria" },
    summary: { fr: "Accueil, qualité, sécurité et capacité à recevoir un petit groupe.", en: "Hospitality, quality, safety and room for a small group." },
    body: {
      fr: [
        "Nous choisissons nos partenaires avec soin, car ils font l'expérience de nos membres.",
        ["Un lieu ouvert au public, propre, sûr et facile d'accès.", "Un espace où un petit groupe peut échanger confortablement (table dédiée, salle, terrasse…).", "Une offre de qualité, avec des options sans alcool et, pour la restauration, une attention aux régimes et allergies.", "Un interlocuteur joignable le jour J.", "Le respect de notre [charte de bonne conduite](/securite) par votre équipe."],
      ],
      en: [
        "We choose our partners carefully, because they shape our members' experience.",
        ["A venue open to the public, clean, safe and easy to reach.", "A space where a small group can talk comfortably (dedicated table, room, terrace…).", "A quality offer, with alcohol-free options and, for food, care for diets and allergies.", "A contact person who can be reached on the day.", "Your team's respect for our [code of conduct](/securite)."],
      ],
    },
    related: ["devenir-partenaire"],
  },
  {
    slug: "remuneration-partenaire",
    category: "partner-join",
    title: { fr: "Comment êtes-vous rémunéré ?", en: "How do you get paid?" },
    summary: { fr: "Deux modèles possibles, fixés par écrit avant la première date.", en: "Two possible models, agreed in writing before the first date." },
    body: {
      fr: [
        "Nous convenons ensemble, par écrit et avant la première date, de l'un de ces deux modèles :",
        ["Achat de prestation : nous vous achetons un prix fixe par participant (par exemple un menu), quel que soit le prix de vente.", "Commission : vous fixez votre tarif et nous conservons un pourcentage convenu sur chaque place vendue."],
        "Les montants, le calendrier de paiement et les conditions d'annulation figurent dans l'accord de partenariat.",
      ],
      en: [
        "Before the first date, we agree in writing on one of these two models:",
        ["Service purchase: we pay you a fixed price per participant (for example a set menu), whatever the selling price.", "Commission: you set your rate and we keep an agreed percentage of each seat sold."],
        "Amounts, payment schedule and cancellation terms are set out in the partnership agreement.",
      ],
    },
    related: ["devenir-partenaire", "annulations-cote-partenaire"],
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
        ["Prévoyez la table ou l'espace convenu à l'heure indiquée.", "Accueillez le groupe sous le nom « The Host Club ».", "Prévenez-nous immédiatement en cas d'imprévu (retard, fermeture, problème technique)."],
        "Un espace partenaire en ligne est prévu dans une version ultérieure ; d'ici là, tout passe par votre interlocuteur The Host Club.",
      ],
      en: [
        "Before each date, our team sends you the number of confirmed participants and any special needs (diets, allergies), with no other personal data.",
        ["Have the agreed table or space ready at the stated time.", "Welcome the group under the name “The Host Club”.", "Tell us immediately if anything comes up (delay, closure, technical problem)."],
        "An online partner area is planned for a later version; until then, everything goes through your The Host Club contact.",
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
        "Les annulations côté participants (gratuites jusqu'à 48 h avant) sont gérées par nous ; le nombre final de participants vous est confirmé avant la date.",
        "Les conséquences d'une annulation tardive de part et d'autre sont prévues dans l'accord de partenariat.",
      ],
      en: [
        "If you can no longer host a date, tell us as early as possible. We move or cancel the date, and we take care of informing and refunding participants.",
        "Participant cancellations (free up to 48 hours before) are handled by us; the final headcount is confirmed to you before the date.",
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
        "Chaque membre accepte notre [charte de bonne conduite](/securite). Si un participant ne la respecte pas, votre équipe peut lui demander de partir.",
        "Signalez-nous ensuite ce qui s'est passé (date, heure, faits) à {{safetyEmail}} ou via la page [Contact](/contact). Nous prenons les mesures nécessaires, pouvant aller jusqu'à l'exclusion.",
        "En cas de danger immédiat, appelez d'abord le 19 (Police) ou le 15 (Protection civile).",
      ],
      en: [
        "Every member accepts our [code of conduct](/securite). If a participant breaks it, your team may ask them to leave.",
        "Then tell us what happened (date, time, facts) at {{safetyEmail}} or via the [Contact](/contact) page. We take the necessary steps, up to removing the member.",
        "If there's immediate danger, call 19 (Police) or 15 (Civil Protection) first.",
      ],
    },
    related: ["preparer-l-accueil-d-un-groupe"],
  },
];

/** Typographie française : espace insécable avant « ? ! : ; » et à l'intérieur des guillemets (évite un « ? » seul en début de ligne). */
const nbsp = (t: string) => t.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
for (const c of HELP_CATEGORIES) {
  c.title.fr = nbsp(c.title.fr);
  c.description.fr = nbsp(c.description.fr);
}
for (const a of HELP_ARTICLES) {
  a.title.fr = nbsp(a.title.fr);
  a.summary.fr = nbsp(a.summary.fr);
  a.body.fr = a.body.fr.map((b) => (Array.isArray(b) ? b.map(nbsp) : nbsp(b)));
}

export const helpLang = (locale: string): "fr" | "en" => (locale === "en" ? "en" : "fr");
export const articleBySlug = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug);
export const categoryOf = (key: HelpCategoryKey) => HELP_CATEGORIES.find((c) => c.key === key)!;
