/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — membre fictif « Salma » et son historique.
 * Remplacées en phase 3 par les données du compte connecté (Firestore + règles de sécurité).
 */
import type { AppNotification, BookingRequest, WaitlistEntry, Experience, Group, Reservation, Session, UserProfile } from "@thecommunity/shared";
import { buildDemoSessions, DEMO_EXPERIENCES } from "./demo";

export const DEMO_MEMBER: UserProfile = {
  uid: "demo-salma",
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
      paidAt: new Date(now.getTime() - 20 * DAY).toISOString(),
      reviewId: "r4",
      createdAt: new Date(now.getTime() - 20 * DAY).toISOString(),
      isDemo: true,
    },
  ];

  const groups: Group[] = [
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
      title: { fr: "Bienvenue dans The Host Club", ar: "مرحباً بك في The Host Club" },
      body: { fr: "Votre profil est complet. Il ne reste qu'à choisir votre première expérience !", ar: "ملفك مكتمل. لم يبق إلا اختيار تجربتك الأولى!" },
      link: "/experiences",
      createdAt: ago(60 * DAY),
      readAt: ago(60 * DAY),
      isDemo: true,
    },
  ];

  return { profile: DEMO_MEMBER, reservations, groups, notifications, requests: [] as BookingRequest[], waitlists: [] as WaitlistEntry[] };
}
