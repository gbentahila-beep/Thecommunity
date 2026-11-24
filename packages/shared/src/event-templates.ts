import { z } from "zod";
import { BOOKING_MODES, CATEGORY_ID_PATTERN } from "./constants";
import { ACTIVITY_LEVELS } from "./activity";
import { SPOKEN_LANGUAGES } from "./profile";
import { QUESTIONNAIRE_TEMPLATES, questionnaireSchema, type QuestionDef } from "./questionnaire";
import type { VenueTier } from "./two-part";
import type { BookingMode, SpokenLanguage } from "./types";
import { EXTRA_I18N_KEYS, EXTRA_I18N_SHAPE, type ExtraI18nStrings } from "./extra-i18n";
import { launchUniverse } from "./launch-universes";

/**
 * Modèles d'événements (docs/22 § 5 et 7, docs/23) : toute création part d'un modèle qui pré-remplit tout, du titre
 * au questionnaire, image comprise. Choix en 3 temps : univers → modèle (format) → gamme (Tables seulement).
 * Les 14 modèles du lancement, validés le 22 novembre, sont définis ici ; l'équipe peut les modifier, les masquer ou
 * en créer d'autres dans l'appli (collection `eventTemplates`, qui l'emporte sur ces valeurs par défaut).
 */

/** Ce qui change selon la gamme d'un modèle de Tables. */
export type TemplateTier = { ambiance: string; practicalInfo?: string; ambianceAr?: string; ambianceEn?: string; practicalInfoAr?: string; practicalInfoEn?: string };

/** Réglages pré-remplis (mêmes noms que le formulaire d'expérience). */
/** Les textes secondaires existent aussi en arabe et en anglais (includedAr, dressCodeEn…, voir extra-i18n.ts). */
export type TemplateValues = ExtraI18nStrings & {
  titleFr: string;
  summaryFr: string;
  descriptionFr: string;
  titleAr?: string;
  summaryAr?: string;
  descriptionAr?: string;
  titleEn?: string;
  summaryEn?: string;
  descriptionEn?: string;
  categoryId: string;
  subcategoryId?: string;
  revealPolicy: "immediate" | "on_group_reveal";
  bookingMode: BookingMode;
  groupMin?: number;
  groupMax?: number;
  capacity: number;
  maxSeatsPerBooking: 1 | 2;
  durationMinutes: number;
  /** Jour conseillé (0 = dimanche … 6 = samedi) et heure de début (heure de Casablanca). */
  weekday: number;
  time: string;
  pricingModel: "online_only" | "fixed_partner" | "variable_consumption";
  partnerPriceDh?: number;
  budgetMinDh?: number;
  budgetMaxDh?: number;
  cuisine?: string;
  ambiance?: string;
  included: string;
  practicalInfo?: string;
  level?: (typeof ACTIVITY_LEVELS)[number];
  equipmentProvided?: string;
  whatToBring?: string;
  dressCode?: string;
  outdoor: boolean;
  physicalActivity: boolean;
  alcoholServed: boolean;
  languages: SpokenLanguage[];
  cancellationPolicyId: string;
  audience: "all" | "women";
  membersOnly: boolean;
  /** Abonnés d'abord pendant X jours après la mise en ligne d'une date (0 = ouvert à tous tout de suite). */
  earlyAccessDays: number;
  questionnaire: QuestionDef[];
};

export type EventTemplate = {
  id: string;
  /** Nom affiché dans la grille du back-office. */
  name: string;
  /** Photo du modèle (fichier du site, ex. /images/modeles/cafe.webp). */
  image: string;
  order: number;
  isActive: boolean;
  /** Modèle livré avec le site (sinon créé dans l'appli). */
  builtIn?: boolean;
  /** Tables : gammes proposées et ce qu'elles changent (ambiance, infos pratiques). */
  tiers?: Partial<Record<VenueTier, TemplateTier>>;
  values: TemplateValues;
};

const q = (id: string) => QUESTIONNAIRE_TEMPLATES.find((t) => t.id === id)?.questions ?? [];

/** Réglages communs (docs/23 § 3). */
const COMMON = {
  maxSeatsPerBooking: 1 as const,
  alcoholServed: false,
  languages: ["fr", "darija"] as SpokenLanguage[],
  cancellationPolicyId: "standard-48h",
  audience: "all" as const,
  membersOnly: false,
  earlyAccessDays: 0,
  outdoor: false,
  physicalActivity: false,
};

/** Tables : lieu secret, tables de 4 à 6, consommation sur place selon la gamme, pas de questionnaire (le profil suffit). */
const TABLE = {
  ...COMMON,
  categoryId: "eat",
  revealPolicy: "on_group_reveal" as const,
  bookingMode: "social_dinner" as const,
  groupMin: 4,
  groupMax: 6,
  capacity: 24,
  durationMinutes: 150,
  pricingModel: "variable_consumption" as const,
  questionnaire: [] as QuestionDef[],
};

const BASE_TEMPLATES: EventTemplate[] = [
  // ——— Tables ———
  {
    id: "cafe", name: "Café", image: "/images/modeles/cafe.webp", order: 1, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Cosy et détendue", ambianceAr: "دافئة ومريحة", ambianceEn: "Cosy and relaxed" }, premium: { ambiance: "Café de spécialité", ambianceAr: "قهوة مختصة", ambianceEn: "Specialty coffee" }, exclusive: { ambiance: "Salon de thé raffiné", ambianceAr: "صالون شاي راقٍ", ambianceEn: "Refined tea room" } },
    values: {
      ...TABLE, subcategoryId: "cafe", weekday: 6, time: "16:00",
      titleFr: "Café",
      summaryFr: "Un café, une table, et des discussions avec des gens que vous ne connaissez pas encore.",
      descriptionFr: "Un café choisi par notre équipe, avec des personnes qui ont de quoi se parler. On commande, on discute, on fait connaissance, et chacun reste aussi longtemps qu'il le souhaite.",
      titleAr: "قهوة", summaryAr: "فنجان قهوة وطاولة وأحاديث مع أشخاص لا تعرفهم بعد.",
      descriptionAr: "مقهى يختاره فريقنا، مع أشخاص لديهم ما يتحدثون عنه. نطلب ونتحدث ونتعارف، ويبقى كل واحد بقدر ما يشاء.",
      titleEn: "Coffee", summaryEn: "A coffee, a table, and conversations with people you don't know yet.",
      descriptionEn: "A café chosen by our team, with people who have plenty to talk about. Order, chat, get to know each other, and stay as long as you like.",
      included: "La réservation du café",
      includedAr: "حجز المقهى", includedEn: "The café booking",
    },
  },
  {
    id: "brunch", name: "Brunch", image: "/images/modeles/brunch.webp", order: 2, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Lumineuse et décontractée", ambianceAr: "مشرقة ومريحة", ambianceEn: "Bright and relaxed" }, premium: { ambiance: "Adresse tendance", ambianceAr: "عنوان عصري", ambianceEn: "Trendy spot" }, exclusive: { ambiance: "Hôtel ou adresse d'exception", ambianceAr: "فندق أو عنوان استثنائي", ambianceEn: "Hotel or exceptional venue" } },
    values: {
      ...TABLE, subcategoryId: "brunch", weekday: 0, time: "12:30",
      titleFr: "Brunch",
      summaryFr: "Un brunch partagé avec des gens que vous ne connaissez pas encore.",
      descriptionFr: "Le week-end commence autour d'un brunch, dans un restaurant choisi par notre équipe, avec tout le temps de faire connaissance.",
      titleAr: "برانش", summaryAr: "برانش مشترك مع أشخاص لا تعرفهم بعد.",
      descriptionAr: "تبدأ عطلة نهاية الأسبوع حول برانش في مطعم يختاره فريقنا، مع متسع من الوقت للتعارف.",
      titleEn: "Brunch", summaryEn: "A shared brunch with people you don't know yet.",
      descriptionEn: "The weekend starts around a brunch, in a restaurant chosen by our team, with plenty of time to get to know each other.",
      included: "La réservation du restaurant",
      includedAr: "حجز المطعم", includedEn: "The restaurant booking",
    },
  },
  {
    id: "dejeuner", name: "Déjeuner", image: "/images/modeles/dejeuner.webp", order: 3, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Simple et conviviale", ambianceAr: "بسيطة وودية", ambianceEn: "Simple and friendly" }, premium: { ambiance: "Chic et décontractée", ambianceAr: "أنيقة ومريحة", ambianceEn: "Smart casual" }, exclusive: { ambiance: "Haut de gamme", ambianceAr: "راقية", ambianceEn: "Upscale" } },
    values: {
      ...TABLE, subcategoryId: "dejeuner", weekday: 4, time: "12:30",
      titleFr: "Déjeuner",
      summaryFr: "La pause de midi, à une table d'inconnus.",
      descriptionFr: "On change d'air en pleine semaine : un déjeuner dans un restaurant choisi par notre équipe, pour discuter et rencontrer de nouvelles têtes.",
      titleAr: "غداء", summaryAr: "استراحة الظهر على طاولة مع غرباء.",
      descriptionAr: "نغيّر الأجواء في منتصف الأسبوع: غداء في مطعم يختاره فريقنا، للحديث والتعرف على وجوه جديدة.",
      titleEn: "Lunch", summaryEn: "Your lunch break, at a table of strangers.",
      descriptionEn: "A change of scene mid-week: lunch in a restaurant chosen by our team, to chat and meet new faces.",
      included: "La réservation du restaurant",
      includedAr: "حجز المطعم", includedEn: "The restaurant booking",
    },
  },
  {
    id: "diner", name: "Dîner", image: "/images/modeles/diner.webp", order: 4, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Conviviale", ambianceAr: "ودية", ambianceEn: "Friendly" }, premium: { ambiance: "Chic et décontractée", ambianceAr: "أنيقة ومريحة", ambianceEn: "Smart casual" }, exclusive: { ambiance: "Haut de gamme", ambianceAr: "راقية", ambianceEn: "Upscale", practicalInfo: "Tenue soignée.", practicalInfoAr: "لباس أنيق.", practicalInfoEn: "Smart dress." } },
    values: {
      ...TABLE, subcategoryId: "diner", weekday: 3, time: "20:30",
      titleFr: "Dîner",
      summaryFr: "Une table, des inconnus, et une adresse à découvrir.",
      descriptionFr: "Notre format phare. Des personnes qui ont de quoi se parler, réunies d'après leurs profils, dans un restaurant choisi par notre équipe. Une soirée pour rencontrer de nouvelles têtes, à votre rythme.",
      titleAr: "عشاء", summaryAr: "طاولة وغرباء وعنوان لتكتشفه.",
      descriptionAr: "صيغتنا الرئيسية. أشخاص لديهم ما يتحدثون عنه، نجمعهم حسب ملفاتهم، في مطعم يختاره فريقنا. أمسية للتعرف على وجوه جديدة، على راحتك.",
      titleEn: "Dinner", summaryEn: "A table, strangers, and a new place to discover.",
      descriptionEn: "Our signature format. People who have plenty to talk about, matched on their profiles, in a restaurant chosen by our team. An evening to meet new faces, at your own pace.",
      included: "La réservation du restaurant",
      includedAr: "حجز المطعم", includedEn: "The restaurant booking",
    },
  },
  // ——— Bouger ———
  {
    id: "running", name: "Running", image: "/images/modeles/running.webp", order: 1, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", subcategoryId: "running", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 8, capacity: 20, durationMinutes: 75, weekday: 6, time: "09:00",
      titleFr: "Running",
      summaryFr: "Courir à plusieurs, à votre allure, puis un café face à l'océan.",
      descriptionFr: "Un parcours de 5 à 8 km sur la Corniche, en groupes de même allure. On court, on discute, et ceux qui veulent prolongent par un café.",
      titleAr: "جري", summaryAr: "الجري مع الآخرين بسرعتك، ثم قهوة أمام المحيط.",
      descriptionAr: "مسار من 5 إلى 8 كلم على الكورنيش، في مجموعات بنفس السرعة. نجري ونتحدث، ومن يرغب يكمل بفنجان قهوة.",
      titleEn: "Running", summaryEn: "Run together at your own pace, then coffee by the ocean.",
      descriptionEn: "A 5 to 8 km route along the Corniche, in groups of similar pace. Run, chat, and those who want can stay on for a coffee.",
      pricingModel: "online_only",
      included: "Un parcours préparé",
      includedAr: "مسار مُعدّ مسبقاً", includedEn: "A planned route",
      whatToBringAr: "حذاء جري، ماء", whatToBringEn: "Running shoes, water",
      dressCodeAr: "لباس رياضي", dressCodeEn: "Sportswear",
      whatToBring: "Chaussures de course, eau", dressCode: "Tenue de sport", level: "all", outdoor: true, physicalActivity: true,
      questionnaire: q("running"),
    },
  },
  {
    id: "padel", name: "Padel", image: "/images/modeles/padel.webp", order: 3, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", subcategoryId: "padel", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 4, capacity: 8, durationMinutes: 90, weekday: 6, time: "10:00",
      titleFr: "Padel",
      summaryFr: "Quatre par terrain, même niveau, et des parties qui s'enchaînent.",
      descriptionFr: "Des parties entre joueurs de niveau proche, dans un club partenaire. Débutant ou confirmé, chacun joue à sa mesure, puis ceux qui le souhaitent se retrouvent autour d'un verre.",
      titleAr: "بادل", summaryAr: "أربعة في كل ملعب، بنفس المستوى، ومباريات متتالية.",
      descriptionAr: "مباريات بين لاعبين بمستوى متقارب في نادٍ شريك. مبتدئاً كنت أو متمرساً، يلعب كل واحد حسب مستواه، ثم يلتقي من يرغب حول مشروب.",
      titleEn: "Padel", summaryEn: "Four per court, same level, and back-to-back games.",
      descriptionEn: "Games between players of similar level at a partner club. Beginner or experienced, everyone plays at their level, then those who want meet up for a drink.",
      pricingModel: "fixed_partner", partnerPriceDh: 120,
      included: "Le terrain réservé",
      includedAr: "الملعب المحجوز", includedEn: "The booked court",
      equipmentProvidedAr: "مضارب وكرات (يُؤكَّد مع النادي)", equipmentProvidedEn: "Rackets and balls (to be confirmed with the club)",
      dressCodeAr: "لباس رياضي، حذاء رياضي نظيف", dressCodeEn: "Sportswear, clean trainers",
      equipmentProvided: "Raquettes et balles (à confirmer avec le club)", dressCode: "Sport, baskets propres", level: "all", physicalActivity: true,
      questionnaire: q("padel"),
    },
  },
  {
    id: "yoga", name: "Yoga", image: "/images/modeles/yoga.webp", order: 4, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", subcategoryId: "yoga", revealPolicy: "immediate", bookingMode: "individual", capacity: 12, durationMinutes: 75, weekday: 6, time: "10:00",
      titleFr: "Yoga",
      summaryFr: "Une séance de yoga tous niveaux, en petit groupe.",
      descriptionFr: "Un cours accessible à tous, donné par un professeur dans un lieu partenaire : studio, jardin ou rooftop.",
      titleAr: "يوغا", summaryAr: "حصة يوغا لجميع المستويات في مجموعة صغيرة.",
      descriptionAr: "حصة في متناول الجميع، يقدمها أستاذ في مكان شريك: استوديو أو حديقة أو سطح.",
      titleEn: "Yoga", summaryEn: "An all-levels yoga class in a small group.",
      descriptionEn: "A class open to everyone, led by a teacher at a partner venue: studio, garden or rooftop.",
      pricingModel: "fixed_partner", partnerPriceDh: 120,
      included: "Le cours",
      includedAr: "الحصة", includedEn: "The class",
      equipmentProvidedAr: "حصيرة", equipmentProvidedEn: "Mat",
      whatToBringAr: "ماء", whatToBringEn: "Water",
      dressCodeAr: "لباس مريح", dressCodeEn: "Comfortable clothing",
      equipmentProvided: "Tapis", whatToBring: "Eau", dressCode: "Souple", level: "all", physicalActivity: true,
      questionnaire: q("level"),
    },
  },
  // ——— Sortir ———
  {
    id: "escape-game", name: "Escape game", image: "/images/modeles/escape-game.webp", order: 5, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", subcategoryId: "escape-game", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 12, durationMinutes: 60, weekday: 6, time: "17:00",
      titleFr: "Escape game",
      summaryFr: "Une heure pour sortir ensemble, avec des coéquipiers que vous ne connaissez pas encore.",
      descriptionFr: "Une heure d'énigmes à résoudre ensemble dans une salle partenaire, en mêlant habitués et débutants.",
      titleAr: "لعبة الهروب", summaryAr: "ساعة للخروج معاً، مع زملاء فريق لا تعرفهم بعد.",
      descriptionAr: "ساعة من الألغاز نحلها معاً في قاعة شريكة، تجمع بين المتمرسين والمبتدئين.",
      titleEn: "Escape game", summaryEn: "One hour to get out together, with teammates you don't know yet.",
      descriptionEn: "An hour of puzzles to solve together in a partner room, mixing regulars and beginners.",
      pricingModel: "fixed_partner", partnerPriceDh: 150,
      included: "La salle réservée",
      includedAr: "القاعة المحجوزة", includedEn: "The booked room",
      level: "all",
      questionnaire: q("paintball"),
    },
  },
  {
    id: "soiree-jeux", name: "Soirée jeux", image: "/images/modeles/soiree-jeux.webp", order: 2, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 18, durationMinutes: 150, weekday: 2, time: "19:30",
      titleFr: "Soirée jeux",
      summaryFr: "Des jeux simples, des règles expliquées, et des fous rires.",
      descriptionFr: "Des jeux faciles à apprendre, dans un café ludique partenaire. On change de table en cours de soirée pour jouer avec d'autres personnes.",
      titleAr: "أمسية ألعاب", summaryAr: "ألعاب بسيطة وقواعد مشروحة وضحك كثير.",
      descriptionAr: "ألعاب سهلة التعلم في مقهى ألعاب شريك. نغيّر الطاولة خلال الأمسية للعب مع أشخاص آخرين.",
      titleEn: "Game night", summaryEn: "Simple games, rules explained, and lots of laughs.",
      descriptionEn: "Easy-to-learn games in a partner board-game café. Tables change during the evening so you play with different people.",
      pricingModel: "variable_consumption", budgetMinDh: 40, budgetMaxDh: 80,
      included: "Les jeux\nLes règles expliquées",
      includedAr: "الألعاب\nشرح القواعد", includedEn: "The games\nRules explained",
      questionnaire: [],
    },
  },
  {
    id: "quiz", name: "Quiz", image: "/images/modeles/quiz.webp", order: 3, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 24, durationMinutes: 120, weekday: 4, time: "20:00",
      titleFr: "Quiz",
      summaryFr: "Culture générale, musique et fous rires, avec une équipe d'inconnus.",
      descriptionFr: "Six manches de quiz et de blind test, animées dans un café ou un bar partenaire.",
      titleAr: "مسابقة", summaryAr: "ثقافة عامة وموسيقى وضحك، مع فريق من الغرباء.",
      descriptionAr: "ست جولات من الأسئلة واختبار الموسيقى، في مقهى أو حانة شريكة.",
      titleEn: "Quiz", summaryEn: "General knowledge, music and laughs, with a team of strangers.",
      descriptionEn: "Six rounds of quiz and blind test, hosted in a partner café or bar.",
      pricingModel: "variable_consumption", budgetMinDh: 60, budgetMaxDh: 120,
      included: "L'animation du quiz",
      includedAr: "تنشيط المسابقة", includedEn: "The quiz host",
      questionnaire: q("paintball"),
    },
  },
  {
    id: "afterwork", name: "Afterwork", image: "/images/modeles/afterwork.webp", order: 1, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", subcategoryId: "afterwork", revealPolicy: "immediate", bookingMode: "open", capacity: 30, durationMinutes: 120, weekday: 4, time: "19:30",
      titleFr: "Afterwork",
      summaryFr: "Après le travail, un verre avec des gens qui ont aussi envie de rencontrer du monde.",
      descriptionFr: "Un espace réservé pour le groupe dans un bar ou un rooftop partenaire, pour faire de nouvelles rencontres en fin de journée.",
      titleAr: "بعد العمل", summaryAr: "بعد العمل، مشروب مع أشخاص يرغبون أيضاً في التعرف على الناس.",
      descriptionAr: "فضاء محجوز للمجموعة في حانة أو سطح شريك، لتعارف جديد في نهاية اليوم.",
      titleEn: "Afterwork", summaryEn: "After work, a drink with people who also want to meet new people.",
      descriptionEn: "A space reserved for the group in a partner bar or rooftop, to meet new people at the end of the day.",
      pricingModel: "variable_consumption", budgetMinDh: 60, budgetMaxDh: 150,
      included: "Un espace réservé pour le groupe",
      includedAr: "فضاء محجوز للمجموعة", includedEn: "A space reserved for the group",
      questionnaire: [],
    },
  },
  {
    id: "echange-langues", name: "Échange de langues", image: "/images/modeles/echange-langues.webp", order: 5, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 24, durationMinutes: 120, weekday: 3, time: "19:00",
      titleFr: "Échange de langues",
      summaryFr: "Pratiquer une langue en vrai, autour d'un café.",
      descriptionFr: "Vous pratiquez la langue de votre choix avec des personnes qui la parlent, dans un café partenaire. On change de table toutes les 30 minutes.",
      titleAr: "تبادل اللغات", summaryAr: "تمرّن على لغة في الواقع، حول فنجان قهوة.",
      descriptionAr: "تتمرن على اللغة التي تختارها مع أشخاص يتحدثونها، في مقهى شريك. نغيّر الطاولة كل 30 دقيقة.",
      titleEn: "Language exchange", summaryEn: "Practise a language for real, over coffee.",
      descriptionEn: "Practise the language of your choice with people who speak it, in a partner café. Tables change every 30 minutes.",
      pricingModel: "variable_consumption", budgetMinDh: 30, budgetMaxDh: 60,
      included: "Des tables par langue",
      includedAr: "طاولات حسب اللغة", includedEn: "Tables by language",
      languages: ["fr", "en", "es", "ar", "darija"],
      questionnaire: q("langues"),
    },
  },
  // ——— Découvrir ———
  {
    id: "ceramique", name: "Céramique", image: "/images/modeles/ceramique.webp", order: 2, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", subcategoryId: "ceramique", revealPolicy: "immediate", bookingMode: "individual", capacity: 8, durationMinutes: 120, weekday: 6, time: "11:00",
      titleFr: "Céramique",
      summaryFr: "Les mains dans la terre, et de nouvelles têtes autour de la table.",
      descriptionFr: "Un céramiste vous guide pour façonner votre pièce (bol, tasse ou petit vase), en petit groupe.",
      titleAr: "خزف", summaryAr: "اليدان في الطين، ووجوه جديدة حول الطاولة.",
      descriptionAr: "يرشدك خزّاف لتشكيل قطعتك (وعاء أو فنجان أو مزهرية صغيرة) ضمن مجموعة صغيرة.",
      titleEn: "Ceramics", summaryEn: "Hands in the clay, and new faces around the table.",
      descriptionEn: "A ceramicist guides you to shape your piece (bowl, cup or small vase), in a small group.",
      pricingModel: "fixed_partner", partnerPriceDh: 300,
      included: "L'atelier guidé par un céramiste\nLa terre et la cuisson",
      includedAr: "ورشة يرشدها خزّاف\nالطين والحرق في الفرن", includedEn: "A workshop led by a ceramicist\nClay and firing",
      practicalInfoAr: "تُحرق القطعة وتُطلى في الورشة، وتُستلم بعد أسبوعين إلى ثلاثة.", practicalInfoEn: "Your piece is fired and glazed by the studio, ready to collect two to three weeks later.",
      equipmentProvidedAr: "طين، أدوات، مئزر", equipmentProvidedEn: "Clay, tools, apron",
      dressCodeAr: "ملابس لا تخشى عليها", dressCodeEn: "Clothes you don't mind getting dirty",
      practicalInfo: "Pièce cuite et émaillée par l'atelier, à récupérer deux à trois semaines plus tard.",
      equipmentProvided: "Terre, outils, tablier", dressCode: "Vêtements qui ne craignent rien", level: "beginner",
      questionnaire: q("workshop"),
    },
  },
  {
    id: "visite-guidee", name: "Visite guidée", image: "/images/modeles/visite-guidee.webp", order: 6, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", revealPolicy: "immediate", bookingMode: "individual", capacity: 15, durationMinutes: 120, weekday: 6, time: "10:00",
      titleFr: "Visite guidée",
      summaryFr: "Casablanca racontée par un guide passionné, en petit groupe.",
      descriptionFr: "Une balade à pied avec un guide local, au choix : Art déco du centre-ville, Habous ou ancienne médina.",
      titleAr: "جولة مع مرشد", summaryAr: "الدار البيضاء يرويها مرشد شغوف، ضمن مجموعة صغيرة.",
      descriptionAr: "جولة على الأقدام مع مرشد محلي، حسب اختيارك: آرت ديكو وسط المدينة أو الحبوس أو المدينة القديمة.",
      titleEn: "Guided tour", summaryEn: "Casablanca told by a passionate guide, in a small group.",
      descriptionEn: "A walking tour with a local guide, your choice: downtown Art Deco, the Habous or the old medina.",
      pricingModel: "fixed_partner", partnerPriceDh: 120,
      included: "La visite guidée",
      includedAr: "الجولة المصحوبة بمرشد", includedEn: "The guided tour",
      whatToBringAr: "حذاء مريح، ماء", whatToBringEn: "Comfortable shoes, water",
      whatToBring: "Chaussures confortables, eau", outdoor: true,
      questionnaire: [],
    },
  },
];

/**
 * 25/11 : éditions spéciales « Girls only », dans les Tables (café, brunch, déjeuner, dîner), réservées aux femmes
 * (vérifié par le serveur à la réservation). Rien d'automatique : l'équipe crée chaque édition à la main depuis ces
 * modèles (date, gamme, places), aucune date ni rendez-vous n'est créé tout seul.
 */
const GIRLS_ONLY: { id: string; fr: [string, string, string]; ar: [string, string, string]; en: [string, string, string] }[] = [
  { id: "cafe", fr: ["Café Girls only", "Un café entre femmes, pour élargir son cercle.", "Une édition spéciale réservée aux femmes : un café choisi par notre équipe, à une table de 4 à 6, pour rencontrer d'autres femmes de Casablanca."], ar: ["قهوة للنساء فقط", "قهوة بين النساء لتوسيع دائرتك.", "إصدار خاص مخصص للنساء: مقهى يختاره فريقنا، على طاولة من 4 إلى 6، للتعرف على نساء أخريات من الدار البيضاء."], en: ["Girls only coffee", "A women-only coffee, to widen your circle.", "A special edition for women only: a café chosen by our team, at a table of 4 to 6, to meet other women in Casablanca."] },
  { id: "brunch", fr: ["Brunch Girls only", "Un brunch entre femmes, pour élargir son cercle.", "Une édition spéciale réservée aux femmes : un brunch dans un restaurant choisi par notre équipe, à une table de 4 à 6, pour rencontrer d'autres femmes de Casablanca."], ar: ["برانش للنساء فقط", "برانش بين النساء لتوسيع دائرتك.", "إصدار خاص مخصص للنساء: برانش في مطعم يختاره فريقنا، على طاولة من 4 إلى 6، للتعرف على نساء أخريات من الدار البيضاء."], en: ["Girls only brunch", "A women-only brunch, to widen your circle.", "A special edition for women only: a brunch in a restaurant chosen by our team, at a table of 4 to 6, to meet other women in Casablanca."] },
  { id: "dejeuner", fr: ["Déjeuner Girls only", "Un déjeuner entre femmes, pour élargir son cercle.", "Une édition spéciale réservée aux femmes : un déjeuner dans un restaurant choisi par notre équipe, à une table de 4 à 6, pour rencontrer d'autres femmes de Casablanca."], ar: ["غداء للنساء فقط", "غداء بين النساء لتوسيع دائرتك.", "إصدار خاص مخصص للنساء: غداء في مطعم يختاره فريقنا، على طاولة من 4 إلى 6، للتعرف على نساء أخريات من الدار البيضاء."], en: ["Girls only lunch", "A women-only lunch, to widen your circle.", "A special edition for women only: lunch in a restaurant chosen by our team, at a table of 4 to 6, to meet other women in Casablanca."] },
  { id: "diner", fr: ["Dîner Girls only", "Un dîner entre femmes, pour élargir son cercle.", "Une édition spéciale réservée aux femmes : un dîner dans un restaurant choisi par notre équipe, à une table de 4 à 6, pour rencontrer d'autres femmes de Casablanca."], ar: ["عشاء للنساء فقط", "عشاء بين النساء لتوسيع دائرتك.", "إصدار خاص مخصص للنساء: عشاء في مطعم يختاره فريقنا، على طاولة من 4 إلى 6، للتعرف على نساء أخريات من الدار البيضاء."], en: ["Girls only dinner", "A women-only dinner, to widen your circle.", "A special edition for women only: dinner in a restaurant chosen by our team, at a table of 4 to 6, to meet other women in Casablanca."] },
];

/** Préfixe des modèles « Girls only » (éditions spéciales, créées à la main à chaque fois). */
export const SPECIAL_TEMPLATE_PREFIX = "girls-only-";
export const isSpecialTemplate = (t: Pick<EventTemplate, "id">) => t.id.startsWith(SPECIAL_TEMPLATE_PREFIX);

export const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  ...BASE_TEMPLATES,
  ...GIRLS_ONLY.map((g, i): EventTemplate => {
    const base = BASE_TEMPLATES.find((t) => t.id === g.id)!;
    return {
      ...base,
      id: `${SPECIAL_TEMPLATE_PREFIX}${g.id}`,
      name: `${base.name} Girls only`,
      order: 10 + i,
      values: {
        ...base.values, audience: "women",
        titleFr: g.fr[0], summaryFr: g.fr[1], descriptionFr: g.fr[2],
        titleAr: g.ar[0], summaryAr: g.ar[1], descriptionAr: g.ar[2],
        titleEn: g.en[0], summaryEn: g.en[1], descriptionEn: g.en[2],
      },
    };
  }),
];

/** Univers où ranger un modèle, dans l'ordre d'affichage : Tables, Activités, Événements (docs/25). */
export const TEMPLATE_UNIVERSES = ["eat", "move", "discover"] as const;

/**
 * docs/25 : modèles livrés qui ne sont pas au calendrier de lancement (rangés « Pour plus tard » dans le back-office).
 * Tous les autres, et ceux créés dans l'appli, sont « Au calendrier ».
 */
export const LATER_TEMPLATE_IDS: readonly string[] = ["dejeuner", "soiree-jeux", "quiz", "echange-langues", "visite-guidee"];

/** Le modèle sert-il au calendrier de lancement (rendez-vous de la semaine, activités du samedi, événements) ? */
export function isCalendarTemplate(t: Pick<EventTemplate, "id">): boolean {
  return !LATER_TEMPLATE_IDS.includes(t.id);
}

/** Modèles visibles : ceux de l'appli l'emportent sur ceux livrés avec le site (même identifiant). */
export function mergeTemplates(saved: EventTemplate[], defaults: EventTemplate[] = DEFAULT_EVENT_TEMPLATES): EventTemplate[] {
  const byId = new Map(defaults.map((t) => [t.id, t]));
  const LOCALIZED = ["titleAr", "summaryAr", "descriptionAr", "titleEn", "summaryEn", "descriptionEn", ...EXTRA_I18N_KEYS] as const;
  for (const t of saved) {
    const d = byId.get(t.id);
    // Étape AC : un modèle enregistré avant les versions arabe et anglaise les reprend du modèle livré (champs vides seulement).
    // Une traduction livrée n'est reprise que si le texte français correspondant n'a pas été changé.
    const base = (k: string) => { const b = k.replace(/(Ar|En)$/, ""); return (["title", "summary", "description"].includes(b) ? `${b}Fr` : b) as keyof TemplateValues; };
    const filled = d ? Object.fromEntries(LOCALIZED.map((k) => [k, t.values[k] || (t.values[base(k)] === d.values[base(k)] ? d.values[k] : "") || ""])) : {};
    // Gammes : l'arabe et l'anglais de l'ambiance et des infos pratiques sont repris quand le français est le même.
    const tiers = t.tiers && d?.tiers
      ? Object.fromEntries(Object.entries(t.tiers).map(([k, g]) => {
          const dg = d.tiers?.[k as VenueTier];
          const same = (a?: string, b?: string) => (a ?? "") === (b ?? "");
          return [k, g && dg ? {
            ...g,
            ambianceAr: g.ambianceAr || (same(g.ambiance, dg.ambiance) ? dg.ambianceAr : undefined),
            ambianceEn: g.ambianceEn || (same(g.ambiance, dg.ambiance) ? dg.ambianceEn : undefined),
            practicalInfoAr: g.practicalInfoAr || (same(g.practicalInfo, dg.practicalInfo) ? dg.practicalInfoAr : undefined),
            practicalInfoEn: g.practicalInfoEn || (same(g.practicalInfo, dg.practicalInfo) ? dg.practicalInfoEn : undefined),
          } : g];
        }))
      : t.tiers;
    // docs/25 : un modèle enregistré dans un ancien univers (Créer, escape game dans Découvrir) passe dans Activités.
    const u = launchUniverse({ id: t.id, templateId: t.id, categoryId: t.values.categoryId, subcategoryId: t.values.subcategoryId || null });
    const universe = u.categoryId === t.values.categoryId ? {} : { categoryId: u.categoryId, subcategoryId: u.subcategoryId ?? "" };
    byId.set(t.id, { ...t, ...(tiers ? { tiers } : {}), values: { ...t.values, ...filled, ...universe }, builtIn: d?.builtIn ?? false });
  }
  return [...byId.values()].sort((a, b) => TEMPLATE_UNIVERSES.indexOf(a.values.categoryId as never) - TEMPLATE_UNIVERSES.indexOf(b.values.categoryId as never) || a.order - b.order || a.name.localeCompare(b.name, "fr"));
}

/**
 * Étape Y : pour un même format des Tables, chaque gamme a son jour (et son heure) : on ne voit jamais trois
 * « Déjeuner » à la suite. Jours : 0 dimanche … 6 samedi. Les autres modèles gardent leur jour conseillé.
 */
export const TIER_SCHEDULE: Record<string, Partial<Record<VenueTier, { weekday: number; time: string }>>> = {
  // docs/25 : café, brunch et dîner suivent le calendrier des rendez-vous (toutes les gammes le même jour), voir le modèle.
  dejeuner: { casual: { weekday: 2, time: "12:30" }, premium: { weekday: 4, time: "12:30" }, exclusive: { weekday: 5, time: "13:00" } },
};

/** Jour et heure d'un modèle, selon la gamme pour les Tables. */
export function scheduleFor(t: EventTemplate, tier: VenueTier | null | undefined): { weekday: number; time: string } {
  return (tier && TIER_SCHEDULE[t.id]?.[tier]) || { weekday: t.values.weekday, time: t.values.time };
}

/** Prochaine date (AAAA-MM-JJ) qui tombe le jour conseillé, au plus tôt demain. */
export function nextWeekdayDate(weekday: number, now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Arabe et anglais d'un modèle (la gamme peut changer l'ambiance et les infos pratiques). */
export function templateExtra(x: TemplateValues, g?: TemplateTier): ExtraI18nStrings {
  const out: ExtraI18nStrings = Object.fromEntries(EXTRA_I18N_KEYS.flatMap((k) => (x[k] ? [[k, x[k]]] : [])));
  if (g) {
    if (g.ambiance) { out.ambianceAr = g.ambianceAr ?? ""; out.ambianceEn = g.ambianceEn ?? ""; }
    if (g.practicalInfo) { out.practicalInfoAr = g.practicalInfoAr ?? ""; out.practicalInfoEn = g.practicalInfoEn ?? ""; }
  }
  return out;
}

/* ——— Enregistrement d'un modèle depuis l'appli ——— */

const text = (max: number) => z.string().trim().max(max, "tooLong").optional().or(z.literal(""));
const tierSchema = z.object({ ambiance: z.string().trim().max(60, "tooLong"), practicalInfo: text(1000), ambianceAr: text(60), ambianceEn: text(60), practicalInfoAr: text(1000), practicalInfoEn: text(1000) });

export const templateValuesSchema = z.object({
  titleFr: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  summaryFr: z.string().trim().min(10, "tooShort").max(160, "tooLong"),
  descriptionFr: z.string().trim().min(30, "tooShort").max(3000, "tooLong"),
  titleAr: text(80), summaryAr: text(160), descriptionAr: text(3000), titleEn: text(80), summaryEn: text(160), descriptionEn: text(3000),
  categoryId: z.string().regex(CATEGORY_ID_PATTERN, "required"),
  subcategoryId: z.string().regex(CATEGORY_ID_PATTERN).optional().or(z.literal("")),
  revealPolicy: z.enum(["immediate", "on_group_reveal"]),
  bookingMode: z.enum(BOOKING_MODES as [BookingMode, ...BookingMode[]]),
  groupMin: z.number().int().min(2).max(20).optional(),
  groupMax: z.number().int().min(2).max(20).optional(),
  capacity: z.number().int().min(1).max(50),
  maxSeatsPerBooking: z.union([z.literal(1), z.literal(2)]),
  durationMinutes: z.number().int().min(15).max(1440),
  weekday: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "required"),
  pricingModel: z.enum(["online_only", "fixed_partner", "variable_consumption"]),
  partnerPriceDh: z.number().min(0).max(100_000).optional(),
  budgetMinDh: z.number().min(0).max(100_000).optional(),
  budgetMaxDh: z.number().min(0).max(100_000).optional(),
  cuisine: text(60), ambiance: text(60),
  included: z.string().max(1000, "tooLong"),
  practicalInfo: text(1000),
  level: z.enum(ACTIVITY_LEVELS).optional(),
  equipmentProvided: text(300), whatToBring: text(300), dressCode: text(200),
  ...EXTRA_I18N_SHAPE,
  outdoor: z.boolean(),
  physicalActivity: z.boolean(),
  alcoholServed: z.boolean(),
  languages: z.array(z.enum(SPOKEN_LANGUAGES as [SpokenLanguage, ...SpokenLanguage[]])).min(1, "pickOne"),
  cancellationPolicyId: z.string().min(1, "required"),
  audience: z.enum(["all", "women"]),
  membersOnly: z.boolean(),
  earlyAccessDays: z.number().int().min(0).max(30),
  questionnaire: questionnaireSchema,
});

export const templateInputSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/, "slug"),
  name: z.string().trim().min(2, "tooShort").max(60, "tooLong"),
  image: z.string().regex(/^(\/images\/modeles\/[a-z0-9-]+\.webp|experiences\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+)$/, "invalidImagePath"),
  order: z.number().int().min(0).max(999).default(50),
  isActive: z.boolean().default(true),
  tiers: z.object({ casual: tierSchema.optional(), premium: tierSchema.optional(), exclusive: tierSchema.optional() }).optional(),
  values: templateValuesSchema,
});
export type TemplateInput = z.infer<typeof templateInputSchema>;

/** Identifiant lisible d'un nouveau modèle (« Soirée karaoké » → « soiree-karaoke »). */
export function templateSlug(name: string): string {
  const s = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return /^[a-z]/.test(s) ? s : `modele-${s || "nouveau"}`;
}


/**
 * Vitrine (docs/22, étape M) : données d'un événement créé à partir d'un modèle, prêtes pour experienceInputSchema.
 * Tables : lieu attribué (secret), une gamme ; activités : lieu fixe (un lieu partenaire compatible).
 */
export function templateExperienceInput(t: EventTemplate, o: { tier?: VenueTier | null; firstDate: string; weeks: number; cityId: string; venue?: { name: string; address: string; district: string; partnerId?: string } | null }) {
  const x = t.values;
  const g = o.tier ? t.tiers?.[o.tier] : undefined;
  const grouped = x.bookingMode === "group" || x.bookingMode === "social_dinner";
  return {
    // Étape S : la gamme n'est pas dans le titre (elle s'affiche sur la carte, sous le titre).
    titleFr: x.titleFr, summaryFr: x.summaryFr, descriptionFr: x.descriptionFr,
    titleAr: x.titleAr ?? "", summaryAr: x.summaryAr ?? "", descriptionAr: x.descriptionAr ?? "",
    titleEn: x.titleEn ?? "", summaryEn: x.summaryEn ?? "", descriptionEn: x.descriptionEn ?? "",
    categoryId: x.categoryId, subcategoryId: x.subcategoryId ?? "", cityId: o.cityId,
    district: o.venue?.district ?? "", venueName: o.venue?.name ?? "", address: o.venue?.address ?? "", partnerId: o.venue?.partnerId ?? "",
    revealPolicy: x.revealPolicy, bookingMode: x.bookingMode,
    ...(grouped ? { groupMin: x.groupMin ?? 4, groupTarget: x.groupMax ?? 6, groupMax: x.groupMax ?? 6 } : {}),
    maxSeatsPerBooking: x.maxSeatsPerBooking, admission: "direct" as const, requestMessageRequired: false,
    durationMinutes: x.durationMinutes, languages: x.languages, alcoholServed: x.alcoholServed,
    cancellationPolicyId: x.cancellationPolicyId, status: "published" as const,
    sessions: { firstDate: o.firstDate, time: scheduleFor(t, o.tier).time, weeks: o.weeks, capacity: x.capacity },
    pricingModel: x.pricingModel,
    ...(x.partnerPriceDh !== undefined ? { partnerPriceDh: x.partnerPriceDh } : {}),
    ...(x.budgetMinDh !== undefined ? { budgetMinDh: x.budgetMinDh } : {}),
    ...(x.budgetMaxDh !== undefined ? { budgetMaxDh: x.budgetMaxDh } : {}),
    venueTier: o.tier ?? "", ambiance: g?.ambiance ?? x.ambiance ?? "", cuisine: x.cuisine ?? "",
    included: x.included, practicalInfo: g?.practicalInfo ?? x.practicalInfo ?? "",
    ...templateExtra(x, g),
    ...(x.level ? { level: x.level } : {}), equipmentProvided: x.equipmentProvided ?? "", whatToBring: x.whatToBring ?? "", dressCode: x.dressCode ?? "",
    outdoor: x.outdoor, physicalActivity: x.physicalActivity, foodServed: x.categoryId === "eat",
    audience: x.audience, membersOnly: x.membersOnly, earlyAccessDays: x.earlyAccessDays,
    questionnaire: x.questionnaire, templateId: t.id, free: false, economicsModel: "own" as const,
  };
}
