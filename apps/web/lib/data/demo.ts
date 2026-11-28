/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — fictives, marquées `isDemo: true`.
 * Elles seront remplacées par Firestore en phase 3. Les photos sont extraites
 * de la maquette de référence et devront être remplacées par de vraies photos des lieux.
 */
import { DEMO_DINNER_EXPERIENCES, DEMO_DINNER_SCHEDULE } from "./demo-dinners";
import { DEMO_MORE_EXPERIENCES, DEMO_MORE_REVIEWS, DEMO_MORE_SCHEDULE } from "./demo-more";
import { launchUniverse,
  DEFAULT_OFFERS,
  DEFAULT_CANCELLATION_POLICY,
  MOROCCO_TIMEZONE,
  mad,
  QUESTIONNAIRE_TEMPLATES,
  zonedDateTimeToUtc,
  zonedParts,
  type Category,
  type MembershipPlan,
  type City,
  type Experience,
  type Review,
  type Session,
} from "@thecommunity/shared";

export const DEMO_CITIES: City[] = [
  {
    id: "casablanca",
    name: { fr: "Casablanca", ar: "الدار البيضاء" },
    countryCode: "MA",
    timezone: MOROCCO_TIMEZONE,
    currency: "MAD",
    isActive: true,
    isComingSoon: false,
    order: 1,
    districts: ["Gauthier", "Maarif", "Anfa", "CIL", "Racine", "Aïn Diab", "Habous", "Centre-ville"],
    isDemo: true,
  },
  ...(
    [
      ["rabat", "Rabat", "الرباط"],
      ["marrakech", "Marrakech", "مراكش"],
      ["tanger", "Tanger", "طنجة"],
      ["agadir", "Agadir", "أكادير"],
    ] as const
  ).map(
    ([id, fr, ar], i): City => ({
      id,
      name: { fr, ar },
      countryCode: "MA",
      timezone: MOROCCO_TIMEZONE,
      currency: "MAD",
      isActive: false,
      isComingSoon: true,
      order: i + 2,
      districts: [],
      isDemo: true,
    }),
  ),
];

export const DEMO_CATEGORIES: Category[] = [
  // docs/25 (24/11) : 3 univers. Identifiants inchangés (adresses du site) : eat = Tables, move = Activités (Bouger et
  // Découvrir réunis : le rendez-vous du samedi), discover = Événements (éditions spéciales) ; create n'est plus proposé.
  {
    id: "eat",
    name: { fr: "Tables", ar: "موائد", en: "Tables" },
    shortName: { fr: "Tables", ar: "موائد", en: "Tables" },
    description: {
      fr: "Café, brunch, dîner : chaque semaine, une table composée pour vous.",
      ar: "قهوة، فطور متأخر، عشاء: كل أسبوع، مائدة نُكوّنها لك.",
      en: "Coffee, brunch, dinner: every week, a table put together for you.",
    },
    order: 1,
    isActive: true,
    defaultBookingMode: "social_dinner",
  },
  {
    id: "move",
    name: { fr: "Activités", ar: "أنشطة", en: "Activities" },
    shortName: { fr: "Activités", ar: "أنشطة", en: "Activities" },
    description: {
      fr: "Le rendez-vous du samedi : running, céramique, padel, yoga, escape game, à tour de rôle, en petit groupe.",
      ar: "موعد السبت: جري، خزف، بادل، يوغا، لعبة الهروب، بالتناوب، في مجموعات صغيرة.",
      en: "The Saturday meet-up: running, ceramics, padel, yoga, escape game, in turn, in small groups.",
    },
    order: 2,
    isActive: true,
    defaultBookingMode: "individual",
  },
  {
    id: "discover",
    name: { fr: "Événements", ar: "فعاليات", en: "Events" },
    shortName: { fr: "Événements", ar: "فعاليات", en: "Events" },
    description: {
      fr: "Les éditions spéciales, de temps en temps : dîner Girls only, afterwork Exclusive, soirées.",
      ar: "النسخ الخاصة، من حين لآخر: عشاء للنساء فقط، أمسية Exclusive بعد العمل، حفلات.",
      en: "Special editions, now and then: Girls only dinner, Exclusive afterwork, parties.",
    },
    order: 3,
    isActive: true,
    defaultBookingMode: "group",
  },
  {
    id: "create",
    name: { fr: "Découvrir", ar: "اكتشاف", en: "Discover" },
    shortName: { fr: "Découvrir", ar: "اكتشاف", en: "Discover" },
    description: {
      fr: "Réuni dans Activités (24/11).",
      ar: "ضمن الأنشطة.",
      en: "Now part of Activities.",
    },
    order: 4,
    isActive: false,
    defaultBookingMode: "individual",
  },
  // Formats des Tables (sous-catégories) : ils fixent le budget de chaque gamme (docs/22 § 6).
  ...([
    ["cafe", "Café", "قهوة", "Coffee", "coffee"],
    ["brunch", "Brunch", "فطور متأخر", "Brunch", "utensils"],
    ["dejeuner", "Déjeuner", "غداء", "Lunch", "utensils"],
    ["diner", "Dîner", "عشاء", "Dinner", "utensils"],
  ] as const).map(([id, fr, ar, en, icon], i): Category => ({
    id,
    name: { fr, ar, en },
    shortName: { fr, ar, en },
    description: { fr: `${fr} à une table composée pour vous.`, ar: `${ar} على مائدة نُكوّنها لك.`, en: `${en} at a table put together for you.` },
    order: i + 1,
    // docs/25 : pas de déjeuner au lancement (le brunch du dimanche et le café du samedi couvrent la journée).
    isActive: id !== "dejeuner",
    defaultBookingMode: "social_dinner",
    icon,
    parentId: "eat",
  })),
  // Sous-catégorie (un seul niveau) : /casablanca/padel liste les activités padel de « Bouger ».
  {
    id: "padel",
    name: { fr: "Padel", ar: "بادل", en: "Padel" },
    shortName: { fr: "Padel", ar: "بادل", en: "Padel" },
    description: {
      fr: "Matchs en double, tous niveaux, équipes composées selon le niveau.",
      ar: "مباريات زوجية لجميع المستويات، والفرق حسب المستوى.",
      en: "Doubles matches for every level, teams balanced by level.",
    },
    order: 1,
    isActive: true,
    defaultBookingMode: "group",
    icon: "dumbbell",
    parentId: "move",
  },
  // docs/25 : formats des Activités (rotation du samedi) et des Événements.
  ...([
    ["running", "Running", "جري", "Running", "dumbbell", "move", 2],
    ["ceramique", "Céramique", "خزف", "Ceramics", "palette", "move", 3],
    ["yoga", "Yoga", "يوغا", "Yoga", "dumbbell", "move", 4],
    ["escape-game", "Escape game", "لعبة الهروب", "Escape game", "ticket", "move", 5],
    ["afterwork", "Afterwork", "بعد العمل", "Afterwork", "music", "discover", 1],
  ] as const).map(([id, fr, ar, en, icon, parentId, order]): Category => ({
    id,
    name: { fr, ar, en },
    shortName: { fr, ar, en },
    description: { fr: `${fr}, en petit groupe.`, ar: `${ar}، في مجموعة صغيرة.`, en: `${en}, in a small group.` },
    order,
    isActive: true,
    defaultBookingMode: "individual",
    icon,
    parentId,
  })),
];

const policy = DEFAULT_CANCELLATION_POLICY.id;

const DEMO_EXPERIENCE_LIST: Experience[] = [
  {
    id: "exp-diner-inconnus",
    venueTier: "premium",
    cuisine: "Internationale",
    ambiance: "Chic et décontractée",
    slug: "diner-entre-inconnus-casablanca",
    targetAgeMin: 25,
    targetAgeMax: 40,
    title: { fr: "Dîner entre inconnus", ar: "عشاء مع غرباء" },
    summary: {
      fr: "Rencontrez de nouvelles personnes autour d'un délicieux dîner.",
      ar: "تعرّف على أشخاص جدد حول عشاء لذيذ.",
    },
    description: {
      fr: "Chaque mercredi, nous réunissons des personnes qui ne se connaissent pas autour d'une même table, dans un restaurant sélectionné de Gauthier. Vous réservez en solo, nous composons les tables pour que la conversation prenne naturellement. Le nom du restaurant et votre table vous sont révélés la veille à 21h30.",
    },
    categoryId: "eat",
    subcategoryId: "diner",
    cityId: "casablanca",
    district: "Gauthier",
    tags: ["diners-entre-inconnus", "afterwork"],
    venue: { name: "Restaurant partenaire (dévoilé la veille à 21h30)", address: "Quartier Gauthier, Casablanca", revealPolicy: "on_group_reveal" },
    images: [
      { path: "/demo/diner-inconnus.webp", alt: { fr: "Tablée conviviale dans un restaurant aux lanternes" } },
      { path: "/demo/restaurant-lanternes.webp", alt: { fr: "Salle de restaurant chaleureuse" } },
      { path: "/demo/hero-diner-rooftop.webp", alt: { fr: "Dîner sur un rooftop au coucher du soleil" } },
    ],
    durationMinutes: 150,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "social_dinner",
    groupConfig: { minSize: 5, targetSize: 6, maxSize: 7 },
    maxSeatsPerBooking: 1,
    admission: "on_request",
    requestMessageRequired: false,
    languages: ["fr", "darija"],
    alcoholServed: false,
    included: [{ fr: "Une table composée par notre équipe" }, { fr: "Une adresse choisie et réservée pour vous" }, { fr: "Le repas se règle sur place, à vos frais" }],
    practicalInfo: { fr: "Arrivez 10 minutes avant. Tenue décontractée. Expérience réservée aux 18 ans et plus." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.8,
    ratingCount: 126,
    isDemo: true,
  },
  {
    id: "exp-pilates-brunch",
    foodServed: true,
    slug: "pilates-brunch-anfa",
    title: { fr: "Pilates & brunch", ar: "بيلاتس وفطور متأخر" },
    summary: { fr: "Une heure de Pilates puis un brunch partagé avec le groupe.", ar: "ساعة بيلاتس ثم فطور متأخر مع المجموعة." },
    description: {
      fr: "Un cours de Pilates tous niveaux dans un studio lumineux d'Anfa, suivi d'un brunch sain pris ensemble. Idéal pour commencer le week-end en douceur et rencontrer d'autres personnes qui aiment bouger.",
    },
    categoryId: "move",
    cityId: "casablanca",
    district: "Anfa",
    tags: ["pilates", "brunch", "week-end"],
    partnerSnapshot: { name: "Studio partenaire" },
    venue: { name: "Studio partenaire", address: "Anfa, Casablanca", revealPolicy: "immediate" },
    images: [
      { path: "/demo/pilates-brunch.webp", alt: { fr: "Cours de Pilates en groupe dans un studio lumineux" } },
      { path: "/demo/yoga-loft.webp", alt: { fr: "Studio avec plantes" } },
    ],
    durationMinutes: 120,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "individual",
    maxSeatsPerBooking: 1,
    languages: ["fr", "en"],
    included: [{ fr: "Cours de Pilates (60 min)" }, { fr: "Brunch healthy" }, { fr: "Tapis fourni" }],
    practicalInfo: { fr: "Prévoyez une tenue de sport et une bouteille d'eau." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.9,
    ratingCount: 64,
    isDemo: true,
  },
  {
    id: "exp-escape-game",
    slug: "escape-game-en-equipe-maarif",
    title: { fr: "Escape game en équipe", ar: "لعبة الهروب ضمن فريق" },
    summary: { fr: "Résolvez des énigmes avec une équipe d'inconnus. 60 minutes pour sortir.", ar: "حلّ الألغاز مع فريق من الغرباء. 60 دقيقة للخروج." },
    description: {
      fr: "Réservez seul ou à deux : nous formons des équipes de 5 à 6 personnes. Rien de tel qu'une énigme pour briser la glace. Un verre est offert après la partie pour débriefer.",
    },
    categoryId: "discover",
    cityId: "casablanca",
    district: "Maarif",
    tags: ["escape-games", "afterwork"],
    partnerSnapshot: { name: "Escape room partenaire" },
    venue: { name: "Escape room partenaire", address: "Maarif, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/escape-game.webp", alt: { fr: "Équipe concentrée sur une énigme" } }],
    durationMinutes: 90,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "group",
    groupConfig: { minSize: 5, targetSize: 6, maxSize: 6 },
    maxSeatsPerBooking: 2,
    languages: ["fr", "darija", "en"],
    included: [{ fr: "Partie de 60 minutes" }, { fr: "Boisson après la partie" }],
    practicalInfo: { fr: "Rendez-vous 15 minutes avant le début du jeu." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.7,
    ratingCount: 41,
    isDemo: true,
  },
  {
    id: "exp-ceramique",
    slug: "atelier-ceramique-cil",
    title: { fr: "Atelier céramique", ar: "ورشة الخزف" },
    summary: { fr: "Initiez-vous au tournage et repartez avec votre pièce.", ar: "تعلّم أساسيات الخزف وخذ قطعتك معك." },
    description: {
      fr: "Une céramiste vous guide pas à pas pour façonner votre bol ou votre tasse. Atelier en petit comité, ambiance calme et créative. Les pièces sont cuites puis récupérables une semaine plus tard.",
    },
    categoryId: "create",
    cityId: "casablanca",
    district: "CIL",
    tags: ["poterie", "week-end"],
    partnerSnapshot: { name: "Atelier partenaire" },
    venue: { name: "Atelier partenaire", address: "CIL, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/atelier-ceramique.webp", alt: { fr: "Participante façonnant une pièce en argile" } }],
    durationMinutes: 150,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "individual",
    maxSeatsPerBooking: 1,
    languages: ["fr"],
    included: [{ fr: "Argile et outils" }, { fr: "Cuisson et émaillage" }, { fr: "Thé à la menthe" }],
    practicalInfo: { fr: "Prévoyez des vêtements qui ne craignent pas l'argile." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.9,
    ratingCount: 37,
    isDemo: true,
  },
  {
    id: "exp-rooftop",
    venueTier: "casual",
    budgetRange: { min: 15000, max: 25000, currency: "MAD" },
    ambiance: "Rooftop au coucher du soleil",
    slug: "rooftop-coucher-de-soleil-casablanca",
    title: { fr: "Rooftop au coucher du soleil", ar: "سطح عند غروب الشمس" },
    summary: { fr: "Un apéritif sans alcool face à la ville, seul ou entre amis.", ar: "مشروبات بدون كحول مطلة على المدينة، وحدك أو مع أصدقائك." },
    description: {
      fr: "Une soirée détendue sur un rooftop du centre-ville avec vue sur la ville et la mosquée Hassan II au loin. Venez seul ou accompagné : tout le monde est là pour rencontrer du monde.",
    },
    categoryId: "discover",
    cityId: "casablanca",
    district: "Centre-ville",
    tags: ["rooftops", "afterwork"],
    venue: { name: "Rooftop partenaire", address: "Centre-ville, Casablanca", revealPolicy: "immediate" },
    images: [
      { path: "/demo/rooftop-medina.webp", alt: { fr: "Tablée sur un rooftop avec vue sur la ville" } },
      { path: "/demo/hero-diner-rooftop.webp", alt: { fr: "Groupe souriant au coucher du soleil" } },
    ],
    durationMinutes: 150,
    price: mad(35), // docs/22 : prix Wenzy unique
    // Étape 11 : entrée et mocktail de bienvenue payés en ligne, le reste à la carte sur place.
    pricing: {
      model: "variable_consumption",
      currency: "MAD",
      partner: { name: "Rooftop partenaire", paymentMode: "on_site", pricingType: "consumption", price: null, description: "" },
    },
    bookingMode: "open",
    maxSeatsPerBooking: 4,
    languages: ["fr", "darija", "en"],
    alcoholServed: false,
    included: [{ fr: "Un mocktail de bienvenue" }, { fr: "Une table réservée à notre groupe" }],
    practicalInfo: { fr: "Accès par ascenseur. Pièce d'identité demandée à l'entrée." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.6,
    ratingCount: 58,
    isDemo: true,
  },
  {
    id: "exp-brunch-inconnus",
    venueTier: "casual",
    cuisine: "Brunch",
    ambiance: "Café chaleureux",
    slug: "brunch-entre-inconnus-racine",
    title: { fr: "Brunch entre inconnus", ar: "فطور متأخر مع غرباء" },
    summary: { fr: "Le dimanche, une grande table et de nouvelles têtes.", ar: "يوم الأحد، طاولة كبيرة ووجوه جديدة." },
    description: {
      fr: "La version dominicale de notre dîner : tables de six, brunch généreux dans un café de Racine, et beaucoup de conversations.",
    },
    categoryId: "eat",
    subcategoryId: "brunch",
    cityId: "casablanca",
    district: "Racine",
    tags: ["diners-entre-inconnus", "brunch", "week-end"],
    venue: { name: "Café partenaire (dévoilé la veille à 21h30)", address: "Racine, Casablanca", revealPolicy: "on_group_reveal" },
    images: [{ path: "/demo/restaurant-lanternes.webp", alt: { fr: "Café chaleureux aux lanternes tressées" } }],
    durationMinutes: 120,
    price: mad(35), // docs/22 : prix Wenzy unique
    // Étape 11 : part organisation en ligne, brunch réglé au café sur place (139 DH au total).
    pricing: {
      model: "fixed_partner",
      currency: "MAD",
      partner: { name: "Restaurant partenaire Gauthier", paymentMode: "on_site", pricingType: "fixed", price: mad(80), description: "" },
    },
    bookingMode: "social_dinner",
    groupConfig: { minSize: 5, targetSize: 6, maxSize: 7 },
    maxSeatsPerBooking: 1,
    languages: ["fr", "darija"],
    alcoholServed: false,
    included: [{ fr: "Place réservée à une table de six" }, { fr: "Cartes de bienvenue pour lancer la conversation" }, { fr: "Brunch complet" }, { fr: "Boisson chaude et jus pressé" }],
    practicalInfo: { fr: "Expérience réservée aux 18 ans et plus." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.7,
    ratingCount: 52,
    isDemo: true,
  },
  {
    id: "exp-yoga-sunrise",
    questionnaire: QUESTIONNAIRE_TEMPLATES.find((t) => t.id === "level")!.questions,
    slug: "yoga-au-lever-du-soleil-ain-diab",
    title: { fr: "Yoga au lever du soleil", ar: "يوغا عند شروق الشمس" },
    summary: { fr: "Séance de yoga face à l'océan, suivie d'un café.", ar: "حصة يوغا أمام المحيط ثم قهوة." },
    description: { fr: "Une séance douce de 75 minutes à Aïn Diab pour bien commencer le dimanche, accessible à tous les niveaux." },
    categoryId: "move",
    cityId: "casablanca",
    district: "Aïn Diab",
    tags: ["yoga", "week-end", "en-plein-air"],
    venue: { name: "Plage d'Aïn Diab (point de rendez-vous précisé)", address: "Aïn Diab, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/yoga-loft.webp", alt: { fr: "Groupe pratiquant le yoga" } }],
    durationMinutes: 90,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "individual",
    maxSeatsPerBooking: 1,
    languages: ["fr", "en"],
    included: [{ fr: "Séance de 75 minutes" }, { fr: "Café ou thé" }],
    practicalInfo: { fr: "Tapis fournis. Séance déplacée en studio en cas de mauvais temps." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.8,
    ratingCount: 29,
    isDemo: true,
  },
  {
    id: "exp-quiz",
    slug: "quiz-blind-test-gauthier",
    title: { fr: "Quiz & blind test", ar: "مسابقة واختبار موسيقي" },
    summary: { fr: "Des équipes formées sur place, de la musique et des questions.", ar: "فرق تتشكل في المكان، موسيقى وأسئلة." },
    description: { fr: "Culture générale, cinéma, musique marocaine et internationale : nous formons des équipes de 4 à 6 personnes. Fous rires garantis." },
    categoryId: "discover",
    cityId: "casablanca",
    district: "Gauthier",
    tags: ["quiz", "afterwork"],
    venue: { name: "Café partenaire", address: "Gauthier, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/escape-game.webp", alt: { fr: "Joueurs autour d'une table" } }],
    durationMinutes: 120,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "group",
    groupConfig: { minSize: 4, targetSize: 5, maxSize: 6 },
    maxSeatsPerBooking: 2,
    languages: ["fr", "darija"],
    included: [{ fr: "Une boisson" }, { fr: "Lots pour l'équipe gagnante" }],
    practicalInfo: { fr: "Arrivée conseillée 15 minutes avant." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.6,
    ratingCount: 33,
    isDemo: true,
  },
  {
    id: "exp-cuisine",
    foodServed: true,
    slug: "atelier-cuisine-marocaine-habous",
    title: { fr: "Atelier cuisine marocaine", ar: "ورشة الطبخ المغربي" },
    summary: { fr: "Préparez un tajine et des pastillas, puis dégustez-les ensemble.", ar: "حضّر الطاجين والبسطيلة ثم تذوّقها مع المجموعة." },
    description: { fr: "Dans une maison du quartier des Habous, une cheffe partage ses recettes de famille. On cuisine en binômes, puis on passe à table." },
    categoryId: "create",
    cityId: "casablanca",
    district: "Habous",
    tags: ["cuisine", "week-end"],
    venue: { name: "Maison d'hôtes partenaire", address: "Quartier Habous, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/restaurant-lanternes.webp", alt: { fr: "Table dressée pour un repas partagé" } }],
    durationMinutes: 180,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "individual",
    maxSeatsPerBooking: 1,
    languages: ["fr", "darija"],
    included: [{ fr: "Ingrédients et tablier" }, { fr: "Repas complet" }, { fr: "Recettes à emporter" }],
    practicalInfo: { fr: "Signalez vos allergies dans votre profil." },
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.9,
    ratingCount: 21,
    isDemo: true,
  },
  {
    id: "exp-padel",
    onSiteHost: true,
    slug: "padel-entre-inconnus-anfa",
    title: { fr: "Padel entre inconnus", ar: "بادل مع غرباء", en: "Padel with strangers" },
    summary: { fr: "Des doubles composés par niveau, puis un verre au club.", ar: "مباريات زوجية حسب المستوى، ثم مشروب في النادي.", en: "Doubles matched by level, then a drink at the club." },
    description: {
      fr: "Réservez seul : nous formons des terrains de quatre joueurs de même niveau. Une heure trente de matchs en tournant les équipes, puis un verre ensemble au club.",
      ar: "احجز وحدك: بعد الحجز، يخبرنا استبيان قصير بمستواك، ونكوّن ملاعب من أربعة لاعبين من المستوى نفسه. ساعة ونصف من المباريات مع تبديل الفرق، ثم مشروب معاً في النادي.",
      en: "Book alone: after booking, a short questionnaire tells us your level, and we put four players of the same level on each court. Ninety minutes of matches with rotating teams, then a drink together at the club.",
    },
    categoryId: "move",
    subcategoryId: "padel",
    // Étape 20 : activité proposée par un organisateur indépendant (démonstration).
    organizerId: "org-club-padel-anfa",
    organizerSnapshot: { name: "Club Padel Anfa", slug: "club-padel-anfa" },
    cityId: "casablanca",
    district: "Anfa",
    tags: ["padel", "sport", "week-end"],
    partnerSnapshot: { name: "Club de padel partenaire" },
    venue: { name: "Club de padel partenaire", address: "Anfa, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/padel.webp", alt: { fr: "Illustration : terrain de padel, deux raquettes et une balle" } }],
    durationMinutes: 90,
    price: mad(150),
    bookingMode: "group",
    groupConfig: { minSize: 4, targetSize: 4, maxSize: 4 },
    maxSeatsPerBooking: 1,
    languages: ["fr", "darija", "en"],
    alcoholServed: false,
    included: [{ fr: "1 h 30 de padel en double", ar: "ساعة ونصف من البادل الزوجي", en: "90 minutes of doubles padel" }, { fr: "Raquettes et balles", ar: "المضارب والكرات", en: "Rackets and balls" }, { fr: "Un verre au club après les matchs", ar: "مشروب في النادي بعد المباريات", en: "A drink at the club after the matches" }],
    practicalInfo: { fr: "Arrivez 15 minutes avant pour l'échauffement." },
    level: "all",
    equipmentProvided: "Raquettes et balles",
    whatToBring: "Baskets propres (semelle claire), bouteille d'eau",
    dressCode: "Tenue de sport",
    physicalActivity: true,
    questionnaire: QUESTIONNAIRE_TEMPLATES.find((t) => t.id === "padel")!.questions,
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.8,
    ratingCount: 19,
    isDemo: true,
  },
  {
    id: "exp-paintball",
    onSiteHost: true,
    slug: "paintball-entre-inconnus-bouskoura",
    title: { fr: "Paintball entre inconnus", ar: "بينتبول مع غرباء", en: "Paintball with strangers" },
    summary: { fr: "Deux équipes mélangées par nous, en plein air, puis un goûter tous ensemble.", ar: "فريقان نمزجهما نحن، في الهواء الطلق، ثم وجبة خفيفة معاً.", en: "Two teams mixed by us, outdoors, then a snack all together." },
    description: {
      fr: "Une après-midi de paintball sur un terrain boisé près de Bouskoura. Nous mélangeons les équipes pour que débutants et habitués jouent ensemble, avec un encadrant du terrain. Tout le matériel est fourni ; on termine par un goûter pour refaire les parties.",
      ar: "ظهيرة من البينتبول في ملعب مشجّر قرب بوسكورة. نمزج الفرق ليلعب المبتدئون وأصحاب الخبرة معاً، مع مؤطّر من الملعب. كل المعدّات متوفّرة؛ ونختم بوجبة خفيفة لاستعادة أطوار اللعب.",
      en: "An afternoon of paintball on a wooded field near Bouskoura. We mix the teams so beginners and regulars play together, with a coach from the venue. All equipment is provided; we finish with a snack to replay the games.",
    },
    categoryId: "discover",
    cityId: "casablanca",
    district: "Bouskoura",
    tags: ["paintball", "plein-air", "équipe"],
    partnerSnapshot: { name: "Terrain de paintball partenaire" },
    venue: { name: "Terrain de paintball partenaire", address: "Route de Bouskoura, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/paintball.webp", alt: { fr: "Illustration : barricades et éclaboussures de peinture" } }],
    durationMinutes: 180,
    price: mad(35), // docs/22 : prix Wenzy unique
    bookingMode: "group",
    groupConfig: { minSize: 6, targetSize: 8, maxSize: 10 },
    maxSeatsPerBooking: 2,
    languages: ["fr", "darija"],
    alcoholServed: false,
    included: [{ fr: "Lanceur, masque, combinaison et 200 billes", ar: "القاذف والقناع والبدلة و200 كرة", en: "Marker, mask, overalls and 200 paintballs" }, { fr: "Encadrant du terrain", ar: "مؤطّر من الملعب", en: "Coach from the venue" }, { fr: "Goûter après le jeu", ar: "وجبة خفيفة بعد اللعب", en: "Snack after the game" }],
    practicalInfo: { fr: "Rendez-vous sur le terrain ; covoiturage proposé dans le groupe la veille." },
    level: "all",
    minAge: 21,
    equipmentProvided: "Lanceur, masque, combinaison et 200 billes",
    whatToBring: "Baskets fermées, eau, vêtements qui ne craignent rien",
    dressCode: "Vêtements couvrants (manches longues)",
    outdoor: true,
    physicalActivity: true,
    questionnaire: QUESTIONNAIRE_TEMPLATES.find((t) => t.id === "paintball")!.questions,
    cancellationPolicyId: policy,
    status: "published",
    ratingAvg: 4.7,
    ratingCount: 12,
    isDemo: true,
  },
  // 21b : expériences inventées pour toutes les catégories (démonstration).
  ...DEMO_MORE_EXPERIENCES,
  // 21 novembre : un dîner pour chaque façon de payer et chaque gamme de restaurant.
  ...DEMO_DINNER_EXPERIENCES,
];

/**
 * Étape O : badges choisis par l'équipe sur les cartes de démonstration, pour varier (les autres restent
 * en automatique : coup de cœur de l'accueil, Populaire selon les avis, Bientôt complet).
 */
export const DEMO_HIGHLIGHTS: Record<string, NonNullable<Experience["highlight"]>> = {
  "exp-secret-dinner": "special",
  "exp-diner-gastronomique": "featured",
  "exp-brunch-inconnus": "new",
  "exp-cafe-specialite": "new",
  "exp-padel": "popular",
  "exp-escape-game": "almostFull",
  "exp-echange-langues": "new",
  "exp-gnaoua": "special",
  "exp-quiz": "popular",
};
// docs/25 : 3 univers (Découvrir réuni dans Activités, l'escape game passe dans Activités).
export const DEMO_EXPERIENCES: Experience[] = DEMO_EXPERIENCE_LIST.map((e) => ({ ...e, ...launchUniverse(e) } as Experience)).map((e) => (DEMO_HIGHLIGHTS[e.id] ? { ...e, highlight: DEMO_HIGHLIGHTS[e.id] } : e));

/** Planning type : jour de semaine (0 = dimanche), heure locale, capacité, places prises par occurrence. */
const SCHEDULE: Record<string, { weekday: number; hour: number; minute: number; capacity: number; taken: number[]; featured?: boolean }> = {
  "exp-diner-inconnus": { weekday: 4, hour: 19, minute: 30, capacity: 30, taken: [24, 11, 3], featured: true },
  "exp-pilates-brunch": { weekday: 6, hour: 10, minute: 0, capacity: 12, taken: [9, 4, 0], featured: true },
  "exp-escape-game": { weekday: 5, hour: 20, minute: 0, capacity: 24, taken: [24, 10, 2], featured: true },
  "exp-ceramique": { weekday: 0, hour: 15, minute: 0, capacity: 8, taken: [5, 2, 0], featured: true },
  "exp-rooftop": { weekday: 5, hour: 18, minute: 30, capacity: 40, taken: [22, 8, 0] },
  "exp-brunch-inconnus": { weekday: 0, hour: 11, minute: 30, capacity: 24, taken: [21, 6, 0] },
  "exp-yoga-sunrise": { weekday: 0, hour: 8, minute: 0, capacity: 15, taken: [7, 3, 0] },
  "exp-quiz": { weekday: 3, hour: 20, minute: 30, capacity: 30, taken: [18, 4, 0] },
  "exp-cuisine": { weekday: 6, hour: 16, minute: 0, capacity: 10, taken: [10, 5, 1] },
  "exp-padel": { weekday: 6, hour: 10, minute: 30, capacity: 16, taken: [12, 5, 0], featured: true },
  "exp-paintball": { weekday: 0, hour: 14, minute: 30, capacity: 20, taken: [14, 6, 0], featured: true },
  ...DEMO_MORE_SCHEDULE,
  ...DEMO_DINNER_SCHEDULE,
};

/** Génère trois occurrences à venir pour chaque expérience, à partir de `now`. */
export function buildDemoSessions(now: Date = new Date()): Session[] {
  const tz = MOROCCO_TIMEZONE;
  const today = zonedParts(now, tz);
  const sessions: Session[] = [];
  for (const exp of DEMO_EXPERIENCES) {
    const plan = SCHEDULE[exp.id];
    if (!plan) continue;
    let daysAhead = (plan.weekday - today.weekday + 7) % 7;
    // Si le créneau du jour est déjà passé, on prend la semaine suivante.
    const todayStart = zonedDateTimeToUtc({ ...today, hour: plan.hour, minute: plan.minute }, tz);
    if (daysAhead === 0 && todayStart.getTime() <= now.getTime()) daysAhead = 7;
    plan.taken.forEach((taken, index) => {
      const base = new Date(Date.UTC(today.year, today.month - 1, today.day + daysAhead + index * 7));
      const startAt = zonedDateTimeToUtc(
        { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate(), hour: plan.hour, minute: plan.minute },
        tz,
      );
      const endAt = new Date(startAt.getTime() + exp.durationMinutes * 60_000);
      const full = taken >= plan.capacity;
      sessions.push({
        id: `${exp.id.replace("exp-", "ses-")}-${index + 1}`,
        experienceId: exp.id,
        cityId: exp.cityId,
        categoryId: exp.categoryId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: exp.price,
        capacity: plan.capacity,
        seatsConfirmed: Math.min(taken, plan.capacity),
        seatsHeld: 0,
        waitlistCount: full ? 7 : 0,
        status: full ? "full" : "published",
        isFeatured: Boolean(plan.featured) && index === 0,
        isDemo: true,
      });
    });
  }
  return sessions.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Formule d'abonnement de démonstration (mode sans Firebase). */
export const DEMO_MEMBERSHIP_PLAN: MembershipPlan = {
  id: "annual",
  name: { fr: "Carnet et Pass", ar: "الدفتر والباس", en: "Pack and Pass" },
  // docs/22, décision 6 : Carnet 3 sorties et Pass de 1 semaine à 1 an.
  offers: DEFAULT_OFFERS,
  benefits: [],
  isActive: true,
};

const DEMO_REVIEWS_BASE: Review[] = [
  { id: "r1", experienceId: "exp-diner-inconnus", rating: 5, publicName: "Salma B.", comment: "Je suis venue seule un peu stressée, je suis repartie avec quatre nouveaux contacts et un plan pour le week-end.", createdAt: "2026-10-18T22:00:00Z", isDemo: true },
  { id: "r2", experienceId: "exp-diner-inconnus", rating: 5, publicName: "Youssef A.", comment: "Table très bien composée, restaurant top. L'organisation est fluide du début à la fin.", createdAt: "2026-10-11T22:00:00Z", isDemo: true },
  { id: "r3", experienceId: "exp-pilates-brunch", rating: 5, publicName: "Inès K.", comment: "Le combo parfait pour un samedi matin. Le brunch est délicieux.", createdAt: "2026-10-26T12:00:00Z", isDemo: true },
  { id: "r4", experienceId: "exp-escape-game", rating: 4, publicName: "Mehdi R.", comment: "On ne se connaissait pas et on est sortis avec 4 minutes d'avance !", createdAt: "2026-10-24T22:00:00Z", isDemo: true },
  { id: "r5", experienceId: "exp-ceramique", rating: 5, publicName: "Nadia T.", comment: "Moment hors du temps, et la céramiste est adorable.", createdAt: "2026-10-20T18:00:00Z", isDemo: true },
  // Étape 24 : avis sur l'activité de l'organisateur de démonstration, dont un avec sa réponse.
  { id: "rp1", experienceId: "exp-padel", rating: 5, publicName: "Omar K.", comment: "Niveau bien équilibré, on a enchaîné trois matchs. Le coach donne de bons conseils.", createdAt: "2026-11-15T20:00:00Z", isDemo: true, reply: { text: "Merci Omar ! Ravi que les matchs aient été équilibrés, à très vite sur les terrains.", authorName: "Club Padel Anfa", authorRole: "organizer", at: "2026-11-16T09:00:00Z" } },
  { id: "rp2", experienceId: "exp-padel", rating: 4, publicName: "Leïla S.", comment: "Super ambiance. Les raquettes prêtées étaient un peu usées.", createdAt: "2026-11-08T20:00:00Z", isDemo: true },
  ...DEMO_MORE_REVIEWS,
];

/** Démonstration : notes détaillées, « Reviendriez-vous ? » et quelques photos acceptées (page Avis). */
const DEMO_PHOTOS: Record<string, string> = { r1: "/demo/diner-inconnus.webp", r3: "/demo/pilates-brunch.webp", r5: "/demo/atelier-ceramique.webp", rp1: "/demo/padel.webp" };
export const DEMO_REVIEWS: Review[] = DEMO_REVIEWS_BASE.map((r, i) => ({
  ...r,
  details: { group: Math.max(1, Math.min(5, r.rating - (i % 3 === 0 ? 1 : 0))), organisation: Math.max(1, Math.min(5, r.rating + (i % 4 === 1 ? -1 : 0))), venue: Math.max(1, Math.min(5, r.rating - (i % 5 === 2 ? 1 : 0))) },
  comeAgain: r.rating >= 4,
  ...(DEMO_PHOTOS[r.id] && !r.photo ? { photo: { path: DEMO_PHOTOS[r.id]!, status: "approved" as const } } : {}),
}));
