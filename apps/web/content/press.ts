/**
 * Kit presse (8 novembre). Textes originaux, en trois langues. Aucun chiffre inventé : seuls des faits vérifiables
 * (fondatrice, ville, univers, langues). Les photos proposées ne montrent personne de reconnaissable ; les autres
 * sont fournies sur demande, avec l'accord des participants (CGU, article « Photos »).
 */
type L = "fr" | "en" | "ar";
type T = Record<L, string>;

export const PRESS = {
  title: { fr: "Kit presse", en: "Press kit", ar: "الملف الصحفي" } as T,
  intro: {
    fr: "Tout ce qu'il faut pour parler de The Host Club : présentation, faits clés, logos, couleurs et photos. Pour une interview ou des visuels en haute définition, écrivez-nous.",
    en: "Everything you need to write about The Host Club: overview, key facts, logos, colours and photos. For an interview or high-resolution visuals, get in touch.",
    ar: "كل ما تحتاجه للحديث عن The Host Club: التعريف، المعطيات الأساسية، الشعارات، الألوان والصور. لإجراء مقابلة أو للحصول على صور عالية الدقة، راسلنا.",
  } as T,
  ctaLogos: { fr: "Télécharger les logos", en: "Download the logos", ar: "تحميل الشعارات" } as T,
  ctaContact: { fr: "Contacter l'équipe", en: "Contact the team", ar: "التواصل مع الفريق" } as T,

  aboutTitle: { fr: "En bref", en: "In short", ar: "باختصار" } as T,
  aboutHint: {
    fr: "Trois longueurs, à reprendre telles quelles.",
    en: "Three lengths, ready to use as they are.",
    ar: "ثلاثة أطوال، جاهزة للاستعمال كما هي.",
  } as T,
  boilerplates: [
    {
      label: { fr: "En une phrase", en: "One sentence", ar: "في جملة واحدة" } as T,
      text: {
        fr: "The Host Club organise à Casablanca des expériences pour rencontrer de nouvelles personnes dans la vraie vie : dîners entre inconnus, sport, jeux, ateliers et sorties.",
        en: "The Host Club hosts experiences in Casablanca for meeting new people in real life: dinners with strangers, sport, games, workshops and nights out.",
        ar: "ينظّم The Host Club في الدار البيضاء تجارب للتعرّف على أشخاص جدد في الحياة الواقعية: عشاء مع غرباء، رياضة، ألعاب، ورشات وخرجات.",
      } as T,
    },
    {
      label: { fr: "Version courte", en: "Short version", ar: "نسخة قصيرة" } as T,
      text: {
        fr: "Né à Casablanca, The Host Club réunit des inconnus autour d'expériences à taille humaine — un dîner, un brunch, un atelier, une séance de sport ou une sortie — dans des lieux partenaires de la ville. Les tables sont composées avec soin pour que chacun reparte avec de nouvelles connaissances, et peut-être de nouveaux amis.",
        en: "Born in Casablanca, The Host Club brings strangers together over small-scale experiences — a dinner, a brunch, a workshop, a workout or a night out — at partner venues across the city. Tables are put together with care so that everyone leaves with new acquaintances, and perhaps new friends.",
        ar: "وُلد The Host Club في الدار البيضاء، ويجمع غرباء حول تجارب على مقاس إنساني — عشاء، فطور متأخر، ورشة، حصة رياضة أو خرجة — في أماكن شريكة بالمدينة. تُشكَّل الطاولات بعناية حتى يغادر كل شخص بمعارف جديدة، وربما بأصدقاء جدد.",
      } as T,
    },
    {
      label: { fr: "Version longue", en: "Long version", ar: "نسخة مطوّلة" } as T,
      text: {
        fr: "The Host Club est né d'un constat simple : à Casablanca, les adresses ne manquent pas, mais rencontrer vraiment quelqu'un reste difficile. Sa fondatrice, Aya Snoussi, a commencé par de petites tables entre inconnus ; les demandes ont vite dépassé les places. Aujourd'hui, le club propose cinq univers — dîners et gastronomie, sport et bien-être, jeux, ateliers, sorties — dans des lieux partenaires. On réserve sur le site, en français, en arabe ou en anglais ; l'équipe compose des tables équilibrées (langues, âges, centres d'intérêt) et accueille chacun par son prénom. The Host Club n'est pas une application de rencontres amoureuses : c'est un lieu pour se faire des amis, hors ligne.",
        en: "The Host Club started from a simple observation: Casablanca has no shortage of places to go, yet really meeting someone is still hard. Its founder, Aya Snoussi, began with small tables of strangers; requests soon outnumbered the seats. Today the club offers five worlds — dining, sport and wellbeing, games, workshops, nights out — at partner venues. People book on the website in French, Arabic or English; the team puts together balanced tables (languages, ages, interests) and greets everyone by name. The Host Club is not a dating app: it's a place to make friends, offline.",
        ar: "انطلق The Host Club من ملاحظة بسيطة: في الدار البيضاء لا تنقص الأماكن، لكن التعرّف الحقيقي على شخص ما يظل صعبًا. بدأت مؤسِّسته آية السنوسي بطاولات صغيرة بين غرباء، وسرعان ما فاقت الطلبات عدد الأماكن. اليوم يقترح النادي خمسة عوالم — العشاء وفن الطبخ، الرياضة والرفاه، الألعاب، الورشات، الخرجات — في أماكن شريكة. يتم الحجز على الموقع بالفرنسية أو العربية أو الإنجليزية؛ ويشكّل الفريق طاولات متوازنة (اللغات، الأعمار، الاهتمامات) ويستقبل كل شخص باسمه. The Host Club ليس تطبيقًا للمواعدة: إنه مكان لتكوين صداقات، خارج الشاشات.",
      } as T,
    },
  ],
  copy: { fr: "Copier", en: "Copy", ar: "نسخ" } as T,
  copied: { fr: "Copié", en: "Copied", ar: "تم النسخ" } as T,

  factsTitle: { fr: "Faits clés", en: "Key facts", ar: "معطيات أساسية" } as T,
  facts: [
    { k: { fr: "Fondatrice", en: "Founder", ar: "المؤسِّسة" } as T, v: { fr: "Aya Snoussi", en: "Aya Snoussi", ar: "آية السنوسي" } as T },
    { k: { fr: "Ville", en: "City", ar: "المدينة" } as T, v: { fr: "Casablanca, Maroc", en: "Casablanca, Morocco", ar: "الدار البيضاء، المغرب" } as T },
    { k: { fr: "Univers", en: "Worlds", ar: "العوالم" } as T, v: { fr: "Dîners et gastronomie · Sport et bien-être · Jeux · Ateliers · Sorties", en: "Dining · Sport and wellbeing · Games · Workshops · Nights out", ar: "العشاء وفن الطبخ · الرياضة والرفاه · الألعاب · الورشات · الخرجات" } as T },
    { k: { fr: "Langues", en: "Languages", ar: "اللغات" } as T, v: { fr: "Français, arabe, anglais", en: "French, Arabic, English", ar: "الفرنسية، العربية، الإنجليزية" } as T },
    { k: { fr: "Signature", en: "Tagline", ar: "الشعار" } as T, v: { fr: "« Your people are out there. »", en: "“Your people are out there.”", ar: "« Your people are out there. »" } as T },
    { k: { fr: "Ce que ce n'est pas", en: "What it isn't", ar: "ما ليس عليه" } as T, v: { fr: "Une application de rencontres amoureuses", en: "A dating app", ar: "تطبيق للمواعدة" } as T },
  ],

  founderTitle: { fr: "La fondatrice", en: "The founder", ar: "المؤسِّسة" } as T,
  founderText: {
    fr: "Après dix ans en France, Aya Snoussi est rentrée à Casablanca avec l'envie de retrouver sa place parmi des gens qui partagent sa culture et son humour. En cherchant la sienne, elle a créé un endroit où chacun peut trouver la sienne. Portrait en haute définition et interview sur demande.",
    en: "After ten years in France, Aya Snoussi moved back to Casablanca wanting to find her place among people who share her culture and her sense of humour. In looking for her own place, she created one where everyone can find theirs. High-resolution portrait and interviews on request.",
    ar: "بعد عشر سنوات في فرنسا، عادت آية السنوسي إلى الدار البيضاء برغبة في إيجاد مكانها بين أناس يشاركونها ثقافتها وروح دعابتها. وفي بحثها عن مكانها، أنشأت مكانًا يجد فيه كل شخص مكانه. صورة عالية الدقة ومقابلة عند الطلب.",
  } as T,
  founderMore: { fr: "Lire son histoire", en: "Read her story", ar: "اقرأ قصتها" } as T,

  logosTitle: { fr: "Logos", en: "Logos", ar: "الشعارات" } as T,
  logosRules: {
    fr: "Zone de protection : la hauteur du « o » tout autour. Taille minimale : 90 px de large à l'écran, 25 mm à l'impression. Ne pas déformer, recolorer, ajouter d'ombre ni poser sur une photo chargée : sur fond foncé, utilisez la version crème.",
    en: "Clear space: the height of the “o” all around. Minimum size: 90 px wide on screen, 25 mm in print. Don't stretch, recolour, add shadows or place on a busy photo: on dark backgrounds, use the cream version.",
    ar: "منطقة الحماية: ارتفاع حرف « o » من كل الجهات. الحجم الأدنى: 90 بكسل عرضًا على الشاشة، و25 ملم في الطباعة. لا تشوّه الشعار ولا تغيّر لونه ولا تضف ظلًا ولا تضعه على صورة مزدحمة: على الخلفيات الداكنة استعمل النسخة الكريمية.",
  } as T,
  logos: [
    { file: "the-host-club-horizontal-prune", label: { fr: "Logotype — prune", en: "Wordmark — plum", ar: "الشعار النصي — برقوقي" } as T, dark: false },
    { file: "the-host-club-horizontal-creme", label: { fr: "Logotype — crème (fond foncé)", en: "Wordmark — cream (dark backgrounds)", ar: "الشعار النصي — كريمي (خلفية داكنة)" } as T, dark: true },
    { file: "the-host-club-horizontal-encre", label: { fr: "Logotype — encre", en: "Wordmark — ink", ar: "الشعار النصي — حبري" } as T, dark: false },
    { file: "the-host-club-empile-prune", label: { fr: "Version empilée — prune", en: "Stacked — plum", ar: "نسخة مكدّسة — برقوقي" } as T, dark: false },
    { file: "the-host-club-empile-creme", label: { fr: "Version empilée — crème", en: "Stacked — cream", ar: "نسخة مكدّسة — كريمي" } as T, dark: true },
    { file: "the-host-club-monogramme", label: { fr: "Monogramme « h. »", en: "Monogram “h.”", ar: "الرمز « h. »" } as T, dark: false },
  ],

  colorsTitle: { fr: "Couleurs", en: "Colours", ar: "الألوان" } as T,
  colors: [
    { hex: "#561A29", name: { fr: "Prune", en: "Plum", ar: "برقوقي" } as T, light: false },
    { hex: "#8E3A4C", name: { fr: "Prune clair", en: "Light plum", ar: "برقوقي فاتح" } as T, light: false },
    { hex: "#F8EFE8", name: { fr: "Crème", en: "Cream", ar: "كريمي" } as T, light: true },
    { hex: "#EEDFD3", name: { fr: "Sable", en: "Sand", ar: "رملي" } as T, light: true },
    { hex: "#2A1D1F", name: { fr: "Encre", en: "Ink", ar: "حبري" } as T, light: false },
  ],
  typeTitle: { fr: "Typographies", en: "Typefaces", ar: "الخطوط" } as T,
  type: {
    fr: "Fraunces (titres), Inter (texte), IBM Plex Sans Arabic (arabe) — polices libres, disponibles sur Google Fonts.",
    en: "Fraunces (headings), Inter (body), IBM Plex Sans Arabic (Arabic) — free typefaces, available on Google Fonts.",
    ar: "Fraunces (العناوين)، Inter (النصوص)، IBM Plex Sans Arabic (العربية) — خطوط مجانية متوفرة على Google Fonts.",
  } as T,

  photosTitle: { fr: "Photos", en: "Photos", ar: "الصور" } as T,
  photos: [
    { file: "photo-marque-places.jpg", alt: { fr: "Croissants servant de marque-places, chacun avec un prénom écrit à la main", en: "Croissants used as place cards, each with a handwritten first name", ar: "خبز كرواسون يُستعمل كبطاقات أماكن، على كل واحدة اسم مكتوب باليد" } as T },
    { file: "photo-table-brunch.jpg", alt: { fr: "Table de brunch dressée, assiettes partagées et marque-places", en: "Brunch table with shared plates and place cards", ar: "طاولة فطور متأخر بأطباق مشتركة وبطاقات أماكن" } as T },
  ],
  photosNote: {
    fr: "Crédit : « The Host Club ». Usage éditorial uniquement. Les photos où des participants sont reconnaissables sont fournies sur demande, après leur accord.",
    en: "Credit: “The Host Club”. Editorial use only. Photos in which participants can be recognised are available on request, once they have agreed.",
    ar: "الحقوق: « The Host Club ». للاستعمال الصحفي فقط. الصور التي يظهر فيها مشاركون يمكن التعرف عليهم تُقدَّم عند الطلب، بعد موافقتهم.",
  } as T,
  download: { fr: "Télécharger", en: "Download", ar: "تحميل" } as T,

  contactTitle: { fr: "Contact presse", en: "Press contact", ar: "التواصل الصحفي" } as T,
  contactText: {
    fr: "Une question, une interview, une visite lors d'une expérience ? Écrivez-nous en précisant « Presse » : nous répondons rapidement.",
    en: "A question, an interview, a visit during an experience? Write to us and mention “Press”: we reply quickly.",
    ar: "سؤال، مقابلة، أو زيارة خلال إحدى التجارب؟ راسلنا مع ذكر « صحافة »: نرد بسرعة.",
  } as T,
  contactCta: { fr: "Écrire à l'équipe", en: "Write to the team", ar: "راسل الفريق" } as T,
  instagram: { fr: "Instagram d'Aya", en: "Aya's Instagram", ar: "إنستغرام آية" } as T,
};
