/**
 * Blog « Inconnus aujourd'hui, amis demain » (8c) — articles rédigés par nous.
 * Français : référence. Anglais : traduction. Arabe : content/blog-ar.ts (fusionné ci-dessous).
 * Blocs : paragraphe (texte), liste (tableau), { h } intertitre, { ol } liste numérotée, { tip } encadré.
 * Liens internes : [texte](/chemin).
 */

import { BLOG_ARTICLES_AR, BLOG_CATEGORIES_AR, CITY_GUIDE_FAQ_AR } from "./blog-ar";

export type BlogCategoryKey = "city-guide" | "conversation" | "amitie" | "the-host-club";
type LRaw = { fr: string; en: string };
type L = { fr: string; en: string; ar: string };
export type BlogBlock = string | string[] | { h: string } | { ol: string[] } | { tip: string };
type BlogArticleRaw = {
  slug: string;
  category: BlogCategoryKey;
  title: LRaw;
  excerpt: LRaw;
  minutes: number;
  date: string;
  cover: string;
  /** Cadrage de la photo de couverture quand le sujet n'est pas au centre (classe Tailwind object-…). */
  coverPosition?: string;
  body: { fr: BlogBlock[]; en: BlogBlock[] };
};
export type BlogLang = "fr" | "en" | "ar";
export type BlogArticle = Omit<BlogArticleRaw, "title" | "excerpt" | "body"> & { title: L; excerpt: L; body: Record<BlogLang, BlogBlock[]> };
type BlogCategoryRaw = { key: BlogCategoryKey; title: LRaw; description: LRaw };
export type BlogCategory = { key: BlogCategoryKey; title: L; description: L };

const BLOG_CATEGORIES_RAW: BlogCategoryRaw[] = [
  { key: "city-guide", title: { fr: "City guide", en: "City guide" }, description: { fr: "Casablanca autrement : où aller, quoi faire, comment y rencontrer du monde.", en: "Casablanca differently: where to go, what to do, how to meet people there." } },
  { key: "conversation", title: { fr: "Conversation", en: "Conversation" }, description: { fr: "Des questions et des conseils pour lancer, nourrir et apaiser une discussion.", en: "Questions and tips to start, deepen and calm a conversation." } },
  { key: "amitie", title: { fr: "Amitié", en: "Friendship" }, description: { fr: "Se faire des amis à l'âge adulte, sans pression et pour de vrai.", en: "Making friends as an adult, without pressure and for real." } },
  { key: "the-host-club", title: { fr: "Comment fonctionne The Host Club", en: "How The Host Club works" }, description: { fr: "Tout savoir avant votre première expérience.", en: "Everything to know before your first experience." } },
];

/** FAQ affichée en bas de l'onglet City guide. */
const CITY_GUIDE_FAQ_RAW: { q: LRaw; a: LRaw }[] = [
  {
    q: { fr: "Où sortir seul à Casablanca sans se sentir seul ?", en: "Where can you go out alone in Casablanca without feeling lonely?" },
    a: { fr: "Les activités en petit groupe sont idéales : cours de sport collectifs, ateliers créatifs, jeux, dîners organisés. Le cadre crée la conversation à votre place. C'est exactement ce que proposent les expériences The Host Club.", en: "Small-group activities are ideal: group fitness classes, creative workshops, games, organised dinners. The setting starts the conversation for you. That's exactly what The Host Club experiences offer." },
  },
  {
    q: { fr: "Faut-il parler arabe pour rencontrer du monde ?", en: "Do you need to speak Arabic to meet people?" },
    a: { fr: "Non. À Casablanca, le français, la darija et de plus en plus l'anglais se croisent. Chez nous, chaque expérience indique ses langues et vous pouvez choisir celles que vous aimeriez parler à table.", en: "No. In Casablanca, French, Darija and increasingly English mix. With us, each experience lists its languages and you can choose the ones you'd like to speak at the table." },
  },
  {
    q: { fr: "Quel est le meilleur moment pour rencontrer de nouvelles personnes ?", en: "When is the best time to meet new people?" },
    a: { fr: "Les débuts de soirée en semaine et les week-ends en journée (brunchs, sport, balades) sont propices : on est plus disponible et moins pressé.", en: "Weekday early evenings and weekend daytimes (brunches, sport, walks) work well: people are more available and less rushed." },
  },
  {
    q: { fr: "Comment se déplacer pour une sortie ?", en: "How do you get around for an outing?" },
    a: { fr: "Le tramway relie de nombreux quartiers ; les petits taxis rouges et les applications de VTC complètent. Prévoyez votre retour avant de partir, surtout le soir.", en: "The tram links many neighbourhoods; red petit taxis and ride-hailing apps fill the gaps. Plan your way home before you leave, especially at night." },
  },
  {
    q: { fr: "Les expériences ont-elles lieu dans des lieux sûrs ?", en: "Do experiences take place in safe places?" },
    a: { fr: "Oui : toujours dans des lieux publics ou chez des partenaires sélectionnés, jamais chez un participant. Voir notre page [Sécurité](/securite).", en: "Yes: always in public places or at selected partner venues, never at a participant's home. See our [Safety](/securite) page." },
  },
];

const D = "2026-11-08";

const BLOG_ARTICLES_RAW: BlogArticleRaw[] = [
  // ——— City guide ———
  {
    slug: "que-faire-a-casablanca",
    category: "city-guide",
    title: { fr: "25 idées pour (re)découvrir Casablanca", en: "25 ideas to (re)discover Casablanca" },
    excerpt: { fr: "Patrimoine, bord de mer, marchés, art, nature : de quoi remplir vos week-ends, seul ou accompagné.", en: "Heritage, seafront, markets, art, nature: plenty to fill your weekends, alone or with others." },
    minutes: 6,
    date: D,
    cover: "/images/photos/univers-sorties-soiree.webp",
    coverPosition: "object-[50%_12%]",
    body: {
      fr: [
        "On croit connaître sa ville, puis on réalise qu'on fait toujours les mêmes trajets. Voici 25 idées pour sortir de vos habitudes à Casablanca, que vous y soyez né ou arrivé le mois dernier.",
        { h: "Patrimoine et architecture" },
        { ol: [
          "Visiter la mosquée Hassan II, l'une des rares mosquées du pays ouvertes aux visites guidées.",
          "Lever les yeux boulevard Mohammed V : façades Art déco, balcons, détails sculptés.",
          "Flâner dans le quartier des Habous, ses arcades, ses librairies et ses pâtisseries.",
          "Se perdre dans l'ancienne médina, côté port.",
          "Entrer dans l'ancienne cathédrale du Sacré-Cœur, devenue lieu culturel.",
        ] },
        { h: "Bord de mer" },
        { ol: [
          "Marcher sur la corniche d'Aïn Diab au coucher du soleil.",
          "Prendre un café face à l'océan et regarder les surfeurs.",
          "Pousser jusqu'aux plages de Dar Bouazza le week-end.",
          "Aller voir le phare d'El Hank.",
          "Faire un tour à la Marina, côté promenade.",
        ] },
        { h: "Art et culture" },
        { ol: [
          "Voir une exposition à la Villa des Arts.",
          "Découvrir le musée Abderrahmane Slaoui et ses affiches anciennes.",
          "Visiter le musée du Judaïsme marocain, à l'Oasis.",
          "Assister à une séance dans un cinéma historique du centre-ville.",
          "Guetter les vernissages et les concerts des galeries et lieux culturels.",
        ] },
        { h: "Marchés et saveurs" },
        { ol: [
          "Faire le tour du Marché central le matin et goûter les produits de la mer.",
          "Tester une adresse de street food que vous ne connaissez pas.",
          "Prendre un brunch dans un quartier où vous n'allez jamais.",
          "Apprendre à cuisiner un plat marocain lors d'un atelier.",
          "Partager un dîner avec des inconnus : la meilleure façon de découvrir des adresses… et des personnes.",
        ] },
        { h: "Nature et sport" },
        { ol: [
          "Courir ou marcher au parc de la Ligue arabe.",
          "Respirer en forêt de Bouskoura.",
          "Essayer un cours de pilates, de yoga ou de boxe en groupe.",
          "Prendre une leçon de surf.",
          "Rejoindre une sortie à vélo ou une randonnée urbaine.",
        ] },
        { tip: "Le plus simple pour sortir de sa routine ? Ne pas y aller seul. Nos [expériences](/experiences) vous réservent une place dans un petit groupe, sur place, sans rien organiser." },
      ],
      en: [
        "We think we know our city, then realise we always take the same routes. Here are 25 ideas to break your habits in Casablanca, whether you were born here or arrived last month.",
        { h: "Heritage and architecture" },
        { ol: [
          "Visit the Hassan II Mosque, one of the few mosques in the country open to guided tours.",
          "Look up along Boulevard Mohammed V: Art Deco façades, balconies, carved details.",
          "Stroll through the Habous quarter, its arcades, bookshops and pastry shops.",
          "Get lost in the old medina, near the port.",
          "Step into the former Sacré-Cœur cathedral, now a cultural venue.",
        ] },
        { h: "Seafront" },
        { ol: [
          "Walk the Aïn Diab corniche at sunset.",
          "Have a coffee facing the ocean and watch the surfers.",
          "Head out to the Dar Bouazza beaches at the weekend.",
          "Go and see the El Hank lighthouse.",
          "Take a stroll along the Marina promenade.",
        ] },
        { h: "Art and culture" },
        { ol: [
          "See an exhibition at the Villa des Arts.",
          "Discover the Abderrahmane Slaoui museum and its vintage posters.",
          "Visit the Museum of Moroccan Judaism in the Oasis district.",
          "Catch a film in one of the historic downtown cinemas.",
          "Keep an eye out for gallery openings and concerts.",
        ] },
        { h: "Markets and flavours" },
        { ol: [
          "Walk around the Central Market in the morning and taste the seafood.",
          "Try a street-food spot you don't know.",
          "Have brunch in a neighbourhood you never go to.",
          "Learn to cook a Moroccan dish in a workshop.",
          "Share dinner with strangers: the best way to discover places… and people.",
        ] },
        { h: "Nature and sport" },
        { ol: [
          "Run or walk in the Arab League Park.",
          "Breathe in the Bouskoura forest.",
          "Try a group pilates, yoga or boxing class.",
          "Take a surf lesson.",
          "Join a bike ride or an urban hike.",
        ] },
        { tip: "The easiest way out of your routine? Don't go alone. Our [experiences](/experiences) save you a seat in a small group, ready to go, with nothing to organise." },
      ],
    },
  },
  {
    slug: "se-faire-des-amis-a-casablanca",
    category: "city-guide",
    title: { fr: "Se faire des amis à Casablanca : le guide pratique", en: "Making friends in Casablanca: a practical guide" },
    excerpt: { fr: "Nouveau en ville, de retour après des années à l'étranger ou simplement envie d'élargir votre cercle ? Par où commencer.", en: "New in town, back after years abroad or simply keen to widen your circle? Where to start." },
    minutes: 5,
    date: D,
    cover: "/images/photos/comment-groupe-2.webp",
    body: {
      fr: [
        "Casablanca est une ville immense, active, où chacun court. On peut y vivre entouré de monde et se sentir seul. Bonne nouvelle : se faire des amis y est tout à fait possible, à condition de s'y prendre un peu différemment.",
        { h: "1. Choisissez la régularité plutôt que l'intensité" },
        "Les amitiés naissent de la répétition : revoir les mêmes visages crée la confiance. Un cours hebdomadaire, un club, un rendez-vous mensuel valent mieux qu'une grande soirée isolée.",
        { h: "2. Misez sur les activités, pas sur les présentations" },
        "Il est plus facile de parler en faisant quelque chose ensemble : cuisiner, jouer, peindre, marcher. L'activité donne un sujet de conversation et enlève la pression.",
        { h: "3. Sortez de votre quartier" },
        "Gauthier, Maarif, Anfa, Aïn Diab, le centre-ville : chaque quartier a ses lieux et ses communautés. Changer de décor, c'est aussi changer de rencontres.",
        { h: "4. Parlez les langues de la ville" },
        "Quelques mots de darija ouvrent beaucoup de portes, même si le français et l'anglais suffisent souvent. Montrer que l'on fait l'effort est toujours apprécié.",
        { h: "5. Faites le premier pas… et le deuxième" },
        "Après une belle rencontre, proposez de vous revoir. La plupart des gens attendent que l'autre se lance. Une invitation simple — un café, une activité — suffit.",
        { tip: "Pas le temps d'organiser ? C'est notre métier : [réservez une place](/experiences), nous composons un petit groupe avec qui la conversation a toutes les chances de prendre." },
      ],
      en: [
        "Casablanca is a huge, busy city where everyone is in a hurry. You can live surrounded by people and still feel alone. The good news: making friends here is entirely possible, if you go about it a little differently.",
        { h: "1. Choose regularity over intensity" },
        "Friendships grow from repetition: seeing the same faces builds trust. A weekly class, a club or a monthly meetup beats one big isolated party.",
        { h: "2. Bet on activities, not introductions" },
        "It's easier to talk while doing something together: cooking, playing, painting, walking. The activity gives you a topic and takes the pressure off.",
        { h: "3. Leave your neighbourhood" },
        "Gauthier, Maarif, Anfa, Aïn Diab, downtown: each area has its own places and communities. A change of scene means new encounters.",
        { h: "4. Speak the city's languages" },
        "A few words of Darija open many doors, even if French and English are often enough. Making the effort is always appreciated.",
        { h: "5. Make the first move… and the second" },
        "After a good encounter, suggest meeting again. Most people wait for the other person to go first. A simple invitation — a coffee, an activity — is enough.",
        { tip: "No time to organise? That's our job: [book a seat](/experiences) and we'll put together a small group where the conversation has every chance of flowing." },
      ],
    },
  },
  {
    slug: "sortir-seul-a-casablanca",
    category: "city-guide",
    title: { fr: "Sortir seul à Casablanca : nos idées pour oser", en: "Going out alone in Casablanca: ideas to take the plunge" },
    excerpt: { fr: "Aller seul à une activité peut intimider. Voici comment rendre l'expérience simple, agréable et sûre.", en: "Going to an activity alone can feel intimidating. Here's how to make it simple, enjoyable and safe." },
    minutes: 4,
    date: D,
    cover: "/images/photos/galerie-02.webp",
    body: {
      fr: [
        "Sortir seul, ce n'est pas être seul : c'est se rendre disponible pour les rencontres. Encore faut-il choisir les bons formats.",
        { h: "Les formats qui facilitent tout" },
        [
          "Les cours collectifs (sport, cuisine, poterie) : tout le monde arrive seul et le professeur fait le lien.",
          "Les jeux en équipe (escape game, quiz) : on est obligé de coopérer, donc de parler.",
          "Les dîners organisés en petit groupe : la table est composée pour que chacun trouve sa place.",
          "Les balades et visites guidées : on marche côte à côte, la conversation vient naturellement.",
        ],
        { h: "Nos conseils pour se sentir à l'aise" },
        [
          "Arrivez quelques minutes en avance : il est plus facile d'accueillir les autres que d'entrer dans un groupe déjà formé.",
          "Préparez deux ou trois questions ouvertes (« Qu'est-ce qui vous a amené ici ? »).",
          "Prévenez un proche de votre sortie et prévoyez votre retour.",
          "Autorisez-vous à partir quand vous le souhaitez : rien n'est obligatoire.",
        ],
        { tip: "La majorité de nos membres viennent seuls. Lisez notre guide [Réserver sa première expérience](/blog/reserver-sa-premiere-experience) pour savoir à quoi vous attendre." },
      ],
      en: [
        "Going out alone doesn't mean being alone: it means making yourself available to meet people. You just need to pick the right formats.",
        { h: "Formats that make it easy" },
        [
          "Group classes (sport, cooking, pottery): everyone arrives alone and the instructor connects people.",
          "Team games (escape rooms, quizzes): you have to cooperate, so you have to talk.",
          "Organised small-group dinners: the table is put together so everyone finds their place.",
          "Walks and guided tours: you walk side by side and conversation comes naturally.",
        ],
        { h: "Tips to feel at ease" },
        [
          "Arrive a few minutes early: it's easier to welcome others than to join a group that has already formed.",
          "Prepare two or three open questions (“What brought you here?”).",
          "Tell someone close about your plans and plan your way home.",
          "Give yourself permission to leave whenever you want: nothing is compulsory.",
        ],
        { tip: "Most of our members come alone. Read our guide [Booking your first experience](/blog/reserver-sa-premiere-experience) to know what to expect." },
      ],
    },
  },
  // ——— Conversation ———
  {
    slug: "questions-pour-lancer-une-conversation",
    category: "conversation",
    title: { fr: "30 questions pour lancer une conversation", en: "30 questions to start a conversation" },
    excerpt: { fr: "Fini les silences gênés : des questions simples, ouvertes et sans risque pour démarrer avec n'importe qui.", en: "No more awkward silences: simple, open, low-risk questions to get going with anyone." },
    minutes: 5,
    date: D,
    cover: "/images/photos/galerie-01.webp",
    body: {
      fr: [
        "La meilleure question n'est pas la plus originale : c'est celle qui invite l'autre à raconter. Privilégiez les questions ouvertes (qui ne se répondent pas par oui ou non) et rebondissez sur les réponses.",
        { h: "Pour démarrer en douceur" },
        { ol: ["Qu'est-ce qui vous a amené ici ce soir ?", "Vous connaissez déjà le lieu ?", "Comment s'est passée votre journée ?", "Vous habitez dans le quartier ?", "Vous êtes plutôt du matin ou du soir ?", "Qu'est-ce que vous faites quand vous ne travaillez pas ?"] },
        { h: "Sur la ville" },
        { ol: ["Votre adresse préférée à Casablanca ?", "Un endroit que vous rêvez de faire découvrir à quelqu'un ?", "Le meilleur plat que vous ayez mangé récemment ?", "Si vous deviez quitter la ville un week-end, où iriez-vous ?", "Qu'est-ce qui a le plus changé dans la ville ces dernières années ?", "Un quartier que vous connaissez mal mais qui vous intrigue ?"] },
        { h: "Sur les passions" },
        { ol: ["Qu'est-ce qui vous passionne en ce moment ?", "Un livre, un film ou une série que vous recommandez toujours ?", "Une activité que vous aimeriez essayer cette année ?", "Quel talent aimeriez-vous avoir ?", "La dernière chose que vous avez apprise pour le plaisir ?", "Un sport que vous pratiquez ou que vous aimeriez reprendre ?"] },
        { h: "Pour aller un peu plus loin" },
        { ol: ["Qu'est-ce qui rend une journée réussie pour vous ?", "Un voyage qui vous a marqué ?", "Une personne qui vous a beaucoup appris ?", "Quel conseil donneriez-vous à vous-même il y a dix ans ?", "Qu'est-ce qui vous fait rire à coup sûr ?", "Un projet qui vous tient à cœur ?"] },
        { h: "Pour finir sur une bonne note" },
        { ol: ["Qu'est-ce que vous avez préféré ce soir ?", "On se refait ça ?", "Vous avez une adresse à me recommander ?", "Qu'est-ce que vous faites ce week-end ?", "Vous êtes sur quel projet la semaine prochaine ?", "Ça vous dirait d'essayer une autre expérience ensemble ?"] },
        { tip: "Astuce : la question compte moins que l'écoute qui suit. Lisez aussi [Comment devenir quelqu'un qui écoute vraiment](/blog/bien-ecouter)." },
      ],
      en: [
        "The best question isn't the most original one: it's the one that invites the other person to tell a story. Prefer open questions (not answerable by yes or no) and build on the answers.",
        { h: "To start gently" },
        { ol: ["What brought you here tonight?", "Have you been to this place before?", "How was your day?", "Do you live around here?", "Are you more of a morning or an evening person?", "What do you do when you're not working?"] },
        { h: "About the city" },
        { ol: ["Your favourite spot in Casablanca?", "A place you'd love to show someone?", "The best dish you've eaten recently?", "If you had to leave town for a weekend, where would you go?", "What has changed most in the city in recent years?", "A neighbourhood you barely know but that intrigues you?"] },
        { h: "About passions" },
        { ol: ["What are you passionate about right now?", "A book, film or series you always recommend?", "An activity you'd like to try this year?", "What talent would you love to have?", "The last thing you learned just for fun?", "A sport you play or would like to take up again?"] },
        { h: "To go a little deeper" },
        { ol: ["What makes a good day for you?", "A trip that stayed with you?", "Someone who taught you a lot?", "What advice would you give yourself ten years ago?", "What always makes you laugh?", "A project close to your heart?"] },
        { h: "To end on a good note" },
        { ol: ["What did you enjoy most tonight?", "Shall we do this again?", "Any place you'd recommend?", "What are you up to this weekend?", "What are you working on next week?", "Fancy trying another experience together?"] },
        { tip: "Tip: the question matters less than the listening that follows. Also read [How to become a really good listener](/blog/bien-ecouter)." },
      ],
    },
  },
  {
    slug: "questions-pour-briser-la-glace",
    category: "conversation",
    title: { fr: "20 questions pour briser la glace, en toute situation", en: "20 icebreaker questions for any situation" },
    excerpt: { fr: "Au travail, à table, en atelier ou en équipe : des questions légères pour détendre l'atmosphère.", en: "At work, at the table, in a workshop or a team: light questions to relax the mood." },
    minutes: 4,
    date: D,
    cover: "/images/photos/univers-jeux-vinyles.webp",
    body: {
      fr: [
        "Une bonne question pour briser la glace est légère, inclusive et amusante. Elle permet à chacun de répondre sans se sentir exposé.",
        { h: "À table" },
        { ol: ["Le plat que vous pourriez manger tous les jours ?", "Le dîner idéal : avec qui, où ?", "Sucré ou salé au petit-déjeuner ?", "La recette de famille que vous aimeriez apprendre ?", "Le meilleur repas de votre vie ?"] },
        { h: "En atelier ou en cours" },
        { ol: ["Vous aviez déjà essayé avant ?", "Qu'est-ce qui vous a donné envie de venir ?", "Plutôt patient ou plutôt fonceur ?", "Votre dernier « fait main » réussi… ou raté ?", "Ce que vous aimeriez savoir faire dans un an ?"] },
        { h: "En équipe ou en jeu" },
        { ol: ["Votre super-pouvoir dans une équipe ?", "Le jeu de société de votre enfance ?", "Plutôt stratège ou improvisateur ?", "Le défi le plus fou que vous ayez relevé ?", "Si on gagne, on fête ça comment ?"] },
        { h: "Partout" },
        { ol: ["Une petite chose qui a illuminé votre semaine ?", "La chanson que vous écoutez en boucle ?", "Votre lieu préféré pour réfléchir ?", "Un talent caché ?", "La meilleure découverte de votre année ?"] },
        { tip: "Nos hôtes utilisent des questions de ce type pour lancer les tables. À vous de jouer : [découvrir les expériences](/experiences)." },
      ],
      en: [
        "A good icebreaker is light, inclusive and fun. It lets everyone answer without feeling exposed.",
        { h: "At the table" },
        { ol: ["The dish you could eat every day?", "The ideal dinner: with whom, where?", "Sweet or savoury for breakfast?", "The family recipe you'd love to learn?", "The best meal of your life?"] },
        { h: "In a workshop or class" },
        { ol: ["Had you tried this before?", "What made you want to come?", "Patient or more of a go-getter?", "Your last handmade success… or fail?", "What would you like to be able to do in a year?"] },
        { h: "In a team or a game" },
        { ol: ["Your superpower in a team?", "The board game of your childhood?", "Strategist or improviser?", "The craziest challenge you've taken on?", "If we win, how do we celebrate?"] },
        { h: "Anywhere" },
        { ol: ["A small thing that brightened your week?", "The song you have on repeat?", "Your favourite place to think?", "A hidden talent?", "Your best discovery this year?"] },
        { tip: "Our hosts use questions like these to get tables talking. Your turn: [discover experiences](/experiences)." },
      ],
    },
  },
  {
    slug: "questions-pour-connaitre-quelqu-un",
    category: "conversation",
    title: { fr: "La liste de questions pour vraiment connaître quelqu'un", en: "The list of questions to really get to know someone" },
    excerpt: { fr: "Des questions plus profondes, à poser quand la confiance s'installe.", en: "Deeper questions, to ask once trust starts to build." },
    minutes: 5,
    date: D,
    cover: "/images/photos/comment-groupe-3.webp",
    body: {
      fr: [
        "Passer de la conversation polie à une vraie discussion demande du temps et de la réciprocité : répondez vous aussi aux questions que vous posez. Allez-y par étapes et respectez les silences.",
        { h: "Les valeurs" },
        ["Qu'est-ce qui compte le plus pour vous en ce moment ?", "De quoi êtes-vous le plus fier ?", "Qu'est-ce qui vous met en colère à coup sûr ?", "Une conviction qui a changé avec le temps ?"],
        { h: "Le parcours" },
        ["Un moment qui a changé le cours de votre vie ?", "Qui vous a le plus influencé ?", "Une décision difficile que vous ne regrettez pas ?", "Qu'est-ce que vous auriez aimé savoir plus tôt ?"],
        { h: "Les envies" },
        ["Un rêve que vous n'avez encore jamais dit à voix haute ?", "Où vous voyez-vous dans cinq ans ?", "Qu'est-ce que vous aimeriez apprendre si vous aviez tout le temps du monde ?", "La vie idéale, à quoi ressemblerait-elle un mardi ?"],
        { h: "Les relations" },
        ["Qu'est-ce qui fait un bon ami selon vous ?", "Comment aimez-vous qu'on vous montre qu'on tient à vous ?", "Une amitié qui a compté et pourquoi ?", "Qu'est-ce que les gens comprennent souvent mal chez vous ?"],
        { tip: "Respectez les limites de chacun : une question peut rester sans réponse. La confiance se construit, elle ne se force pas." },
      ],
      en: [
        "Moving from polite chat to a real conversation takes time and reciprocity: answer the questions you ask, too. Go step by step and respect silences.",
        { h: "Values" },
        ["What matters most to you right now?", "What are you proudest of?", "What always makes you angry?", "A belief that has changed over time?"],
        { h: "Life story" },
        ["A moment that changed the course of your life?", "Who influenced you the most?", "A hard decision you don't regret?", "What do you wish you'd known sooner?"],
        { h: "Dreams" },
        ["A dream you've never said out loud?", "Where do you see yourself in five years?", "What would you learn if you had all the time in the world?", "What would an ideal Tuesday look like?"],
        { h: "Relationships" },
        ["What makes a good friend, for you?", "How do you like people to show they care?", "A friendship that mattered, and why?", "What do people often misunderstand about you?"],
        { tip: "Respect everyone's boundaries: a question can go unanswered. Trust is built, never forced." },
      ],
    },
  },
  {
    slug: "bien-ecouter",
    category: "conversation",
    title: { fr: "Comment devenir quelqu'un qui écoute vraiment", en: "How to become a really good listener" },
    excerpt: { fr: "Écouter, ce n'est pas attendre son tour de parler. Six habitudes simples qui changent tout.", en: "Listening isn't waiting for your turn to talk. Six simple habits that change everything." },
    minutes: 4,
    date: D,
    cover: "/images/photos/univers-diners.webp",
    body: {
      fr: [
        "On se souvient rarement de ce que les gens nous ont dit, mais toujours de ce qu'on a ressenti à leurs côtés. Bien écouter, c'est la compétence sociale la plus sous-estimée.",
        { ol: [
          "Posez votre téléphone. Hors de vue, pas seulement à l'envers.",
          "Laissez finir. Résistez à l'envie de compléter les phrases ou d'enchaîner sur votre propre histoire.",
          "Reformulez. « Si je comprends bien, tu… » montre que vous avez suivi et permet de corriger un malentendu.",
          "Posez une question de plus. « Et ensuite ? », « Qu'est-ce que tu as ressenti ? » invitent à aller plus loin.",
          "Acceptez les silences. Quelques secondes de pause laissent à l'autre le temps de penser.",
          "Retenez un détail. Le reprendre plus tard (« Alors, ce voyage ? ») vaut tous les compliments.",
        ] },
        { tip: "À table, l'écoute se partage : veillez aussi à ce que chacun ait la parole, en particulier les personnes qui arrivent seules." },
      ],
      en: [
        "We rarely remember what people told us, but we always remember how we felt around them. Good listening is the most underrated social skill.",
        { ol: [
          "Put your phone away. Out of sight, not just face down.",
          "Let people finish. Resist the urge to complete their sentences or jump to your own story.",
          "Reflect back. “So if I understand, you…” shows you followed and clears up misunderstandings.",
          "Ask one more question. “And then?” or “How did that feel?” invites people to go further.",
          "Accept silences. A few seconds' pause gives the other person time to think.",
          "Remember a detail. Bringing it up later (“So, that trip?”) beats any compliment.",
        ] },
        { tip: "At the table, listening is shared: make sure everyone gets a turn, especially people who came alone." },
      ],
    },
  },
  {
    slug: "apaiser-une-discussion-tendue",
    category: "conversation",
    title: { fr: "7 conseils pour apaiser une discussion tendue", en: "7 tips to calm a tense discussion" },
    excerpt: { fr: "Un sujet qui fâche, un ton qui monte : comment garder le lien sans renoncer à ses idées.", en: "A touchy subject, rising voices: how to keep the connection without giving up your views." },
    minutes: 4,
    date: D,
    cover: "/images/photos/galerie-06.webp",
    body: {
      fr: [
        "Les désaccords font partie des belles conversations. Ce qui les rend difficiles, c'est rarement le sujet : c'est le sentiment de ne pas être entendu.",
        { ol: [
          "Ralentissez. Parlez plus bas et plus lentement : le calme est contagieux.",
          "Cherchez ce qui vous rassemble. « On veut tous les deux que… » remet la discussion sur un terrain commun.",
          "Parlez de vous. « Je ne suis pas d'accord » passe mieux que « Tu as tort ».",
          "Posez une vraie question. « Qu'est-ce qui t'a amené à penser ça ? » transforme le débat en échange.",
          "Reconnaissez un point juste. Concéder un argument n'est pas perdre : c'est montrer que l'on écoute.",
          "Proposez une pause. Changer de sujet ou reprendre plus tard est parfois la meilleure solution.",
          "Préservez la personne. On peut critiquer une idée sans jamais attaquer celui ou celle qui la porte.",
        ] },
        { tip: "Lors de nos expériences, nos [règles de la communauté](/charte) s'appliquent : respect de chacun, aucun propos blessant." },
      ],
      en: [
        "Disagreements are part of great conversations. What makes them hard is rarely the topic: it's the feeling of not being heard.",
        { ol: [
          "Slow down. Speak more quietly and slowly: calm is contagious.",
          "Look for common ground. “We both want…” brings the discussion back to shared territory.",
          "Talk about yourself. “I don't agree” lands better than “You're wrong”.",
          "Ask a real question. “What made you think that?” turns a debate into an exchange.",
          "Acknowledge a fair point. Conceding an argument isn't losing: it shows you're listening.",
          "Suggest a break. Changing the subject or coming back to it later is sometimes the best solution.",
          "Protect the person. You can criticise an idea without ever attacking the person behind it.",
        ] },
        { tip: "At our experiences, our [community rules](/charte) apply: respect for everyone, no hurtful remarks." },
      ],
    },
  },
  // ——— Amitié ———
  {
    slug: "se-faire-des-amis-adulte",
    category: "amitie",
    title: { fr: "Comment se faire des amis à l'âge adulte", en: "How to make friends as an adult" },
    excerpt: { fr: "Après l'école et l'université, les occasions se font rares. Voici comment en recréer.", en: "After school and university, opportunities become rare. Here's how to create new ones." },
    minutes: 5,
    date: D,
    cover: "/images/photos/galerie-05.webp",
    body: {
      fr: [
        "Enfant, on se fait des amis presque sans effort : on voit les mêmes personnes tous les jours, sans enjeu, pendant des années. Adulte, ces trois ingrédients — proximité, répétition, temps libre partagé — disparaissent. Il faut donc les recréer volontairement.",
        { h: "Recréer la proximité" },
        "Choisissez des activités près de chez vous ou de votre travail, faciles à intégrer à votre semaine. Plus c'est simple, plus vous y retournerez.",
        { h: "Recréer la répétition" },
        "Revenir au même endroit, au même rythme, permet de reconnaître et d'être reconnu. C'est souvent à la troisième rencontre que la conversation devient naturelle.",
        { h: "Recréer le temps partagé" },
        "Une activité commune — cuisiner, jouer, apprendre — crée des souvenirs. Les amitiés se construisent autour de « tu te souviens quand… ».",
        { h: "Accepter que ça prenne du temps" },
        "Passer de connaissance à ami demande des dizaines d'heures passées ensemble. Ce n'est pas un échec si la première soirée ne débouche pas sur une amitié : c'est une étape.",
        { tip: "Revenir, c'est la clé. Avec l'[abonnement](/abonnement), vous bénéficiez de prix membres pour participer plus souvent." },
      ],
      en: [
        "As children, we make friends almost effortlessly: we see the same people every day, with nothing at stake, for years. As adults, those three ingredients — proximity, repetition, shared free time — disappear. So we have to recreate them on purpose.",
        { h: "Recreate proximity" },
        "Pick activities near home or work, easy to fit into your week. The simpler it is, the more often you'll go back.",
        { h: "Recreate repetition" },
        "Returning to the same place at the same rhythm lets you recognise people and be recognised. It's often at the third meeting that conversation feels natural.",
        { h: "Recreate shared time" },
        "A shared activity — cooking, playing, learning — creates memories. Friendships are built on “remember when…”.",
        { h: "Accept that it takes time" },
        "Going from acquaintance to friend takes dozens of hours together. It's not a failure if the first evening doesn't lead to a friendship: it's a step.",
        { tip: "Coming back is the key. With [membership](/abonnement), you get member prices so you can join more often." },
      ],
    },
  },
  {
    slug: "pas-d-amis-repartir-de-zero",
    category: "amitie",
    title: { fr: "Pas d'amis ? Un guide pour repartir de zéro", en: "No friends? A guide to starting from scratch" },
    excerpt: { fr: "Déménagement, rupture, changement de vie : il arrive à tout le monde de se retrouver seul. Comment rebondir, pas à pas.", en: "Moving, a break-up, a life change: it happens to everyone. How to bounce back, step by step." },
    minutes: 5,
    date: D,
    cover: "/images/photos/galerie-08.webp",
    body: {
      fr: [
        "Se retrouver sans cercle d'amis est bien plus courant qu'on ne le croit — et ça n'a rien de honteux. C'est souvent le signe d'une transition : nouvelle ville, nouveau travail, nouvelle étape de vie.",
        { h: "Étape 1 — Soyez indulgent avec vous-même" },
        "La solitude n'est pas un défaut de personnalité. Remplacez « personne ne veut de moi » par « je n'ai pas encore trouvé mes personnes ».",
        { h: "Étape 2 — Commencez petit" },
        "Une sortie par semaine suffit. L'objectif n'est pas de devenir l'âme de la soirée, mais de vous exposer régulièrement à de nouvelles rencontres.",
        { h: "Étape 3 — Choisissez les bons contextes" },
        "Les petits groupes valent mieux que les grandes foules : on y parle vraiment. Les activités structurées (atelier, dîner, jeu) évitent d'avoir à « se vendre ».",
        { h: "Étape 4 — Relancez" },
        "Après une rencontre agréable, osez un message ou une invitation. C'est inconfortable une fois, puis de plus en plus naturel.",
        { h: "Étape 5 — Entretenez" },
        "Une amitié se nourrit : un message, une nouvelle sortie, une attention. La régularité compte plus que l'intensité.",
        { tip: "Si la solitude pèse lourd au quotidien, parler à un professionnel de santé peut aussi aider. Vous n'avez pas à tout porter seul." },
      ],
      en: [
        "Finding yourself without a circle of friends is far more common than people think — and there's nothing shameful about it. It's often a sign of transition: a new city, a new job, a new stage of life.",
        { h: "Step 1 — Be kind to yourself" },
        "Loneliness isn't a personality flaw. Swap “nobody wants me around” for “I haven't found my people yet”.",
        { h: "Step 2 — Start small" },
        "One outing a week is enough. The goal isn't to become the life of the party, but to regularly expose yourself to new encounters.",
        { h: "Step 3 — Pick the right settings" },
        "Small groups beat big crowds: you actually talk. Structured activities (workshop, dinner, game) spare you from having to “sell yourself”.",
        { h: "Step 4 — Follow up" },
        "After a nice encounter, dare to send a message or an invitation. It's uncomfortable once, then more and more natural.",
        { h: "Step 5 — Nurture" },
        "A friendship needs feeding: a message, another outing, a small gesture. Regularity matters more than intensity.",
        { tip: "If loneliness weighs heavily day to day, talking to a health professional can also help. You don't have to carry it all alone." },
      ],
    },
  },
  {
    slug: "se-faire-des-amis-est-ce-difficile",
    category: "amitie",
    title: { fr: "Se faire des amis, est-ce vraiment si difficile ?", en: "Is making friends really that hard?" },
    excerpt: { fr: "Pourquoi on a l'impression que c'est compliqué… et pourquoi c'est souvent plus simple qu'on ne le pense.", en: "Why it feels complicated… and why it's often simpler than we think." },
    minutes: 4,
    date: D,
    cover: "/images/photos/galerie-07.webp",
    body: {
      fr: [
        "Beaucoup d'adultes trouvent difficile de se faire des amis. Pourtant, la plupart d'entre eux aimeraient justement rencontrer de nouvelles personnes. Le problème n'est donc pas le manque d'envie : c'est le manque d'occasions et la peur du premier pas.",
        { h: "Ce qui rend les choses difficiles" },
        ["Des emplois du temps chargés et des trajets longs.", "Des cercles déjà formés, qui semblent fermés.", "La peur du rejet ou de déranger.", "Les écrans, qui remplissent le temps libre sans créer de lien."],
        { h: "Ce qui rend les choses plus simples" },
        ["Nous surestimons la gêne des autres : la plupart des gens apprécient qu'on leur parle.", "Les contextes partagés (une activité, une table) enlèvent la pression des présentations.", "Revoir les mêmes personnes suffit souvent à créer de la familiarité, puis de l'affection."],
        "En résumé : ce n'est pas vous, c'est le contexte. Changez de contexte, et tout devient plus facile.",
        { tip: "Créer ces contextes, c'est précisément notre rôle : [voir les prochaines expériences](/experiences)." },
      ],
      en: [
        "Many adults find it hard to make friends. Yet most of them would actually love to meet new people. So the problem isn't a lack of desire: it's a lack of opportunities and the fear of making the first move.",
        { h: "What makes it hard" },
        ["Busy schedules and long commutes.", "Circles that are already formed and seem closed.", "Fear of rejection or of bothering people.", "Screens, which fill free time without creating connection."],
        { h: "What makes it easier" },
        ["We overestimate other people's awkwardness: most people are glad when someone talks to them.", "Shared settings (an activity, a table) remove the pressure of introductions.", "Seeing the same people again is often enough to create familiarity, then fondness."],
        "In short: it's not you, it's the setting. Change the setting and everything gets easier.",
        { tip: "Creating those settings is exactly our job: [see upcoming experiences](/experiences)." },
      ],
    },
  },
  {
    slug: "solitude-et-sante",
    category: "amitie",
    title: { fr: "Solitude et santé : ce que l'on sait", en: "Loneliness and health: what we know" },
    excerpt: { fr: "La solitude n'est pas qu'un sentiment : les autorités de santé la considèrent désormais comme un enjeu de santé publique.", en: "Loneliness isn't just a feeling: health authorities now treat it as a public health issue." },
    minutes: 4,
    date: D,
    cover: "/images/photos/galerie-04.webp",
    body: {
      fr: [
        "Ces dernières années, plusieurs autorités de santé, dont l'Organisation mondiale de la santé, ont fait du lien social un sujet de santé publique. En cause : l'isolement et la solitude touchent un grand nombre de personnes, à tout âge, et ne sont pas sans effet sur la santé.",
        { h: "Ce que disent les études" },
        ["La solitude prolongée est associée à davantage de stress, de troubles du sommeil et de difficultés de moral.", "Les liens sociaux de qualité sont associés à une meilleure santé et à une meilleure qualité de vie.", "Ce n'est pas le nombre d'amis qui compte le plus, mais le sentiment d'être entouré et compris."],
        { h: "Ce que l'on peut faire" },
        ["Prévoir du temps social comme on prévoit du sport : régulièrement, dans son agenda.", "Privilégier les rencontres en personne, qui comptent davantage qu'une conversation par messages.", "Accepter d'aller vers les autres, et accueillir celles et ceux qui viennent vers nous."],
        { tip: "Cet article est informatif et ne remplace pas un avis médical. Si vous vous sentez en détresse, parlez-en à un professionnel de santé ou à une personne de confiance." },
      ],
      en: [
        "In recent years, several health authorities, including the World Health Organization, have made social connection a public health topic. The reason: isolation and loneliness affect many people, at every age, and they have consequences for health.",
        { h: "What the research says" },
        ["Prolonged loneliness is associated with more stress, sleep problems and low mood.", "Good-quality social ties are associated with better health and quality of life.", "It's not the number of friends that matters most, but the feeling of being supported and understood."],
        { h: "What we can do" },
        ["Schedule social time the way you schedule exercise: regularly, in your diary.", "Favour in-person meetings, which count for more than a text conversation.", "Be willing to reach out, and welcome those who reach out to you."],
        { tip: "This article is for information and doesn't replace medical advice. If you're feeling distressed, talk to a health professional or someone you trust." },
      ],
    },
  },
  // ——— Comment fonctionne The Host Club ———
  {
    slug: "diner-avec-des-inconnus",
    category: "the-host-club",
    title: { fr: "Dîner avec des inconnus : c'est quoi, et comment ça se passe ?", en: "Dinner with strangers: what is it, and how does it work?" },
    excerpt: { fr: "Une table, quelques personnes qui ne se connaissent pas, un lieu choisi pour vous : le principe, étape par étape.", en: "One table, a few people who don't know each other, a venue chosen for you: how it works, step by step." },
    minutes: 4,
    date: D,
    cover: "/images/photos/univers-diners.webp",
    body: {
      fr: [
        "Le principe est simple : vous réservez une place, nous composons une table de personnes qui ne se connaissent pas encore, et vous vous retrouvez dans un restaurant partenaire. Pas de profil à faire défiler, pas de conversation à lancer en ligne : on se découvre en vrai, autour d'un repas.",
        { h: "Pourquoi un dîner ?" },
        ["Le repas donne un rythme naturel : entrée, plat, dessert, et autant de sujets de conversation.", "Tout le monde est assis au même niveau : personne n'est « l'invité » de quelqu'un.", "La durée est connue à l'avance, ce qui rassure quand on vient seul."],
        { h: "Comment ça se passe" },
        { ol: [
          "Vous choisissez une date sur la fiche de l'expérience et réservez votre place.",
          "Nous composons les tables selon les langues, les âges et les centres d'intérêt, puis notre équipe valide.",
          "Avant le dîner, vous recevez les informations pratiques et un rappel la veille.",
          "Sur place, l'équipe ou le restaurant vous accueille et vous installe à votre table.",
          "Après le dîner, vous pouvez laisser un avis et dire si vous aimeriez recroiser vos voisins de table.",
        ] },
        { h: "Ce que ce n'est pas" },
        ["Ce n'est pas un speed dating : l'objectif est l'amitié et la convivialité.", "Ce n'est pas un repas chez quelqu'un : les dîners ont lieu dans des restaurants partenaires.", "Ce n'est pas un engagement : vous venez une fois, ou chaque mois, comme vous le sentez."],
        { tip: "Envie d'essayer ? [Voir les prochains dîners](/experiences)." },
      ],
      en: [
        "The idea is simple: you book a seat, we put together a table of people who don't know each other yet, and you meet at a partner restaurant. No profiles to scroll, no online chat to start: you get to know each other in person, over a meal.",
        { h: "Why a dinner?" },
        ["A meal sets a natural rhythm: starter, main, dessert, and as many conversation topics.", "Everyone is on an equal footing: nobody is someone else's guest.", "You know how long it lasts, which is reassuring when you come alone."],
        { h: "How it works" },
        { ol: [
          "Pick a date on the experience page and book your seat.",
          "We put the tables together based on languages, ages and interests, then our team checks them.",
          "Before the dinner, you receive the practical details and a reminder the day before.",
          "On site, the team or the restaurant welcomes you and shows you to your table.",
          "Afterwards, you can leave a review and say whether you'd like to meet your tablemates again.",
        ] },
        { h: "What it isn't" },
        ["It isn't speed dating: the goal is friendship and good company.", "It isn't dinner at someone's home: dinners take place in partner restaurants.", "It isn't a commitment: come once, or every month, as you like."],
        { tip: "Fancy trying? [See upcoming dinners](/experiences)." },
      ],
    },
  },
  {
    slug: "the-host-club-guide-complet",
    category: "the-host-club",
    title: { fr: "The Host Club, le guide complet", en: "The Host Club: the complete guide" },
    excerpt: { fr: "Les univers, la réservation, les groupes, le prix, l'abonnement, l'annulation : tout ce qu'il faut savoir en une page.", en: "Universes, booking, groups, price, membership, cancellation: everything you need to know on one page." },
    minutes: 6,
    date: D,
    cover: "/images/photos/a-propos-hero.webp",
    body: {
      fr: [
        "The Host Club organise des expériences en petit groupe à Casablanca pour rencontrer de nouvelles personnes, sans avoir à organiser quoi que ce soit. Voici l'essentiel.",
        { h: "Cinq univers" },
        ["Dîners & gastronomie : une table de nouvelles têtes dans un restaurant partenaire.", "Sport & bien-être : yoga, padel, course, cours collectifs.", "Jeux : quiz, jeux de société, énigmes en équipe.", "Ateliers : cuisine, poterie, peinture, fabriquer quelque chose ensemble.", "Sorties : balades, visites, découvertes de la ville."],
        { h: "Réserver" },
        "Vous créez votre compte, choisissez une expérience et une date, puis réservez. Certaines expériences sont confirmées immédiatement après le paiement ; d'autres passent d'abord par une demande que notre équipe accepte. Si une date est complète, vous pouvez rejoindre la liste d'attente.",
        { h: "Les groupes" },
        "Vous venez seul ou avec des amis (ils restent alors avec vous). Nous composons les tables et les équipes selon les langues, les âges, l'équilibre du groupe et les centres d'intérêt, en évitant de remettre ensemble les mêmes personnes. Notre équipe valide toujours la composition. Pour en savoir plus : [comment nous composons les tables](/blog/comment-nous-composons-les-tables).",
        { h: "Le prix" },
        "Le prix couvre votre place et l'organisation. Ce qui est inclus sur place (menu, matériel, cours) est détaillé sur chaque fiche. Le récapitulatif affiche le total avant paiement, frais éventuels compris.",
        { h: "L'abonnement" },
        "Pour un prix annuel, les membres bénéficient du prix membre et, selon la formule, d'un accès anticipé et d'expériences réservées. Il dure 12 mois, sans renouvellement automatique.",
        { h: "Annuler" },
        "L'annulation est gratuite jusqu'à 48 heures avant l'expérience. Si nous annulons, vous êtes intégralement remboursé. Le détail figure dans les [conditions de vente](/cgv).",
        { tip: "Une question précise ? Le [centre d'aide](/aide) répond à la plupart d'entre elles." },
      ],
      en: [
        "The Host Club organises small-group experiences in Casablanca so you can meet new people without organising anything. Here are the essentials.",
        { h: "Five universes" },
        ["Dinners & food: a table of new faces at a partner restaurant.", "Sport & wellbeing: yoga, padel, running, group classes.", "Games: quizzes, board games, team puzzles.", "Workshops: cooking, pottery, painting, making something together.", "Outings: walks, visits, discovering the city."],
        { h: "Booking" },
        "Create your account, choose an experience and a date, then book. Some experiences are confirmed right after payment; others start with a request that our team accepts. If a date is full, you can join the waiting list.",
        { h: "Groups" },
        "Come alone or with friends (they stay with you). We put tables and teams together based on languages, ages, group balance and interests, avoiding seating the same people together again. Our team always checks the result. Learn more: [how we put tables together](/blog/comment-nous-composons-les-tables).",
        { h: "Price" },
        "The price covers your seat and the organisation. What's included on site (menu, equipment, class) is listed on each page. The summary shows the total before payment, including any fees.",
        { h: "Membership" },
        "For an annual price, members get the member price and, depending on the plan, early access and members-only experiences. It lasts 12 months, with no automatic renewal.",
        { h: "Cancelling" },
        "Cancellation is free up to 48 hours before the experience. If we cancel, you get a full refund. Details are in the [terms of sale](/cgv).",
        { tip: "A specific question? The [help centre](/aide) answers most of them." },
      ],
    },
  },
  {
    slug: "comment-nous-composons-les-tables",
    category: "the-host-club",
    title: { fr: "Comment nous composons les tables", en: "How we put tables together" },
    excerpt: { fr: "Langues, âges, rencontres passées, centres d'intérêt : les critères que nous utilisons, et pourquoi un humain valide toujours.", en: "Languages, ages, past meetings, interests: the criteria we use, and why a person always checks." },
    minutes: 4,
    date: D,
    cover: "/images/photos/comment-groupe-2.webp",
    body: {
      fr: [
        "Une bonne table, ce n'est pas une table de clones : c'est un mélange où chacun peut participer à la conversation. Notre outil propose une composition, notre équipe la relit et l'ajuste. Voici les critères, du plus important au moins important.",
        { ol: [
          "La taille : des tables proches de la taille idéale de l'expérience, jamais au-delà du maximum.",
          "Une langue commune : toute la table doit pouvoir se comprendre. Les langues de votre profil sont donc précieuses.",
          "De nouvelles têtes : nous évitons de réunir des personnes qui se sont déjà retrouvées à la même table.",
          "Des âges proches : un écart raisonnable, sans faire des tables d'une seule génération.",
          "L'équilibre : un mélange femmes / hommes quand l'information est connue.",
          "Des points communs : quelques centres d'intérêt partagés, pour lancer la discussion.",
        ] },
        { h: "Et si je viens avec des amis ?" },
        "Une réservation de plusieurs places reste toujours à la même table ou dans la même équipe.",
        { h: "Pourquoi un humain valide" },
        "Un algorithme ne voit pas tout. Avant chaque révélation des tables, notre équipe vérifie la composition, corrige si besoin et tient compte de vos demandes particulières.",
        { tip: "Plus votre profil est complet (langues, centres d'intérêt), meilleure est votre table. [Compléter mon profil](/espace)." },
      ],
      en: [
        "A good table isn't a table of clones: it's a mix where everyone can join the conversation. Our tool suggests a line-up, and our team reviews and adjusts it. Here are the criteria, from most to least important.",
        { ol: [
          "Size: tables close to the experience's ideal size, never above the maximum.",
          "A shared language: the whole table must be able to understand each other. The languages in your profile really help.",
          "New faces: we avoid seating together people who have already shared a table.",
          "Similar ages: a reasonable range, without single-generation tables.",
          "Balance: a mix of women and men when we know it.",
          "Common ground: a few shared interests to get the conversation going.",
        ] },
        { h: "What if I come with friends?" },
        "A booking with several seats always stays at the same table or in the same team.",
        { h: "Why a person checks" },
        "An algorithm doesn't see everything. Before tables are revealed, our team checks the line-up, adjusts it if needed and takes your specific requests into account.",
        { tip: "The more complete your profile (languages, interests), the better your table. [Complete my profile](/espace)." },
      ],
    },
  },
  {
    slug: "the-host-club-est-il-sur",
    category: "the-host-club",
    title: { fr: "The Host Club est-il sûr ?", en: "Is The Host Club safe?" },
    excerpt: { fr: "Lieux publics, règles de la communauté, informations limitées, signalements : ce que nous faisons, et ce que vous pouvez faire.", en: "Public venues, community rules, limited information, reporting: what we do, and what you can do." },
    minutes: 4,
    date: D,
    cover: "/images/photos/comment-groupe-3.webp",
    body: {
      fr: [
        "Rencontrer de nouvelles personnes doit être enthousiasmant, pas inquiétant. La sécurité fait partie de la conception de chaque expérience.",
        { h: "Ce que nous faisons" },
        ["Toutes les expériences ont lieu dans des lieux publics ou chez des partenaires sélectionnés, jamais chez un participant.", "Chaque membre accepte notre [règles de la communauté](/charte) avant de réserver.", "Votre groupe ne voit que l'essentiel : votre prénom et vos centres d'intérêt. Ni nom de famille, ni téléphone, ni adresse.", "Chaque signalement est lu et traité par notre équipe ; les comportements contraires à la charte peuvent entraîner une exclusion.", "Le paiement se fait uniquement sur notre site : nous ne demandons jamais de payer ailleurs."],
        { h: "Ce que vous pouvez faire" },
        ["Prévenir un proche du lieu et de l'horaire.", "Prévoir votre trajet retour avant de partir.", "Garder vos affaires et votre verre à portée de vue.", "Partager vos coordonnées seulement si vous le souhaitez, et quand vous le souhaitez.", "Partir à tout moment : tout est facultatif, « non » est une réponse suffisante."],
        { h: "En cas d'urgence" },
        "Si une personne est en danger, appelez d'abord les secours (au Maroc : 19 pour la police, 15 pour les secours médicaux, 112 depuis un mobile), puis prévenez-nous.",
        { tip: "Tous les conseils sont réunis sur notre page [Sécurité](/securite)." },
      ],
      en: [
        "Meeting new people should feel exciting, not worrying. Safety is built into the design of every experience.",
        { h: "What we do" },
        ["Every experience takes place in a public place or at a selected partner venue, never at a participant's home.", "Every member accepts our [community rules](/charte) before booking.", "Your group only sees the essentials: your first name and interests. No surname, phone number or address.", "Every report is read and handled by our team; behaviour that breaks the code can lead to exclusion.", "Payment happens only on our website: we never ask you to pay elsewhere."],
        { h: "What you can do" },
        ["Tell someone close where you'll be and when.", "Plan your way home before you leave.", "Keep your belongings and your drink in sight.", "Share your contact details only if and when you want to.", "Leave at any time: everything is optional, and \"no\" is a complete answer."],
        { h: "In an emergency" },
        "If someone is in danger, call emergency services first (in Morocco: 19 for police, 15 for medical help, 112 from a mobile), then let us know.",
        { tip: "All our advice is on our [Safety](/securite) page." },
      ],
    },
  },
  {
    slug: "reserver-sa-premiere-experience",
    category: "the-host-club",
    title: { fr: "Réserver sa première expérience, étape par étape", en: "Booking your first experience, step by step" },
    excerpt: { fr: "Du choix de l'univers jusqu'au jour J : le parcours complet pour une première fois sans stress.", en: "From choosing a universe to the big day: the full journey for a stress-free first time." },
    minutes: 4,
    date: D,
    cover: "/images/photos/comment-groupe-1.webp",
    body: {
      fr: [
        "Première fois ? Voici exactement ce qui va se passer, pour arriver serein.",
        { ol: [
          "Choisissez un univers. Dîner, sport, jeu, atelier ou sortie : pour une première, un format que vous aimez déjà facilite les choses.",
          "Choisissez une date. La fiche indique le lieu ou le quartier, la durée, les langues, ce qui est inclus et le nombre de places restantes.",
          "Créez votre compte. Prénom, e-mail, et quelques informations de profil (langues, centres d'intérêt) qui nous aident à composer votre groupe.",
          "Réservez. Indiquez au besoin un régime ou une allergie, et un code promo si vous en avez un. Le récapitulatif affiche le total avant paiement.",
          "Recevez la confirmation. Selon l'expérience, elle est immédiate après paiement, ou arrive après validation de votre demande par notre équipe.",
          "Découvrez votre groupe. Avant l'expérience, nous vous communiquons votre table ou votre équipe et les informations pratiques.",
          "Le jour J. Un rappel arrive la veille et quelques heures avant. Arrivez à l'heure, présentez-vous à l'accueil : on s'occupe du reste.",
          "Après. Laissez un avis : il nous aide à améliorer les prochaines expériences et les prochaines tables.",
        ] },
        { h: "Trois conseils pour une première" },
        ["Venez seul : c'est le cas de la plupart des participants, et c'est ce qui rend la rencontre facile.", "Préparez une ou deux questions : notre article sur [les questions pour lancer une conversation](/blog/questions-pour-lancer-une-conversation) peut aider.", "Ne cherchez pas à tout réussir : une bonne soirée, c'est déjà beaucoup."],
        { tip: "Prêt ? [Découvrir les expériences](/experiences)." },
      ],
      en: [
        "First time? Here's exactly what will happen, so you can arrive relaxed.",
        { ol: [
          "Choose a universe. Dinner, sport, game, workshop or outing: for a first time, a format you already enjoy makes it easier.",
          "Choose a date. The page shows the venue or neighbourhood, length, languages, what's included and how many seats are left.",
          "Create your account. First name, email and a few profile details (languages, interests) that help us put your group together.",
          "Book. Add a diet or allergy if needed, and a promo code if you have one. The summary shows the total before payment.",
          "Get your confirmation. Depending on the experience, it's immediate after payment, or comes once our team accepts your request.",
          "Meet your group. Before the experience, we tell you your table or team and share the practical details.",
          "On the day. A reminder arrives the day before and a few hours before. Arrive on time and check in at reception: we take care of the rest.",
          "Afterwards. Leave a review: it helps us improve future experiences and tables.",
        ] },
        { h: "Three tips for a first time" },
        ["Come alone: most participants do, and that's what makes meeting people easy.", "Prepare one or two questions: our article on [questions to start a conversation](/blog/questions-pour-lancer-une-conversation) can help.", "Don't try to be perfect: a good evening is already a lot."],
        { tip: "Ready? [Discover the experiences](/experiences)." },
      ],
    },
  },
  {
    slug: "est-ce-une-application-de-rencontre",
    category: "the-host-club",
    title: { fr: "The Host Club, est-ce une application de rencontre ?", en: "Is The Host Club a dating app?" },
    excerpt: { fr: "Non, et c'est voulu. Ce qui nous distingue d'une application de rencontre amoureuse.", en: "No, and that's deliberate. What sets us apart from a dating app." },
    minutes: 3,
    date: D,
    cover: "/images/photos/univers-jeux-vinyles.webp",
    body: {
      fr: [
        "Non. The Host Club réunit des personnes pour se faire de nouveaux amis, élargir son cercle et partager un bon moment. Ce n'est pas un service de rencontre amoureuse.",
        { h: "Ce qui change tout" },
        ["Pas de profils à faire défiler ni de photos à noter : vous découvrez les gens en vrai.", "Des groupes, pas des tête-à-tête : la conversation circule, personne n'est sur la sellette.", "Une activité au centre : le repas, le jeu ou l'atelier donne un prétexte et un rythme.", "Un mélange voulu : des âges proches, mais aussi des profils et des parcours variés."],
        { h: "Et si une affinité naît ?" },
        "Des liens de toutes sortes peuvent naître, et c'est très bien. Mais l'objectif n'est jamais la séduction, et notre [charte](/charte) demande à chacun de respecter les limites des autres. Les comportements insistants peuvent être signalés et entraîner une exclusion.",
        { tip: "Envie de nouvelles amitiés ? [Voir les expériences](/experiences)." },
      ],
      en: [
        "No. The Host Club brings people together to make new friends, widen their circle and share a good time. It isn't a dating service.",
        { h: "What makes the difference" },
        ["No profiles to scroll or photos to rate: you meet people in person.", "Groups, not one-on-ones: the conversation flows and nobody is in the hot seat.", "An activity at the centre: the meal, game or workshop gives a reason and a rhythm.", "A deliberate mix: similar ages, but varied backgrounds and paths."],
        { h: "What if a connection sparks?" },
        "All kinds of connections can happen, and that's great. But the goal is never romance, and our [community rules](/charte) asks everyone to respect other people's boundaries. Pushy behaviour can be reported and may lead to exclusion.",
        { tip: "Looking for new friendships? [See the experiences](/experiences)." },
      ],
    },
  },
  {
    slug: "the-host-club-est-il-fait-pour-vous",
    category: "the-host-club",
    title: { fr: "The Host Club est-il fait pour vous ? Le petit test avant de réserver", en: "Is The Host Club for you? A quick self-check before you book" },
    excerpt: { fr: "Huit questions honnêtes pour savoir si nos expériences vous correspondent, et lesquelles choisir.", en: "Eight honest questions to see whether our experiences suit you, and which ones to pick." },
    minutes: 3,
    date: D,
    cover: "/images/photos/univers-ateliers.webp",
    body: {
      fr: [
        "Répondez spontanément. Si vous dites « oui » à au moins trois questions, vous devriez vous sentir chez vous parmi nous.",
        { ol: [
          "Vous aimeriez rencontrer des gens en dehors du travail et de votre cercle habituel ?",
          "Vous venez d'arriver à Casablanca, ou vous avez l'impression de tourner en rond ?",
          "Vous préférez une vraie conversation à un échange de messages ?",
          "Vous êtes curieux des autres, même très différents de vous ?",
          "L'idée de venir seul vous intimide un peu, mais vous tente ?",
          "Vous aimez découvrir de nouveaux lieux, de nouveaux goûts ou de nouvelles activités ?",
          "Vous êtes à l'aise avec l'idée de partager un moment avec des inconnus dans un lieu public ?",
          "Vous cherchez des amitiés, pas une rencontre amoureuse ?",
        ] },
        { h: "Quel univers choisir ?" },
        ["Vous aimez parler et bien manger : commencez par un dîner.", "Vous êtes plus à l'aise quand on fait quelque chose : un jeu ou un atelier.", "Vous avez besoin de bouger : sport & bien-être.", "Vous voulez redécouvrir la ville : une sortie."],
        { h: "Ce n'est peut-être pas pour vous si…" },
        ["vous cherchez avant tout une rencontre amoureuse ;", "vous ne souhaitez pas respecter des règles de vie communes."],
        { tip: "Le test est concluant ? [Réservez votre première expérience](/blog/reserver-sa-premiere-experience)." },
      ],
      en: [
        "Answer on instinct. If you say \"yes\" to at least three questions, you should feel at home with us.",
        { ol: [
          "Would you like to meet people outside work and your usual circle?",
          "Have you just moved to Casablanca, or do you feel stuck in a routine?",
          "Do you prefer a real conversation to an exchange of messages?",
          "Are you curious about other people, even very different from you?",
          "Does coming alone intimidate you a little, but still appeal?",
          "Do you enjoy discovering new places, flavours or activities?",
          "Are you comfortable sharing a moment with strangers in a public place?",
          "Are you looking for friendships rather than romance?",
        ] },
        { h: "Which universe to pick?" },
        ["You love talking and good food: start with a dinner.", "You're more at ease when doing something: a game or a workshop.", "You need to move: sport & wellbeing.", "You want to rediscover the city: an outing."],
        { h: "It might not be for you if…" },
        ["you're mainly looking for romance;", "you don't want to follow shared community rules."],
        { tip: "Passed the test? [Book your first experience](/blog/reserver-sa-premiere-experience)." },
      ],
    },
  },
];

/** Fusion de la version arabe (content/blog-ar.ts) ; un article sans traduction fait échouer la compilation. */
function arOf<T>(map: Record<string, T>, key: string): T {
  const v = map[key];
  if (!v) throw new Error(`Traduction arabe manquante pour le blog : ${key}`);
  return v;
}
export const BLOG_CATEGORIES: BlogCategory[] = BLOG_CATEGORIES_RAW.map((c) => {
  const ar = arOf(BLOG_CATEGORIES_AR, c.key);
  return { ...c, title: { ...c.title, ar: ar.title }, description: { ...c.description, ar: ar.description } };
});
if (CITY_GUIDE_FAQ_AR.length !== CITY_GUIDE_FAQ_RAW.length) throw new Error("FAQ City guide : traduction arabe incomplète");
export const CITY_GUIDE_FAQ: { q: L; a: L }[] = CITY_GUIDE_FAQ_RAW.map((f, i) => ({ q: { ...f.q, ar: CITY_GUIDE_FAQ_AR[i]!.q }, a: { ...f.a, ar: CITY_GUIDE_FAQ_AR[i]!.a } }));
export const BLOG_ARTICLES: BlogArticle[] = BLOG_ARTICLES_RAW.map((a) => {
  const ar = arOf(BLOG_ARTICLES_AR, a.slug);
  return { ...a, title: { ...a.title, ar: ar.title }, excerpt: { ...a.excerpt, ar: ar.excerpt }, body: { ...a.body, ar: ar.body } };
});

/** Langue du contenu des articles. */
export const blogLang = (locale: string): BlogLang => (locale === "en" || locale === "ar" ? locale : "fr");
export const articleBySlug = (slug: string) => BLOG_ARTICLES.find((a) => a.slug === slug);
export const blogCategory = (key: string) => BLOG_CATEGORIES.find((c) => c.key === key);
export const articlesIn = (key: BlogCategoryKey) => BLOG_ARTICLES.filter((a) => a.category === key);

/** Article mis en avant « Commencer ici ». */
export const START_HERE = "diner-avec-des-inconnus";
/**
 * « Les plus lus » : notre sélection tant que les lectures ne sont pas mesurées (docs/17, 8i).
 * Sert aussi d'ordre « Plus lus » dans « Parcourir les articles ».
 */
export const MOST_READ = [
  "questions-pour-lancer-une-conversation",
  "se-faire-des-amis-a-casablanca",
  "que-faire-a-casablanca",
  "se-faire-des-amis-adulte",
  "reserver-sa-premiere-experience",
  "est-ce-une-application-de-rencontre",
];
const rank = (slug: string) => {
  const i = MOST_READ.indexOf(slug);
  return i === -1 ? MOST_READ.length : i;
};
/** Ordre « Plus lus » (sélection puis le reste) et ordre « Récents » (date, puis dernier ajouté). */
export const byPopularity = (list: BlogArticle[]) => [...list].sort((a, b) => rank(a.slug) - rank(b.slug));
export const byRecency = (list: BlogArticle[]) =>
  list.map((a, i) => ({ a, i })).sort((x, y) => y.a.date.localeCompare(x.a.date) || y.i - x.i).map((x) => x.a);
/** Date de mise à jour d'un thème (article le plus récent). */
export const lastUpdate = (list: BlogArticle[]) => list.reduce((d, a) => (a.date > d ? a.date : d), "");
