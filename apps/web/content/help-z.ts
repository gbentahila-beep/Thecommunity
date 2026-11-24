/**
 * Centre d'aide, étape AB (docs/22) : trois publics bien séparés — Participants, Lieux partenaires, Organisateurs —
 * une rubrique « Le jour J et après », et les articles mis à jour (check-in « Je suis là », retard, chat ouvert au
 * check-in, Mon groupe, avatar Bab ; lieux et organisateurs encaissent sur place, sans commission).
 * Ce fichier complète content/help.ts (qui fait foi pour les autres articles) : catégories, articles remplacés ou
 * ajoutés (même identifiant = remplacé), articles retirés. Français, anglais et arabe ensemble.
 */
import type { HelpAudience, HelpBlock, HelpCategoryKey } from "./help";

type T3 = { fr: string; en: string; ar: string };
type B3 = { fr: HelpBlock[]; en: HelpBlock[]; ar: HelpBlock[] };
export type HelpArticleZ = { slug: string; category: HelpCategoryKey; title: T3; summary: T3; body: B3; related?: string[] };

/** Rubriques : public, titre et description (les autres restent celles de help.ts). */
export const HELP_CATEGORIES_Z: { key: HelpCategoryKey; audience: HelpAudience; title: T3; description: T3 }[] = [
  { key: "start", audience: "clients", title: { fr: "Bien démarrer", en: "Getting started", ar: "البداية" }, description: { fr: "Le principe, votre compte, venir seul·e.", en: "How it works, your account, coming alone.", ar: "المبدأ، حسابك، المجيء بمفردك." } },
  { key: "bookings", audience: "clients", title: { fr: "Réserver et payer", en: "Booking and paying", ar: "الحجز والدفع" }, description: { fr: "Réserver, payer, gammes, annuler, liste d'attente.", en: "Booking, paying, tiers, cancelling, waiting list.", ar: "الحجز، الدفع، الفئات، الإلغاء، قائمة الانتظار." } },
  { key: "day-of", audience: "clients", title: { fr: "Le jour J et après", en: "On the day and after", ar: "يوم الموعد وما بعده" }, description: { fr: "Le lieu, le check-in, votre table, le chat, revoir quelqu'un, les avis.", en: "The venue, check-in, your table, the chat, meeting again, reviews.", ar: "المكان، تسجيل الوصول، طاولتك، الدردشة، اللقاء من جديد، الآراء." } },
  { key: "membership", audience: "clients", title: { fr: "Carnet et Pass", en: "Pack and Pass", ar: "الدفتر والباس" }, description: { fr: "Carnet et Pass, absences.", en: "Pack and Pass, no-shows.", ar: "الدفتر والباس، الغياب." } },
  { key: "account", audience: "clients", title: { fr: "Mon compte", en: "My account", ar: "حسابي" }, description: { fr: "Connexion, photo, notifications, langue, données personnelles.", en: "Signing in, photo, notifications, language, personal data.", ar: "تسجيل الدخول، الصورة، الإشعارات، اللغة، المعطيات الشخصية." } },
  { key: "safety", audience: "clients", title: { fr: "Sécurité", en: "Safety", ar: "السلامة" }, description: { fr: "Se sentir bien pendant une expérience, signaler un problème.", en: "Feeling at ease during an experience, reporting a problem.", ar: "الشعور بالراحة أثناء التجربة، الإبلاغ عن مشكلة." } },
  { key: "partner-join", audience: "partners", title: { fr: "Devenir lieu partenaire", en: "Becoming a partner venue", ar: "كن مكاناً شريكاً" }, description: { fr: "Restaurants, cafés, clubs, studios, ateliers : accueillir nos groupes.", en: "Restaurants, cafés, clubs, studios, workshops: hosting our groups.", ar: "مطاعم، مقاهٍ، نوادٍ، استوديوهات، ورشات: استقبال مجموعاتنا." } },
  { key: "partner-hosting", audience: "partners", title: { fr: "Accueillir un groupe", en: "Hosting a group", ar: "استقبال مجموعة" }, description: { fr: "Préparer une date, annulations, incidents, assurance.", en: "Preparing a date, cancellations, incidents, insurance.", ar: "تحضير موعد، الإلغاءات، الحوادث، التأمين." } },
  { key: "org-start", audience: "organizers", title: { fr: "Devenir organisateur", en: "Becoming an organiser", ar: "كن منظِّماً" }, description: { fr: "Votre compte, comment vous êtes payé·e.", en: "Your account, how you get paid.", ar: "حسابك، وكيف تتقاضى أجرك." } },
  { key: "org-run", audience: "organizers", title: { fr: "Gérer vos activités", en: "Running your activities", ar: "إدارة أنشطتك" }, description: { fr: "Publier, participants, pointage, annulations.", en: "Publishing, participants, check-in, cancellations.", ar: "النشر، المشاركون، تسجيل الحضور، الإلغاءات." } },
];

/** Articles retirés (fonction supprimée : membres de confiance et propositions de sorties). */
export const HELP_REMOVED = new Set(["proposer-une-sortie"]);

export const HELP_ARTICLES_Z: HelpArticleZ[] = [
  // ——— Participants : bien démarrer ———
  {
    slug: "comment-fonctionne-wenzy", category: "start",
    title: { fr: "Comment fonctionne Wenzy ?", en: "How does Wenzy work?", ar: "كيف تعمل Wenzy؟" },
    summary: { fr: "Des rendez-vous en petit groupe pour rencontrer de nouvelles personnes : 35 DH en ligne, le reste sur place.", en: "Small-group meet-ups to meet new people: 35 DH online, the rest on site.", ar: "لقاءات في مجموعات صغيرة للتعرف على أشخاص جدد: 35 درهماً عبر الإنترنت، والباقي في المكان." },
    body: {
      fr: [
        "Wenzy organise à Casablanca des rendez-vous en petit groupe, dans quatre univers : Tables (café, brunch, dîner), Bouger, Sortir et Découvrir. Chaque semaine, les mêmes rendez-vous à jour fixe : le dîner du mercredi, l'activité et le café du samedi, le brunch du dimanche.",
        ["Choisissez votre rendez-vous dans [Découvrir](/experiences), votre gamme, et réservez la date de la semaine : 35 DH en ligne, ou rien avec le Pass.", "Pour les Tables, nous composons des tables de 4 à 6 d'après votre profil ; le lieu vous est révélé quelques heures avant, avec l'itinéraire.", "Sur place, appuyez sur « Je suis là » : vous découvrez votre table, les prénoms, et le chat du groupe s'ouvre.", "Votre repas ou l'activité se règle sur place."],
        "Ce n'est pas une application de rencontre amoureuse : l'idée est d'élargir son cercle.",
      ],
      en: [
        "Wenzy runs small-group meet-ups in Casablanca, in four worlds: Tables (coffee, brunch, dinner), Move, Go out and Discover. Every week, the same meet-ups on a fixed day: Wednesday dinner, Saturday's activity and coffee, Sunday brunch.",
        ["Pick a date in [Discover](/experiences) and book: 35 DH online, or nothing with the Pass.", "For Tables, we put tables of 4 to 6 together from your profile; the venue is revealed a few hours before, with directions.", "On site, tap “I'm here”: you see your table and first names, and the group chat opens.", "Your meal or the activity is paid on site."],
        "This is not a dating app: the idea is to widen your circle.",
      ],
      ar: [
        "تنظم Wenzy في الدار البيضاء لقاءات في مجموعات صغيرة، ضمن أربعة عوالم: الموائد (قهوة، برانش، عشاء)، الحركة، الخروج والاكتشاف. كل أسبوع، نفس المواعيد في يوم ثابت: عشاء الأربعاء، نشاط وقهوة السبت، وبرانش الأحد.",
        ["اختر موعدك في [اكتشف](/experiences) وفئتك، واحجز موعد هذا الأسبوع: 35 درهماً عبر الإنترنت، أو لا شيء مع الباس.", "بالنسبة للموائد، نكوّن طاولات من 4 إلى 6 أشخاص حسب ملفك؛ ويُكشف عن المكان قبل ساعات مع الاتجاهات.", "في المكان، اضغط على « أنا هنا »: تكتشف طاولتك والأسماء، وتُفتح دردشة المجموعة.", "تدفع وجبتك أو النشاط في المكان."],
        "ليست تطبيقاً للمواعدة: الفكرة هي توسيع دائرة معارفك.",
      ],
    },
    related: ["venir-seul", "payer-un-diner", "check-in-et-ma-table"],
  },
  // ——— Participants : le jour J et après ———
  {
    slug: "le-lieu-secret", category: "day-of",
    title: { fr: "Le lieu : quand et comment je le découvre", en: "The venue: when and how I find out", ar: "المكان: متى وكيف أكتشفه" },
    summary: { fr: "Révélé quelques heures avant pour les Tables, avec l'adresse exacte, la carte et l'itinéraire.", en: "Revealed a few hours before for Tables, with the exact address, map and directions.", ar: "يُكشف عنه قبل ساعات بالنسبة للموائد، مع العنوان الدقيق والخريطة والاتجاهات." },
    body: {
      fr: [
        "Pour les Tables, le restaurant est choisi après la fermeture des réservations, parmi nos lieux partenaires de la gamme choisie.",
        ["Il vous est révélé quelques heures avant, par notification et e-mail : 5 h avant un dîner, la veille au soir ou tôt le matin pour un café, un brunch ou un déjeuner.", "Dans votre réservation, la carte du lieu affiche son nom, l'adresse exacte, la carte et le bouton « Itinéraire ».", "Plusieurs restaurants peuvent accueillir les tables d'une même date.", "S'il change, vous êtes prévenu·e aussitôt."],
        "Pour les autres activités, le lieu est indiqué dès la fiche, avec la même carte et l'itinéraire.",
      ],
      en: [
        "For Tables, the restaurant is chosen after bookings close, among our partner venues of the chosen tier.",
        ["It is revealed a few hours before, by notification and email: 5 hours before a dinner, the evening before or early morning for a coffee, brunch or lunch.", "In your booking, the venue card shows its name, exact address, map and a “Directions” button.", "Several restaurants may host the tables of the same date.", "If it changes, you're told right away."],
        "For other activities, the venue is shown on the experience page from the start, with the same map and directions.",
      ],
      ar: [
        "بالنسبة للموائد، يُختار المطعم بعد إغلاق الحجوزات، من بين أماكننا الشريكة من الفئة المختارة.",
        ["يُكشف لك عنه قبل ساعات عبر إشعار وبريد إلكتروني: 5 ساعات قبل العشاء، ومساء اليوم السابق أو صباحاً باكراً للقهوة أو البرانش أو الغداء.", "في حجزك، تعرض بطاقة المكان اسمه وعنوانه الدقيق والخريطة وزر « الاتجاهات ».", "قد تستقبل عدة مطاعم طاولات الموعد نفسه.", "إذا تغيّر، تُبلَّغ فوراً."],
        "بالنسبة للأنشطة الأخرى، يظهر المكان منذ البداية في صفحة التجربة، مع الخريطة والاتجاهات نفسها.",
      ],
    },
    related: ["check-in-et-ma-table", "gammes-des-tables"],
  },
  {
    slug: "check-in-et-ma-table", category: "day-of",
    title: { fr: "Le check-in : « Je suis là »", en: "Checking in: “I'm here”", ar: "تسجيل الوصول: « أنا هنا »" },
    summary: { fr: "Sur place, appuyez sur « Je suis là » : vous voyez votre table, les prénoms, et le chat du groupe s'ouvre.", en: "On site, tap “I'm here”: you see your table and first names, and the group chat opens.", ar: "في المكان، اضغط على « أنا هنا »: ترى طاولتك والأسماء، وتُفتح دردشة المجموعة." },
    body: {
      fr: [
        "À la révélation, vous recevez un résumé de votre table, sans les noms (âges, langues, secteurs, centres d'intérêt).",
        ["Le jour J, de 30 minutes avant à 1 h après le début, appuyez sur « Je suis là » dans votre réservation.", "Vous voyez alors votre table, les prénoms et le statut de chacun : arrivé·e, en retard, pas encore là.", "Le chat du groupe s'ouvre en même temps : pratique pour dire où vous êtes."],
        "Sans check-in, la place est notée comme une absence (voir [Absences et suspension du pass](/aide/absences)).",
      ],
      en: [
        "When the venue is revealed, you get a summary of your table without names (ages, languages, sectors, interests).",
        ["On the day, from 30 minutes before to 1 hour after the start, tap “I'm here” in your booking.", "You then see your table, first names and everyone's status: arrived, running late, not here yet.", "The group chat opens at the same time: handy to say where you are."],
        "Without check-in, the seat counts as a no-show (see [No-shows and pass suspension](/aide/absences)).",
      ],
      ar: [
        "عند الكشف عن المكان، تتلقى ملخصاً عن طاولتك دون الأسماء (الأعمار، اللغات، القطاعات، الاهتمامات).",
        ["في يوم الموعد، من 30 دقيقة قبل البداية إلى ساعة بعدها، اضغط على « أنا هنا » في حجزك.", "ترى حينها طاولتك والأسماء وحالة كل شخص: وصل، متأخر، لم يصل بعد.", "تُفتح دردشة المجموعة في الوقت نفسه: مفيدة لتقول أين أنت."],
        "بدون تسجيل الوصول، يُحتسب المكان غياباً (انظر [الغياب وتعليق الباس](/aide/absences)).",
      ],
    },
    related: ["je-serai-en-retard", "chat-du-groupe", "le-lieu-secret"],
  },
  {
    slug: "je-serai-en-retard", category: "day-of",
    title: { fr: "Je serai en retard", en: "I'll be late", ar: "سأتأخر" },
    summary: { fr: "Prévenez votre table en un geste depuis votre réservation.", en: "Let your table know in one tap from your booking.", ar: "أخبر طاولتك بلمسة واحدة من حجزك." },
    body: {
      fr: [
        "De 3 h avant le début à 30 minutes après, le bouton « Je serai en retard » apparaît dans votre réservation.",
        ["Choisissez 10, 20 ou 30 minutes.", "Votre table voit « En retard » à côté de votre prénom.", "Vous pouvez modifier ce retard ; une fois arrivé·e, appuyez sur « Je suis là »."],
        "Vous ne pourrez finalement pas venir ? Annulez depuis votre réservation pour libérer la place.",
      ],
      en: [
        "From 3 hours before the start to 30 minutes after, an “I'll be late” button appears in your booking.",
        ["Choose 10, 20 or 30 minutes.", "Your table sees “Running late” next to your first name.", "You can change it; once there, tap “I'm here”."],
        "Can't make it after all? Cancel from your booking to free the seat.",
      ],
      ar: [
        "من 3 ساعات قبل البداية إلى 30 دقيقة بعدها، يظهر زر « سأتأخر » في حجزك.",
        ["اختر 10 أو 20 أو 30 دقيقة.", "ترى طاولتك « متأخر » بجانب اسمك.", "يمكنك تعديل التأخير؛ وعند وصولك، اضغط على « أنا هنا »."],
        "لن تتمكن من الحضور في النهاية؟ ألغِ من حجزك لتحرير المكان.",
      ],
    },
    related: ["check-in-et-ma-table", "annuler-une-reservation"],
  },
  {
    slug: "chat-du-groupe", category: "day-of",
    title: { fr: "Le chat de mon groupe", en: "My group chat", ar: "دردشة مجموعتي" },
    summary: { fr: "Ouvert dès votre check-in, il reste 14 jours dans « Mon groupe ».", en: "Open from your check-in, it stays 14 days in “My group”.", ar: "تُفتح منذ تسجيل وصولك، وتبقى 14 يوماً في « مجموعتي »." },
    body: {
      fr: [
        "Le chat s'ouvre pour chaque personne au moment où elle fait son check-in : seules les personnes arrivées y ont accès.",
        ["Pratique sur place : « je suis à la table du fond », « j'arrive dans 5 minutes ».", "Il reste ouvert 14 jours après la rencontre, dans [Mon groupe](/espace/rencontres).", "Ni numéro ni réseaux ne sont affichés : chacun apparaît avec son prénom et sa photo, ou sa tête de Bab."],
        "Un message déplacé ? [Signalez-le](/aide/signaler-un-comportement) : l'équipe s'en occupe.",
      ],
      en: [
        "The chat opens for each person when they check in: only people who have arrived can see it.",
        ["Handy on site: “I'm at the back table”, “5 minutes away”.", "It stays open 14 days after the meet-up, in [My group](/espace/rencontres).", "No phone numbers or social media are shown: everyone appears with their first name and photo, or their Bab."],
        "An inappropriate message? [Report it](/aide/signaler-un-comportement): our team handles it.",
      ],
      ar: [
        "تُفتح الدردشة لكل شخص عند تسجيل وصوله: لا يصل إليها إلا من وصل.",
        ["مفيدة في المكان: « أنا في الطاولة الخلفية »، « أصل بعد 5 دقائق ».", "تبقى مفتوحة 14 يوماً بعد اللقاء، في [مجموعتي](/espace/rencontres).", "لا تظهر الأرقام ولا الحسابات: يظهر كل شخص باسمه الأول وصورته، أو برأس باب الخاص به."],
        "رسالة غير لائقة؟ [أبلغ عنها](/aide/signaler-un-comportement): يتكفّل بها فريقنا.",
      ],
    },
    related: ["check-in-et-ma-table", "revoir-quelqu-un"],
  },
  {
    slug: "revoir-quelqu-un", category: "day-of",
    title: { fr: "Revoir quelqu'un de mon groupe", en: "Meeting someone from my group again", ar: "لقاء شخص من مجموعتي من جديد" },
    summary: { fr: "Dites avec qui vous aimeriez refaire une sortie : c'est privé tant que l'envie n'est pas partagée.", en: "Say who you'd like to go out with again: it stays private unless it's mutual.", ar: "قل مع من تودّ الخروج مجدداً: يبقى ذلك خاصاً ما لم تكن الرغبة متبادلة." },
    body: {
      fr: [
        "Après la rencontre, ouvrez [Mon groupe](/espace/rencontres).",
        ["Appuyez sur « J'aimerais revoir… » à côté d'un prénom, jusqu'à 60 jours après l'expérience.", "La personne ne le sait que si elle a fait le même choix : vous apparaissez alors l'un pour l'autre dans « Envie partagée de se revoir ».", "Vous pouvez ensuite vous inviter à une prochaine expérience.", "« Ne plus être réuni·e » : vous ne serez plus placé·e dans le même groupe, sans que la personne le sache."],
      ],
      en: [
        "After the meet-up, open [My group](/espace/rencontres).",
        ["Tap “I'd like to see … again” next to a first name, up to 60 days after the experience.", "The person only knows if they made the same choice: you then appear to each other under “Both want to meet again”.", "You can then invite each other to a next experience.", "“Don't group us again”: you won't be placed in the same group, without the person knowing."],
      ],
      ar: [
        "بعد اللقاء، افتح [مجموعتي](/espace/rencontres).",
        ["اضغط على « أودّ رؤية… مجدداً » بجانب الاسم، حتى 60 يوماً بعد التجربة.", "لا يعرف الشخص بذلك إلا إذا قام بالاختيار نفسه: تظهران حينها لبعضكما في « رغبة مشتركة في اللقاء مجدداً ».", "يمكنكما بعد ذلك دعوة بعضكما إلى تجربة قادمة.", "« عدم الجمع مجدداً »: لن توضع في المجموعة نفسها، دون أن يعلم الشخص."],
      ],
    },
    related: ["chat-du-groupe", "laisser-un-avis"],
  },
  // ——— Participants : mon compte ———
  {
    slug: "photo-de-profil", category: "account",
    title: { fr: "Ma photo de profil et ma tête de Bab", en: "My profile photo and my Bab", ar: "صورتي الشخصية ورأس باب الخاص بي" },
    summary: { fr: "Sans photo, un Bab vous représente auprès de votre groupe.", en: "Without a photo, a Bab represents you in your group.", ar: "بدون صورة، يمثلك باب أمام مجموعتك." },
    body: {
      fr: [
        "Votre groupe voit votre prénom et votre photo de profil. Vous n'en avez pas mis ? Un Bab, l'un des petits personnages de Wenzy, vous représente : c'est toujours le même pour vous, partout sur le site.",
        ["Ajouter ou changer votre photo : [Mon profil](/espace/profil) → « Modifier mon profil ».", "Choisissez une photo où l'on voit votre visage, sans autre personne.", "Votre photo n'est visible que par les membres de vos groupes."],
      ],
      en: [
        "Your group sees your first name and profile photo. Haven't added one? A Bab, one of Wenzy's little characters, represents you: always the same one for you, everywhere on the site.",
        ["Add or change your photo: [My profile](/espace/profil) → “Edit my profile”.", "Choose a photo showing your face, with no one else.", "Your photo is only visible to the members of your groups."],
      ],
      ar: [
        "ترى مجموعتك اسمك الأول وصورتك الشخصية. لم تضف صورة؟ يمثلك باب، أحد شخصيات Wenzy الصغيرة: هو نفسه دائماً لك، في كل الموقع.",
        ["لإضافة صورتك أو تغييرها: [ملفي الشخصي](/espace/profil) ← « تعديل ملفي ».", "اختر صورة يظهر فيها وجهك، دون أشخاص آخرين.", "لا يرى صورتك إلا أعضاء مجموعاتك."],
      ],
    },
    related: ["creer-mon-compte", "mes-donnees-personnelles"],
  },
  // ——— Lieux partenaires ———
  {
    slug: "devenir-partenaire", category: "partner-join",
    title: { fr: "Devenir lieu partenaire", en: "Becoming a partner venue", ar: "كن مكاناً شريكاً" },
    summary: { fr: "Restaurants, cafés, clubs, studios, ateliers : accueillez nos petits groupes.", en: "Restaurants, cafés, clubs, studios, workshops: host our small groups.", ar: "مطاعم، مقاهٍ، نوادٍ، استوديوهات، ورشات: استقبل مجموعاتنا الصغيرة." },
    body: {
      fr: [
        "Vous tenez un restaurant, un café, un club de sport, un studio ou un atelier à Casablanca ? Accueillez nos petits groupes : nous vous amenons des personnes qui ont réservé, vous les recevez comme des clients.",
        ["Remplissez le [formulaire](/devenir-partenaire) (5 minutes).", "Notre équipe vous recontacte pour un échange et, si possible, une visite.", "Nous remplissons ensemble votre fiche : gammes, formats, créneaux, nombre de tables, adresse et coordonnées GPS."],
        "Vous voulez publier et vendre vos propres activités (cours, ateliers, visites) ? C'est le rôle d'organisateur : voir [Créer votre compte organisateur](/aide/espace-organisateur).",
      ],
      en: [
        "Do you run a restaurant, café, sports club, studio or workshop in Casablanca? Host our small groups: we bring you people who have booked, and you welcome them as customers.",
        ["Fill in the [form](/devenir-partenaire) (5 minutes).", "Our team gets back to you for a chat and, if possible, a visit.", "Together we fill in your venue sheet: tiers, formats, time slots, number of tables, address and GPS coordinates."],
        "Want to publish and sell your own activities (classes, workshops, tours)? That's the organiser role: see [Creating your organiser account](/aide/espace-organisateur).",
      ],
      ar: [
        "تدير مطعماً أو مقهى أو نادياً رياضياً أو استوديو أو ورشة في الدار البيضاء؟ استقبل مجموعاتنا الصغيرة: نأتيك بأشخاص حجزوا، وتستقبلهم كزبائن.",
        ["املأ [الاستمارة](/devenir-partenaire) (5 دقائق).", "يتواصل معك فريقنا لحديث، وإن أمكن لزيارة.", "نملأ معاً بطاقة مكانك: الفئات، الصيغ، الأوقات، عدد الطاولات، العنوان وإحداثيات GPS."],
        "تريد نشر أنشطتك الخاصة وبيعها (دروس، ورشات، جولات)؟ هذا دور المنظِّم: انظر [إنشاء حساب منظِّم](/aide/espace-organisateur).",
      ],
    },
    related: ["criteres-de-selection", "remuneration-partenaire"],
  },
  {
    slug: "remuneration-partenaire", category: "partner-join",
    title: { fr: "Comment êtes-vous payé ?", en: "How do you get paid?", ar: "كيف تتقاضى أجرك؟" },
    summary: { fr: "Les participants règlent leur consommation chez vous ; Wenzy ne prend aucune commission.", en: "Participants pay for what they order at your venue; Wenzy takes no commission.", ar: "يدفع المشاركون استهلاكهم لديك؛ ولا تأخذ Wenzy أي عمولة." },
    body: {
      fr: [
        ["Nous vous envoyons une demande pour une date (nombre de tables, gamme) : vous acceptez ou refusez en un clic.", "Les participants règlent leur consommation, ou le prix convenu, directement chez vous.", "Wenzy ne perçoit que ses frais de réservation, payés en ligne par le participant : il n'y a ni commission ni reversement."],
      ],
      en: [
        ["We send you a request for a date (number of tables, tier): you accept or decline in one click.", "Participants pay for what they order, or the agreed price, directly at your venue.", "Wenzy only receives its booking fee, paid online by the participant: there is no commission and no payout."],
      ],
      ar: [
        ["نرسل إليك طلباً لموعد (عدد الطاولات، الفئة): تقبل أو ترفض بنقرة واحدة.", "يدفع المشاركون استهلاكهم، أو الثمن المتفق عليه، مباشرة لديك.", "لا تتقاضى Wenzy سوى رسوم الحجز التي يدفعها المشارك عبر الإنترنت: لا عمولة ولا تحويلات."],
      ],
    },
    related: ["devenir-partenaire", "preparer-l-accueil-d-un-groupe"],
  },
  {
    slug: "preparer-l-accueil-d-un-groupe", category: "partner-hosting",
    title: { fr: "Préparer l'accueil d'un groupe", en: "Preparing to host a group", ar: "التحضير لاستقبال مجموعة" },
    summary: { fr: "Ce que nous vous transmettons avant chaque date, et ce que nous attendons le jour J.", en: "What we send you before each date, and what we expect on the day.", ar: "ما نرسله إليك قبل كل موعد، وما ننتظره يوم الموعد." },
    body: {
      fr: [
        "1 h avant chaque date, vous recevez un récapitulatif : les tables attendues, les prénoms, et les régimes ou allergies que les participants ont accepté de partager.",
        ["Prévoyez les tables convenues à l'heure indiquée, au nom de « Wenzy ».", "Les participants arrivent seuls et se retrouvent grâce à l'application : pas besoin d'hôte.", "Des coordonnées GPS exactes sur votre fiche permettent à chacun d'arriver sans se perdre.", "Prévenez-nous immédiatement en cas d'imprévu (retard, fermeture, problème technique)."],
      ],
      en: [
        "1 hour before each date, you receive a summary: the tables expected, first names, and the diets or allergies participants agreed to share.",
        ["Have the agreed tables ready at the time given, under the name “Wenzy”.", "Participants arrive on their own and find each other through the app: no host needed.", "Exact GPS coordinates on your venue sheet help everyone arrive without getting lost.", "Tell us right away if anything comes up (delay, closure, technical problem)."],
      ],
      ar: [
        "قبل ساعة من كل موعد، تتلقى ملخصاً: الطاولات المنتظرة، الأسماء، والأنظمة الغذائية أو الحساسيات التي وافق المشاركون على مشاركتها.",
        ["جهّز الطاولات المتفق عليها في الوقت المحدد، باسم « Wenzy ».", "يصل المشاركون بمفردهم ويلتقون بفضل التطبيق: لا حاجة إلى مضيف.", "تساعد إحداثيات GPS الدقيقة في بطاقتك الجميع على الوصول دون أن يضيعوا.", "أخبرنا فوراً عند أي طارئ (تأخير، إغلاق، مشكل تقني)."],
      ],
    },
    related: ["annulations-cote-partenaire", "incident-avec-un-participant"],
  },
  // ——— Organisateurs ———
  {
    slug: "espace-organisateur", category: "org-start",
    title: { fr: "Créer votre compte organisateur", en: "Creating your organiser account", ar: "إنشاء حساب منظِّم" },
    summary: { fr: "Clubs, coachs, guides, ateliers : publiez vos activités et encaissez sur place.", en: "Clubs, coaches, guides, workshops: publish your activities and get paid on site.", ar: "نوادٍ، مدربون، مرشدون، ورشات: انشر أنشطتك وتقاضَ أجرك في المكان." },
    body: {
      fr: [
        "Vous animez des activités (cours, ateliers, sorties, visites) ? Publiez-les sur Wenzy depuis l'[espace organisateur](/pro).",
        ["Créez votre compte : présentation, où vous publierez (Activités, Événements, ou les deux ; les Tables sont les rendez-vous de Wenzy), pièces justificatives (registre de commerce ou statut d'auto-entrepreneur, attestation d'assurance) et acceptation du [contrat organisateur](/contrat-organisateur).", "L'équipe vérifie votre demande, en général sous 48 h ouvrées, et peut vous demander un complément.", "Un lieu partenaire qui veut organiser ses propres événements peut aussi devenir organisateur."],
      ],
      en: [
        "Do you run activities (classes, workshops, outings, tours)? Publish them on Wenzy from the [organiser area](/pro).",
        ["Create your account: introduction, where you will publish (Activities, Events, or both; Tables are Wenzy's own gatherings), supporting documents (trade register or self-employed status, insurance certificate) and acceptance of the [organiser agreement](/contrat-organisateur).", "Our team reviews your application, usually within 2 working days, and may ask for more information.", "A partner venue that wants to run its own events can also become an organiser."],
      ],
      ar: [
        "تنشّط أنشطة (دروس، ورشات، خرجات، جولات)؟ انشرها على Wenzy من [فضاء المنظِّم](/pro).",
        ["أنشئ حسابك: التقديم، القسم الذي ستنشر فيه (الأنشطة أو الفعاليات أو كلاهما؛ الموائد هي مواعيد Wenzy)، الوثائق الداعمة (السجل التجاري أو صفة المقاول الذاتي، شهادة التأمين) وقبول [عقد المنظِّم](/contrat-organisateur).", "يدرس الفريق طلبك، عادةً خلال يومي عمل، وقد يطلب منك معلومات إضافية.", "يمكن لمكان شريك يريد تنظيم فعالياته الخاصة أن يصبح منظِّماً أيضاً."],
      ],
    },
    related: ["remuneration-organisateur", "publier-une-activite"],
  },
  {
    slug: "remuneration-organisateur", category: "org-start",
    title: { fr: "Comment êtes-vous payé ?", en: "How do you get paid?", ar: "كيف تتقاضى أجرك؟" },
    summary: { fr: "Vos participants vous règlent sur place ; Wenzy ne prend aucune commission.", en: "Your participants pay you on site; Wenzy takes no commission.", ar: "يدفع لك المشاركون في المكان؛ ولا تأخذ Wenzy أي عمولة." },
    body: {
      fr: [
        ["Le participant paie en ligne les frais Wenzy (35 DH, ou son Pass).", "Il vous règle le prix de l'activité sur place, directement.", "Wenzy ne perçoit rien sur votre prix : ni commission, ni reversement."],
        "Vos chiffres (réservations, participants, présence) sont dans « Statistiques », dans l'[espace organisateur](/pro).",
      ],
      en: [
        ["The participant pays the Wenzy fee online (35 DH, or their Pass).", "They pay you the price of the activity on site, directly.", "Wenzy takes nothing from your price: no commission, no payout."],
        "Your figures (bookings, participants, attendance) are under “Statistics” in the [organiser area](/pro).",
      ],
      ar: [
        ["يدفع المشارك رسوم Wenzy عبر الإنترنت (35 درهماً، أو باسه).", "ويدفع لك ثمن النشاط في المكان مباشرة.", "لا تأخذ Wenzy شيئاً من ثمنك: لا عمولة ولا تحويلات."],
        "أرقامك (الحجوزات، المشاركون، الحضور) في « الإحصائيات » ضمن [فضاء المنظِّم](/pro).",
      ],
    },
    related: ["espace-organisateur", "participants-et-pointage"],
  },
  {
    slug: "publier-une-activite", category: "org-run",
    title: { fr: "Publier une activité et ses dates", en: "Publishing an activity and its dates", ar: "نشر نشاط ومواعيده" },
    summary: { fr: "L'équipe valide chaque activité, chaque modification et chaque nouvelle date avant leur mise en ligne.", en: "Our team approves every activity, every change and every new date before it goes live.", ar: "يصادق الفريق على كل نشاط وكل تعديل وكل موعد جديد قبل نشره." },
    body: {
      fr: [
        ["Dans l'[espace organisateur](/pro), créez l'activité dans Activités ou Événements : titre, description, lieu (nom, adresse, coordonnées GPS), prix sur place, nombre de places.", "Ajoutez vos dates.", "« Envoyer pour validation » : l'équipe relit l'activité et peut vous demander une correction.", "Une fois publiée, elle apparaît dans Découvrir, avec votre nom d'organisateur."],
        "Une modification d'une activité en ligne, ou de nouvelles dates ? Enregistrez-les : elles partent en validation et la version en ligne reste inchangée jusqu'à l'accord de l'équipe. Vous êtes prévenu(e) dès qu'elles sont en ligne.",
        "Vous pouvez aussi proposer une activité en ligne pour l'activité du samedi (bouton « Proposer pour un samedi » sur sa fiche) : si l'équipe la retient, elle devient l'activité du samedi choisi.",
      ],
      en: [
        ["In the [organiser area](/pro), create the activity under Activities or Events: title, description, venue (name, address, GPS coordinates), on-site price, number of places.", "Add your dates.", "“Send for review”: our team checks the activity and may ask for a change.", "Once published, it appears in Discover, with your organiser name."],
        "Changing an online activity, or adding dates? Save them: they go for review and the online version stays as it is until our team approves. You are notified as soon as they are live.",
        "You can also propose an online activity for the Saturday activity (“Propose for a Saturday” on its page): if our team picks it, it becomes the activity of the chosen Saturday.",
      ],
      ar: [
        ["في [فضاء المنظِّم](/pro)، أنشئ النشاط في الأنشطة أو الفعاليات: العنوان، الوصف، المكان (الاسم، العنوان، إحداثيات GPS)، الثمن في المكان، عدد الأماكن.", "أضف مواعيدك.", "« إرسال للمراجعة »: يراجع الفريق النشاط وقد يطلب منك تصحيحاً.", "بعد نشره، يظهر في « اكتشف » باسمك كمنظِّم."],
        "تعديل نشاط منشور أو إضافة مواعيد؟ احفظها: تُرسل للمراجعة وتبقى النسخة المنشورة كما هي إلى أن يوافق الفريق. ونُخبرك فور نشرها.",
        "يمكنك أيضاً اقتراح نشاط منشور لنشاط السبت (زر « اقتراح ليوم سبت » في صفحته): إذا اختاره الفريق، يصبح نشاط السبت المختار.",
      ],
    },
    related: ["participants-et-pointage", "annuler-une-date-organisateur"],
  },
  {
    slug: "participants-et-pointage", category: "org-run",
    title: { fr: "Vos participants et le pointage", en: "Your participants and check-in", ar: "مشاركوك وتسجيل الحضور" },
    summary: { fr: "Liste des inscrits, besoins particuliers, pointage à l'entrée.", en: "List of attendees, special needs, check-in at the door.", ar: "قائمة المسجلين، الاحتياجات الخاصة، تسجيل الحضور عند الدخول." },
    body: {
      fr: [
        ["Sur la page de chaque date, retrouvez les inscrits (prénom, initiale, téléphone pour les joindre le jour J), avec leurs régimes ou allergies s'ils ont accepté de les partager. La liste ne s'exporte pas ; le téléphone reste visible jusqu'à 7 jours après la date et ne sert qu'à l'activité.", "À l'entrée, pointez chacun avec le code ou le QR code de son billet.", "Un problème avec un participant ? Signalez-le depuis la date : l'équipe s'en occupe."],
        "En cas de danger immédiat, appelez d'abord le 19 (Police) ou le 15 (Protection civile).",
      ],
      en: [
        ["On each date's page, find the attendees (first name, initial, phone to reach them on the day), with their diets or allergies if they agreed to share them. The list cannot be exported; the phone stays visible until 7 days after the date and is only for the activity.", "At the door, check everyone in with the code or QR code on their ticket.", "A problem with a participant? Report it from the date: our team handles it."],
        "In case of immediate danger, call 19 (Police) or 15 (Civil protection) first.",
      ],
      ar: [
        ["في صفحة كل موعد، تجد المسجلين (الاسم الشخصي، الحرف الأول، الهاتف للتواصل يوم النشاط)، مع أنظمتهم الغذائية أو حساسياتهم إن وافقوا على مشاركتها. لا يمكن تصدير اللائحة؛ ويبقى الهاتف ظاهراً إلى غاية 7 أيام بعد الموعد ولا يُستعمل إلا للنشاط.", "عند الدخول، سجّل حضور كل شخص بالرمز أو رمز QR الخاص بتذكرته.", "مشكل مع مشارك؟ أبلغ عنه من صفحة الموعد: يتكفّل به الفريق."],
        "في حالة خطر فوري، اتصل أولاً بالرقم 19 (الشرطة) أو 15 (الوقاية المدنية).",
      ],
    },
    related: ["publier-une-activite", "annuler-une-date-organisateur"],
  },
  {
    slug: "annuler-une-date-organisateur", category: "org-run",
    title: { fr: "Annuler ou modifier une date", en: "Cancelling or changing a date", ar: "إلغاء موعد أو تعديله" },
    summary: { fr: "Vous demandez l'annulation, l'équipe décide et rembourse les participants.", en: "You request the cancellation; our team decides and refunds participants.", ar: "تطلب الإلغاء، ويقرر الفريق ويرد للمشاركين." },
    body: {
      fr: [
        "Vous ne pouvez plus assurer une date ? Sur la page de la date, dans l'[espace organisateur](/pro), « Demander l'annulation » avec le motif, le plus tôt possible.",
        ["L'équipe vous répond rapidement ; la date est maintenue d'ici là.", "Si la date est annulée, chaque participant est prévenu aussitôt et ses frais Wenzy lui sont remboursés intégralement.", "Un changement d'heure ou de lieu : modifiez l'activité ; le changement est validé par l'équipe, puis les inscrits sont prévenus.", "Les règles en cas d'annulation tardive sont prévues au [contrat organisateur](/contrat-organisateur)."],
      ],
      en: [
        "Can't run a date any more? On the date's page in the [organiser area](/pro), use “Request cancellation” with the reason, as early as possible.",
        ["Our team replies quickly; the date stays on until then.", "If the date is cancelled, every participant is notified right away and their Wenzy fee is refunded in full.", "Change of time or venue: edit the activity; our team approves the change, then attendees are notified.", "The rules for late cancellations are set out in the [organiser agreement](/contrat-organisateur)."],
      ],
      ar: [
        "لم يعد بإمكانك تأمين موعد؟ من صفحة الموعد في [فضاء المنظِّم](/pro)، « اطلب الإلغاء » مع ذكر السبب، في أقرب وقت.",
        ["يردّ الفريق بسرعة، ويبقى الموعد قائماً إلى ذلك الحين.", "إذا أُلغي الموعد، يُبلَّغ كل مشارك فوراً وتُعاد إليه رسوم Wenzy كاملة.", "تغيير في الوقت أو المكان: عدّل النشاط؛ يصادق الفريق على التعديل ثم يُبلَّغ المسجلون.", "قواعد الإلغاء المتأخر منصوص عليها في [عقد المنظِّم](/contrat-organisateur)."],
      ],
    },
    related: ["participants-et-pointage", "publier-une-activite"],
  },
];

/** Ordre de lecture dans chaque rubrique (du premier pas au jour J) ; les articles absents de la liste viennent après. */
export const HELP_ORDER = [
  "comment-fonctionne-wenzy", "venir-seul", "creer-mon-compte",
  "reserver-une-place", "payer-un-diner", "payer-ma-reservation", "gammes-des-tables", "questionnaire-avant-l-experience", "regime-allergies-et-langues", "niveau-materiel-et-tenue", "liste-d-attente", "experiences-sur-demande", "annuler-une-reservation", "pas-assez-de-participants",
  "le-lieu-secret", "check-in-et-ma-table", "je-serai-en-retard", "chat-du-groupe", "revoir-quelqu-un", "laisser-un-avis",
  "comment-fonctionne-l-abonnement", "renouveler-mon-abonnement", "absences",
  "mot-de-passe-et-e-mail", "photo-de-profil", "notifications-et-langue", "mes-donnees-personnelles",
  "securite-pendant-une-experience", "signaler-un-comportement", "activites-physiques-et-meteo",
  "devenir-partenaire", "criteres-de-selection", "remuneration-partenaire",
  "preparer-l-accueil-d-un-groupe", "annulations-cote-partenaire", "incident-avec-un-participant", "assurance-et-activites-physiques",
  "espace-organisateur", "remuneration-organisateur", "publier-une-activite", "participants-et-pointage", "annuler-une-date-organisateur",
];

/** Articles existants qui changent seulement de rubrique. */
export const HELP_MOVED: Record<string, HelpCategoryKey> = { "laisser-un-avis": "day-of" };
