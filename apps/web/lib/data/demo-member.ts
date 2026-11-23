/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — membre fictif « Salma » et son historique.
 * Remplacées en phase 3 par les données du compte connecté (Firestore + règles de sécurité).
 */
import type { AppNotification, BookingRequest, Carnet, Membership, WaitlistEntry, Experience, Group, Reservation, Session, UserProfile } from "@thecommunity/shared";
import { buildDemoSessions, DEMO_EXPERIENCES, DEMO_REVIEWS } from "./demo";

export const DEMO_MEMBER: UserProfile = {
  uid: "demo-salma",
  trustedHost: true,
  firstName: "Salma",
  lastName: "Benali",
  email: "salma.demo@example.com",
  phone: "+212 6 00 00 00 00",
  birthDate: "1994-05-12",
  gender: "female",
  cityId: "casablanca",
  photoPath: undefined,
  languages: ["fr", "darija", "en"],
  interests: ["gastronomy", "culture", "wellness", "music", "travel"],
  socialGoals: ["meet_new_people", "discover_activities"],
  // Étape 30 : préférences facultatives.
  district: "Maârif",
  favoriteCategories: ["eat", "create"],
  sportLevel: "beginner",
  agePreference: "any",
  groupVibe: "curious",
  conversationStyle: 3,
  humor: "playful",
  lifeValues: ["friends", "learning", "adventure"],
  exerciseFrequency: "weekly",
  venueBudget: "casual",
  diets: [],
  sector: "creative_media",
  referral: "instagram",
  whatsapp: true,
  instagram: "",
  profession: "Architecte d'intérieur",
  bio: "Nouvelle à Casablanca depuis un an, j'aime les bonnes tables, le yoga du dimanche et les expos.",
  locale: "fr",
  onboardingCompleted: true,
  notificationPrefs: { email: true, push: false, marketingEmail: false },
  createdAt: "2026-09-02T10:00:00Z",
  isDemo: true,
};

const DAY = 86_400_000;

function exp(id: string): Experience {
  const e = DEMO_EXPERIENCES.find((x) => x.id === id);
  if (!e) throw new Error(`Expérience de démo manquante : ${id}`);
  return e;
}

function snapshot(e: Experience, startAt: string, endAt: string): Reservation["sessionSnapshot"] {
  return {
    title: e.title,
    slug: e.slug,
    startAt,
    endAt,
    district: e.district,
    coverImagePath: e.images[0]?.path ?? "",
    categoryId: e.categoryId,
    bookingMode: e.bookingMode,
  };
}

function pricing(unitAmount: number, seats = 1): Reservation["pricing"] {
  const subtotal = unitAmount * seats;
  return { unitAmount, seats, subtotal, discount: 0, fees: 0, total: subtotal, currency: "MAD" };
}

/** Une date passée à heure fixe (en UTC, Casablanca ≈ UTC+1 : suffisant pour la démo). */
function pastAt(now: Date, daysAgo: number, hourUtc: number, durationMin: number) {
  const d = new Date(now.getTime() - daysAgo * DAY);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return { startAt: d.toISOString(), endAt: new Date(d.getTime() + durationMin * 60_000).toISOString() };
}

function firstSession(sessions: Session[], experienceId: string) {
  const s = sessions.find((x) => x.experienceId === experienceId);
  if (!s) throw new Error(`Session de démo manquante : ${experienceId}`);
  return s;
}

export function buildDemoMemberData(now: Date = new Date()) {
  const sessions = buildDemoSessions(now);
  const dinner = exp("exp-diner-inconnus");
  const pilates = exp("exp-pilates-brunch");
  const escape = exp("exp-escape-game");
  const ceramic = exp("exp-ceramique");
  const rooftop = exp("exp-rooftop");

  const sDinner = firstSession(sessions, dinner.id);
  const sPilates = firstSession(sessions, pilates.id);
  const sRooftop = firstSession(sessions, rooftop.id);
  const pEscape = pastAt(now, 12, 19, escape.durationMinutes);
  // Étape Z : trois Tables pour voir tout le parcours (lieu révélé la veille, check-in ouvert, après l'arrivée).
  const brunch = exp("exp-brunch-inconnus");
  const tajine = exp("exp-tajine-conversations");
  const chef = exp("exp-diner-du-chef");
  const at = (minutesFromNow: number, durationMin: number) => {
    const d = new Date(Math.round((now.getTime() + minutesFromNow * 60_000) / 300_000) * 300_000);
    return { startAt: d.toISOString(), endAt: new Date(d.getTime() + durationMin * 60_000).toISOString() };
  };
  // Brunch demain 11 h 30 (Casablanca, UTC+1) : lieu et résumé de table déjà révélés.
  const tBrunch = (() => { const d = new Date(now.getTime() + DAY); d.setUTCHours(10, 30, 0, 0); return { startAt: d.toISOString(), endAt: new Date(d.getTime() + brunch.durationMinutes * 60_000).toISOString() }; })();
  const tToday = at(20, tajine.durationMinutes);
  const tNow = at(-10, chef.durationMinutes);
  const summary = { others: 5, ageMin: 27, ageMax: 36, languages: ["fr", "darija", "en"], sectors: ["tech", "health", "creative_media"], interests: ["gastronomy", "travel", "music"] };
  const pCeramic = pastAt(now, 6, 14, ceramic.durationMinutes);

  const reservations: Reservation[] = [
    {
      id: "res-demo-diner",
      userId: DEMO_MEMBER.uid,
      sessionId: sDinner.id,
      experienceId: dinner.id,
      status: "confirmed",
      seats: 1,
      pricing: pricing(dinner.price.amount),
      sessionSnapshot: snapshot(dinner, sDinner.startAt, sDinner.endAt),
      paidAt: new Date(now.getTime() - 2 * DAY).toISOString(),
      createdAt: new Date(now.getTime() - 2 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "res-demo-pilates",
      userId: DEMO_MEMBER.uid,
      sessionId: sPilates.id,
      experienceId: pilates.id,
      status: "confirmed",
      seats: 1,
      pricing: pricing(pilates.price.amount),
      sessionSnapshot: snapshot(pilates, sPilates.startAt, sPilates.endAt),
      venue: { name: "Studio partenaire", address: "Boulevard d'Anfa, Casablanca" },
      paidAt: new Date(now.getTime() - DAY).toISOString(),
      createdAt: new Date(now.getTime() - DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "res-demo-rooftop",
      userId: DEMO_MEMBER.uid,
      sessionId: sRooftop.id,
      experienceId: rooftop.id,
      status: "refunded",
      seats: 2,
      pricing: pricing(rooftop.price.amount, 2),
      sessionSnapshot: snapshot(rooftop, sRooftop.startAt, sRooftop.endAt),
      paidAt: new Date(now.getTime() - 9 * DAY).toISOString(),
      cancellation: { at: new Date(now.getTime() - 3 * DAY).toISOString(), by: "user", refundAmount: rooftop.price.amount * 2 },
      createdAt: new Date(now.getTime() - 9 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "res-demo-ceramique",
      userId: DEMO_MEMBER.uid,
      sessionId: "ses-ceramique-passee",
      experienceId: ceramic.id,
      status: "attended",
      seats: 1,
      pricing: pricing(ceramic.price.amount),
      sessionSnapshot: snapshot(ceramic, pCeramic.startAt, pCeramic.endAt),
      venue: { name: "Atelier partenaire", address: "Quartier CIL, Casablanca" },
      paidAt: new Date(now.getTime() - 14 * DAY).toISOString(),
      createdAt: new Date(now.getTime() - 14 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "res-demo-escape",
      userId: DEMO_MEMBER.uid,
      sessionId: "ses-escape-passee",
      experienceId: escape.id,
      status: "attended",
      seats: 1,
      pricing: pricing(escape.price.amount),
      sessionSnapshot: snapshot(escape, pEscape.startAt, pEscape.endAt),
      venue: { name: "Escape room partenaire", address: "Rue Abou Dhabi, Maarif, Casablanca" },
      groupId: "grp-demo-escape",
      arrivedAt: new Date(new Date(pEscape.startAt).getTime() - 10 * 60_000).toISOString(),
      paidAt: new Date(now.getTime() - 20 * DAY).toISOString(),
      reviewId: "r4",
      createdAt: new Date(now.getTime() - 20 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "res-demo-brunch",
      userId: DEMO_MEMBER.uid,
      sessionId: "ses-demo-brunch",
      experienceId: brunch.id,
      status: "confirmed",
      seats: 1,
      pricing: pricing(brunch.price.amount),
      sessionSnapshot: snapshot(brunch, tBrunch.startAt, tBrunch.endAt),
      venue: { name: "La Sqala", address: "Boulevard des Almohades, Casablanca", cuisine: "Marocaine, brunch beldi", cuisineI18n: { ar: "مغربية، فطور بلدي", en: "Moroccan, beldi brunch" } },
      groupId: "grp-demo-brunch",
      tableSummary: summary,
      paidAt: new Date(now.getTime() - 3 * DAY).toISOString(),
      createdAt: new Date(now.getTime() - 3 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "res-demo-today",
      userId: DEMO_MEMBER.uid,
      sessionId: "ses-demo-today",
      experienceId: tajine.id,
      status: "confirmed",
      seats: 1,
      pricing: pricing(tajine.price.amount),
      sessionSnapshot: snapshot(tajine, tToday.startAt, tToday.endAt),
      venue: { name: "Al Mounia", address: "95 rue du Prince Moulay Abdallah, Casablanca", cuisine: "Marocaine traditionnelle", cuisineI18n: { ar: "مغربية تقليدية", en: "Traditional Moroccan" } },
      groupId: "grp-demo-today",
      tableSummary: summary,
      paidAt: new Date(now.getTime() - 4 * DAY).toISOString(),
      createdAt: new Date(now.getTime() - 4 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "res-demo-now",
      userId: DEMO_MEMBER.uid,
      sessionId: "ses-demo-now",
      experienceId: chef.id,
      status: "confirmed",
      seats: 1,
      pricing: pricing(chef.price.amount),
      sessionSnapshot: snapshot(chef, tNow.startAt, tNow.endAt),
      venue: { name: "Le Rouget de l'Isle", address: "16 rue Rouget de l'Isle, Villa Élise, Casablanca", cuisine: "Française", cuisineI18n: { ar: "فرنسية", en: "French" } },
      groupId: "grp-demo-now",
      tableSummary: summary,
      arrivedAt: new Date(now.getTime() - 14 * 60_000).toISOString(),
      paidAt: new Date(now.getTime() - 5 * DAY).toISOString(),
      createdAt: new Date(now.getTime() - 5 * DAY).toISOString(),
      isDemo: true,
    },
  ];

  const table = (id: string, sessionId: string, label: string, arrivedUids: string[], late: Record<string, number>): Group => ({
    id,
    sessionId,
    label,
    status: "revealed",
    memberIds: [DEMO_MEMBER.uid, "u-karim", "u-lina", "u-omar", "u-sofia", "u-yassine"],
    members: [
      { uid: DEMO_MEMBER.uid, firstName: "Salma", interests: ["gastronomy", "culture", "wellness"] },
      { uid: "u-karim", firstName: "Karim", interests: ["games", "sport", "travel"] },
      { uid: "u-lina", firstName: "Lina", interests: ["art", "music", "culture"] },
      { uid: "u-omar", firstName: "Omar", interests: ["games", "discovery", "gastronomy"] },
      { uid: "u-sofia", firstName: "Sofia", interests: ["travel", "wellness", "music"] },
      { uid: "u-yassine", firstName: "Yassine", interests: ["sport", "games", "nightlife"] },
    ],
    namesAtCheckIn: true,
    arrivedUids,
    late,
    isDemo: true,
  });

  const groups: Group[] = [
    table("grp-demo-brunch", "ses-demo-brunch", "Table 2", [], {}),
    table("grp-demo-today", "ses-demo-today", "Table 1", ["u-karim", "u-lina"], { "u-omar": 10 }),
    table("grp-demo-now", "ses-demo-now", "Table 3", [DEMO_MEMBER.uid, "u-karim", "u-sofia", "u-yassine"], { "u-lina": 20 }),
    {
      id: "grp-demo-escape",
      sessionId: "ses-escape-passee",
      label: "Équipe B",
      status: "revealed",
      memberIds: [DEMO_MEMBER.uid, "u-karim", "u-lina", "u-omar", "u-sofia", "u-yassine"],
      members: [
        { uid: DEMO_MEMBER.uid, firstName: "Salma", interests: ["gastronomy", "culture", "wellness"] },
        { uid: "u-karim", firstName: "Karim", interests: ["games", "sport", "travel"] },
        { uid: "u-lina", firstName: "Lina", interests: ["art", "music", "culture"] },
        { uid: "u-omar", firstName: "Omar", interests: ["games", "discovery", "gastronomy"] },
        { uid: "u-sofia", firstName: "Sofia", interests: ["travel", "wellness", "music"] },
        { uid: "u-yassine", firstName: "Yassine", interests: ["sport", "games", "nightlife"] },
      ],
      // docs/22 § 17.H : prénoms visibles après le check-in ; messages de la table ouverts 14 jours.
      namesAtCheckIn: true,
      arrivedUids: [DEMO_MEMBER.uid, "u-karim", "u-lina", "u-omar", "u-sofia"],
      isDemo: true,
    },
  ];

  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const notifications: AppNotification[] = [
    {
      id: "n1",
      type: "booking_confirmed",
      title: { fr: "Réservation confirmée", ar: "تم تأكيد الحجز" },
      body: { fr: "Votre place pour « Pilates & brunch » est confirmée.", ar: "تم تأكيد مكانك في « بيلاتس وفطور متأخر »." },
      link: "/espace/reservations/res-demo-pilates",
      createdAt: ago(DAY),
      isDemo: true,
    },
    {
      id: "n2",
      type: "review_request",
      title: { fr: "Comment s'est passé l'atelier ?", ar: "كيف كانت الورشة؟" },
      body: { fr: "Donnez votre avis sur l'atelier céramique : cela nous aide à composer de meilleurs groupes.", ar: "شاركنا رأيك في ورشة الخزف لمساعدتنا على تكوين مجموعات أفضل." },
      link: "/espace/reservations/res-demo-ceramique",
      createdAt: ago(5 * DAY),
      isDemo: true,
    },
    {
      id: "n3",
      type: "payment_confirmed",
      title: { fr: "Paiement reçu", ar: "تم استلام الدفع" },
      body: { fr: "Paiement de 169 DH reçu pour le « Dîner entre inconnus ». Votre table sera révélée la veille.", ar: "تم استلام 169 درهم مقابل « عشاء مع غرباء ». سيتم الكشف عن طاولتك في اليوم السابق." },
      link: "/espace/reservations/res-demo-diner",
      createdAt: ago(2 * DAY),
      readAt: ago(2 * DAY - 3_600_000),
      isDemo: true,
    },
    {
      id: "n4",
      type: "group_revealed",
      title: { fr: "Votre équipe est prête", ar: "فريقك جاهز" },
      body: { fr: "Découvrez l'Équipe B pour l'escape game de vendredi.", ar: "تعرّف على الفريق B للعبة الهروب يوم الجمعة." },
      link: "/espace/reservations/res-demo-escape",
      createdAt: ago(13 * DAY),
      readAt: ago(13 * DAY - 7_200_000),
      isDemo: true,
    },
    {
      id: "n5",
      type: "welcome",
      title: { fr: "Bienvenue dans Wenzy", ar: "مرحباً بك في Wenzy" },
      body: { fr: "Votre profil est complet. Il ne reste qu'à choisir votre première expérience !", ar: "ملفك مكتمل. لم يبق إلا اختيار تجربتك الأولى!" },
      link: "/experiences",
      createdAt: ago(60 * DAY),
      readAt: ago(60 * DAY),
      isDemo: true,
    },
  ];

  return { profile: DEMO_MEMBER, reservations, groups, notifications, requests: [] as BookingRequest[], waitlists: [] as WaitlistEntry[], myReviews: DEMO_REVIEWS.filter((r) => reservations.some((x) => x.reviewId === r.id)), membership: null as Membership | null, carnet: { uid: DEMO_MEMBER.uid, credits: 2, expiresAt: new Date(now.getTime() + 60 * DAY).toISOString() } as Carnet | null };
}
