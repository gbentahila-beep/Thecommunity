/**
 * Textes juridiques et page Sécurité, rédigés à partir du fonctionnement réel du site.
 * (Relecture par un avocat : suivie dans docs/16, jamais mentionnée sur le site.)
 * Les jetons {{…}} sont remplacés par les informations légales (lib/legal-info.ts) ou « à compléter » ; « [texte](/chemin) » crée un lien interne.
 * Français : version de référence. Anglais et arabe (content/legal-ar.ts) : traductions.
 */

import { LEGAL_AR } from "./legal-ar";
import { MARKETPLACE_LEGAL, type MarketplaceKey } from "./legal-marketplace";

export type BaseLegalKey = "terms" | "sales" | "privacy" | "safety" | "community" | "physical";
/** Étape 20 : contrat organisateur et conditions de vente des activités des organisateurs (content/legal-marketplace.ts). */
export type LegalKey = BaseLegalKey | MarketplaceKey;
/** Bloc : paragraphe, liste à puces, ou tableau (affiché en fiches sur mobile). */
export type LegalTable = { table: { head: string[]; rows: string[][] } };
export type LegalBlock = string | string[] | LegalTable;
export type LegalSection = { title: string; body: LegalBlock[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const UPDATED_FR = "Dernière mise à jour : 23 novembre 2026 · en vigueur à la même date";

const fr: Record<BaseLegalKey, LegalDoc> = {
  physical: {
    "title": "Conditions de participation aux activités physiques",
    "updated": UPDATED_FR,
    "intro": "Ces conditions s'appliquent aux expériences marquées « Activité physique » sur leur fiche : sport, padel, course, yoga, randonnée, danse… Vous les acceptez en réservant ou en demandant à participer. Elles complètent les [conditions générales d'utilisation](/cgu), les [conditions générales de vente](/cgv) et nos conseils de [sécurité](/securite).",
    "sections": [
      {
        "title": "1. À quoi servent ces conditions",
        "body": [
          "Une activité physique demande un effort et comporte des risques propres (chute, entorse, choc, fatigue). Ces conditions vous informent de ces risques, rappellent les règles qui permettent de les limiter et précisent le rôle de chacun : vous, le lieu partenaire et Wenzy."
        ]
      },
      {
        "title": "2. Votre état de santé",
        "body": [
          [
            "En réservant, vous confirmez être en état de pratiquer l'activité et ne connaître aucune contre-indication.",
            "En cas de doute (problème cardiaque ou respiratoire, blessure récente, grossesse, traitement en cours…), demandez l'avis d'un médecin avant de réserver.",
            "Si quelque chose vous gêne le jour même, dites-le discrètement à l'encadrant ou à l'équipe : vous pouvez adapter l'effort ou vous arrêter à tout moment.",
            "Ne nous envoyez aucun certificat ni document médical : nous ne collectons pas d'informations sur votre santé."
          ]
        ]
      },
      {
        "title": "3. Votre niveau",
        "body": [
          "Le niveau attendu est indiqué sur la fiche. Choisissez une activité adaptée et répondez honnêtement au questionnaire de l'expérience (niveau, allure…) : il sert à vous placer avec des personnes de votre niveau, pour le plaisir et la sécurité de tous."
        ]
      },
      {
        "title": "4. Pendant l'activité",
        "body": [
          [
            "Suivez les consignes de l'encadrant et du lieu, et les règles du jeu.",
            "Portez la tenue et les protections demandées (par exemple, des chaussures adaptées au padel) et utilisez le matériel conformément aux instructions.",
            "Échauffez-vous, hydratez-vous et allez à votre rythme : personne ne doit suivre à tout prix.",
            "Ni alcool ni substance avant ou pendant l'activité. L'encadrant ou l'équipe peut refuser la participation d'une personne qui se met en danger ou met les autres en danger.",
            "Respectez les autres participants et leur niveau : le fair-play fait partie de l'expérience."
          ]
        ]
      },
      {
        "title": "5. Les risques de l'activité",
        "body": [
          "Malgré ces précautions, une activité physique comporte des risques normaux et prévisibles : courbatures, chutes, entorses, hématomes (par exemple, un choc de balle au padel), fatigue. Vous participez en connaissance de ces risques."
        ]
      },
      {
        "title": "6. Le rôle de chacun",
        "body": [
          [
            "Wenzy organise l'expérience, choisit les lieux partenaires et vérifie qu'ils disposent d'une assurance responsabilité civile.",
            "Le lieu partenaire est responsable de ses installations, de son matériel et, le cas échéant, de l'encadrement de l'activité.",
            "Vous êtes responsable de votre comportement, du respect des consignes et des dommages que vous causeriez à d'autres personnes ou au matériel.",
            "Nous vous conseillons d'être couvert par une assurance personnelle (individuelle accident, responsabilité civile) : vérifiez vos contrats."
          ],
          "Rien dans ces conditions ne limite la responsabilité de Wenzy ou du lieu partenaire pour leurs propres fautes, ni les droits que vous donne la loi."
        ]
      },
      {
        "title": "7. Âge minimum et météo",
        "body": [
          "Nos expériences sont réservées aux personnes de 18 ans et plus ; certaines activités demandent un âge minimum plus élevé, indiqué sur leur fiche et vérifié à la réservation. Pour une activité en plein air, si la météo ne permet pas de la pratiquer en sécurité, elle est reportée ou annulée selon les [conditions générales de vente](/cgv)."
        ]
      },
      {
        "title": "8. En cas d'accident",
        "body": [
          "Prévenez immédiatement l'encadrant, le personnel du lieu ou l'équipe. En cas d'urgence au Maroc : 15 (Protection civile, secours), 19 (police), 112 depuis un mobile. Ensuite, signalez ce qui s'est passé depuis votre réservation : nous faisons le point avec le lieu et vous répondons."
        ]
      },
      {
        "title": "9. Votre accord",
        "body": [
          "La version de ces conditions que vous acceptez et sa date sont enregistrées avec votre réservation. Une nouvelle version s'applique aux réservations faites après sa publication."
        ]
      }
    ]
  },
  safety: {
    title: "Sécurité",
    updated: UPDATED_FR,
    intro:
      "Rencontrer de nouvelles personnes doit être enthousiasmant, jamais inquiétant. Chaque expérience Wenzy se déroule en groupe, dans un lieu public ou chez un partenaire sélectionné, avec des garde-fous prévus dès sa conception. Cette page explique ce que nous faisons pour vous protéger, et ce que vous pouvez faire pour veiller sur vous et sur les autres.",
    sections: [
      {
        title: "Nos principes",
        body: [
          [
            "La sécurité avant la croissance : face à un risque, nous choisissons toujours l'option la plus prudente, même si elle nous coûte une réservation ou un membre.",
            "L'amitié d'abord : Wenzy n'est pas une application de rencontre amoureuse. L'insistance, la pression amoureuse ou sexuelle et les avances répétées non désirées sont interdites.",
            "Entre adultes : le service est réservé aux personnes de 18 ans et plus. Un compte qui semble appartenir à un mineur peut être restreint, vérifié ou supprimé.",
            "De vraies personnes : chacun se présente sous son vrai prénom. Faux profils, usurpation d'identité et comptes multiples sont interdits ; nous pouvons demander une vérification en cas de doute.",
          ],
        ],
      },
      {
        title: "Ce que nous faisons",
        body: [
          [
            "Toujours dans des lieux publics ou chez des partenaires sélectionnés (restaurants, studios, ateliers) — jamais au domicile d'un participant.",
            "Pour les dîners et les activités en groupe, des petits groupes composés et relus par notre équipe : moins de pression, personne d'isolé.",
            "Certaines expériences sont « sur demande » : l'équipe valide chaque participant.",
            "Le strict minimum partagé : votre groupe ne voit que votre prénom, votre photo de profil (si vous en avez mis une) et vos centres d'intérêt. Ni téléphone, ni e-mail, ni nom de famille.",
            "Pas de messagerie privée entre participants : on se découvre d'abord en vrai, dans un lieu public.",
            "Chaque membre accepte nos [règles de la communauté](/charte) avant de réserver, et chaque signalement est lu par une personne de l'équipe.",
          ],
        ],
      },
      {
        title: "Avant l'expérience",
        body: [
          [
            "Prévenez un proche : dites-lui où vous allez et à quelle heure vous pensez rentrer.",
            "Prévoyez l'aller et le retour avant de partir, surtout le soir ou si vous comptez boire un verre.",
            "Un besoin particulier (mobilité, audition, vue, régime, allergie) ? Indiquez-le en réservant, rubrique « Pour votre accueil », ou écrivez-nous le plus tôt possible : nous pourrons en tenir compte pour le lieu et votre groupe.",
            "Réservez et payez uniquement sur notre site officiel. Nous ne demandons jamais de payer par virement, par message ou en espèces à un inconnu. Méfiez-vous des pages ou comptes qui imitent notre nom.",
            "Avant l'expérience, nous vous communiquons les informations utiles (lieu, horaire, et selon le format votre table ou votre équipe). Vos coordonnées ne sont jamais transmises aux autres participants.",
          ],
        ],
      },
      {
        title: "Pendant l'expérience",
        body: [
          [
            "Tout est facultatif. Vous pouvez partir à tout moment, sans vous justifier. Personne ne peut vous pousser à boire, à rester, à donner vos coordonnées ou à faire quoi que ce soit : « non » est une réponse suffisante.",
            "Gardez votre verre et vos affaires à portée de vue, où que vous soyez.",
            "L'alcool n'est jamais obligatoire et des boissons sans alcool sont toujours proposées. Rester lucide, c'est garder la main sur sa soirée.",
            "Votre prénom suffit. Adresse, travail, téléphone, réseaux sociaux : vous les partagez seulement si et quand vous le décidez.",
            "Allergie ou intolérance : confirmez-la directement auprès du serveur ou du personnel, sans vous fier au seul menu.",
            "Un malaise, une situation gênante ? Parlez-en au personnel du lieu ou à l'organisateur, ou contactez notre équipe.",
          ],
        ],
      },
      {
        title: "Sorties, sport et activités en plein air",
        body: [
          [
            "Soyez visible : le soir ou tôt le matin, portez des vêtements clairs et restez sur des chemins éclairés.",
            "Gardez une oreille libre : si vous écoutez de la musique, baissez le volume pour entendre la circulation et le groupe.",
            "Emportez l'essentiel : téléphone chargé, eau, pièce d'identité ou numéro d'un proche à prévenir.",
            "Allez à votre rythme : personne ne doit suivre à tout prix. Vertiges, chaleur, douleur ? Arrêtez-vous et dites-le.",
            "Pensez à la météo : par forte chaleur, buvez avant de venir, protégez-vous du soleil et ralentissez ; par temps de pluie, prévoyez des chaussures adaptées.",
            "Restez groupés : une balade n'est pas une course. Veillez les uns sur les autres et aidez une personne en difficulté à rentrer en sécurité.",
            "Niveau et questionnaire : répondez honnêtement au questionnaire de l'expérience (niveau, allure…) ; il sert à vous placer avec des personnes de votre niveau, pour le plaisir et la sécurité de tous.",
            "Matériel et tenue : suivez les indications de la fiche (matériel fourni, à apporter, tenue conseillée) et les consignes de l'encadrant ou du lieu (échauffement, protections, règles du jeu).",
            "Activités physiques : avant de réserver, vous acceptez nos [conditions de participation aux activités physiques](/conditions-activites-physiques). En cas de doute sur votre santé, demandez l'avis d'un médecin avant de venir.",
            "En plein air : si la météo ne permet pas l'activité, nous la reportons ou l'annulons, et vous êtes remboursé si la nouvelle date ne vous convient pas (voir les [conditions générales de vente](/cgv)).",
          ],
        ],
      },
      {
        title: "En cas d'urgence",
        body: [
          "Si la vie ou la sécurité de quelqu'un est en jeu, appelez d'abord les secours, puis prévenez-nous :",
          ["Police : 19", "Gendarmerie royale (hors des villes) : 177", "Protection civile (pompiers, ambulances) : 15", "Depuis un téléphone portable, le 112 vous oriente aussi vers les secours"],
          "Cela vaut pour un malaise pendant l'expérience, une personne en détresse, un participant introuvable après une expérience ou une menace visant un lieu ou un groupe. Le personnel du lieu connaît l'adresse exacte : demandez-lui de l'aide pour guider les secours.",
          "Pas sûr que ce soit grave ? Prévenez-nous quand même : nous préférons être alertés pour une situation qui se révèle sans gravité plutôt que de passer à côté d'une vraie urgence.",
        ],
      },
      {
        title: "Après l'expérience",
        body: [
          [
            "Gardez le contact à votre rythme : partagez vos coordonnées seulement avec les personnes en qui vous avez confiance.",
            "N'envoyez jamais d'argent. Ne prêtez rien, ne communiquez ni informations bancaires, ni codes, ni cartes cadeaux à une personne rencontrée via Wenzy, aussi touchante que soit son histoire. C'est l'arnaque la plus courante : signalez-la-nous.",
            "Rentrez en sécurité : ne prenez pas le volant après avoir bu et ne montez pas avec quelqu'un qui a bu. Préférez un taxi, une application de VTC ou le tramway.",
          ],
        ],
      },
      {
        title: "Signaler un problème",
        body: [
          "Pendant ou après une expérience, signalez tout comportement via le lien « Signaler un comportement » de votre réservation, à {{safetyEmail}} ou par la page Contact. Vous pouvez signaler ce que vous avez vécu ou ce dont vous avez été témoin. Indiquez la date, l'expérience et ce qui s'est passé.",
          "Chaque signalement est lu par l'équipe le plus vite possible (objectif : sous 48 heures) et reste confidentiel : nous ne disons jamais à la personne concernée qui l'a signalée.",
        ],
      },
      {
        title: "Nos mesures",
        body: [
          "Selon la gravité : avertissement, restriction, suspension temporaire ou exclusion définitive. Les faits graves entraînent une exclusion immédiate, et nous pouvons coopérer avec les autorités dans le cadre prévu par la loi. Un compte signalé par deux personnes différentes en 90 jours ne peut plus réserver le temps que l'équipe examine la situation ; un compte suspendu perd ses réservations à venir et quitte aussitôt ses tables et leurs messages. Le détail, y compris le recours, figure dans nos [règles de la communauté](/charte).",
        ],
      },
      {
        title: "Vos données et notre équipe",
        body: [
          "Nous ne vendons jamais vos données. Seules les personnes de l'équipe qui en ont besoin (support, sécurité, modération, technique) y accèdent, et ces accès sont enregistrés. Le détail figure dans la [politique de confidentialité](/confidentialite).",
          "Vous avez découvert une faille de sécurité ? Écrivez-nous en privé à {{securityEmail}} et laissez-nous le temps de la corriger avant d'en parler publiquement.",
        ],
      },
    ],
  },

  community: {
    title: "Règles de la communauté",
    updated: UPDATED_FR,
    intro:
      "Wenzy réunit des personnes qui ne se connaissent pas autour d'une table, d'un atelier ou d'une sortie. Cela fonctionne parce que chacun arrive ouvert aux autres — et cela ne tient que si tout le monde se sent en sécurité et respecté. Ces règles disent ce que nous attendons de chaque membre, ce sur quoi nous agissons quand quelque chose ne va pas, et ce qui se passe ensuite.",
    sections: [
      {
        title: "Où elles s'appliquent",
        body: [
          [
            "Pendant les expériences, de l'arrivée au départ, y compris ce qui les prolonge directement (un verre après, le trajet du retour).",
            "Sur le site : profil, avis, demandes de participation et échanges avec l'équipe.",
            "En dehors de Wenzy, lorsqu'un membre en contacte un autre contre son gré à la suite d'une expérience.",
          ],
          "Pour les conseils pratiques avant, pendant et après une rencontre, consultez notre page [Sécurité](/securite).",
        ],
      },
      {
        title: "Nous joindre",
        body: [
          "Signalez un comportement depuis votre réservation (« Signaler un comportement »), à {{safetyEmail}} ou par la page Contact. Vous pouvez signaler ce qui vous est arrivé ou ce dont vous avez été témoin : chaque signalement est traité de la même façon, quelle que soit la personne qui le fait, et il est lu par une personne de l'équipe.",
          "Si nous avons pris une mesure sur votre compte et que vous pensez que nous nous sommes trompés, vous pouvez faire un recours (voir plus bas).",
        ],
      },
      {
        title: "Votre compte",
        body: [
          [
            "Avoir 18 ans ou plus. Nous pouvons demander une pièce justificative ; un compte appartenant à un mineur est fermé.",
            "Utiliser le prénom que vous utilisez au quotidien : pas de pseudonyme, de nom fantaisiste ou du nom de quelqu'un d'autre.",
            "Photo facultative ; si vous en ajoutez une, elle doit vous montrer, être récente, sans filtre lourd ni texte, et ne jamais représenter un enfant.",
            "Une adresse e-mail confirmée et exacte.",
            "Une personne, un compte.",
          ],
        ],
      },
      {
        title: "Venir, ou annuler à temps",
        body: [
          "Une place vide se voit et pèse sur tout le groupe. Si vous ne pouvez plus venir, annulez dans les délais indiqués dans les [conditions de vente](/cgv) pour libérer la place.",
          "Vous venez avec des amis ? Réservez leurs places dans la même réservation : le groupe est composé pour un nombre précis de personnes, et un invité non prévu prendrait la place de quelqu'un d'autre. La personne qui réserve s'assure que ses invités connaissent ces règles, et en répond.",
        ],
      },
      {
        title: "Respecter la vie privée des autres",
        body: [
          "Vous apprendrez des choses personnelles sur les personnes rencontrées : prenez-en soin.",
          [
            "Demandez avant de publier. Une photo ou une vidéo d'un autre membre ne va sur les réseaux qu'avec son accord ; certaines personnes ont de vraies raisons de rester discrètes. Ne photographiez pas quelqu'un qui vous a demandé de ne pas le faire.",
            "Ne retrouvez jamais quelqu'un grâce à ce que vous avez appris : chercher son domicile, son travail ou ses réseaux, ou s'y présenter, c'est du harcèlement. Demander un numéro, c'est normal ; le chercher, non.",
            "Un silence est une réponse. Relancer quelqu'un qui ne répond plus, ou le recontacter une seule fois après qu'il vous a demandé d'arrêter, est une violation — par n'importe quel moyen.",
            "Respectez les limites physiques et de conversation. Une accolade, un sujet lourd ou une question personnelle peuvent être bienvenus pour l'un et gênants pour l'autre. Dans le doute, demandez ; et un changement de sujet se respecte.",
          ],
        ],
      },
      {
        title: "Les lignes rouges",
        body: [
          "Ces faits entraînent l'exclusion immédiate et définitive, sans avertissement préalable. Selon les cas, nous coopérons avec les autorités.",
          [
            "Violences physiques ou sexuelles, y compris tout contact sexuel non consenti, pendant ou après une expérience.",
            "Trafiquer le verre ou l'assiette de quelqu'un, pour quelque raison que ce soit.",
            "Vol ou extorsion. Une erreur de bonne foi (repartir avec la mauvaise veste) n'en est pas une : prévenez-nous et nous arrangerons les choses.",
            "Menaces précises de s'en prendre à un membre, en personne ou par écrit.",
            "Diffuser, menacer de diffuser ou réclamer des images intimes d'une personne sans son accord.",
            "Arnaques : faux investissements, demandes d'argent ou de prêt, moyens de paiement volés, toute tromperie qui coûte de l'argent à un membre.",
            "Toute exploitation ou mise en danger de mineurs, en ligne ou hors ligne : tolérance zéro, signalement aux autorités.",
            "Vendre ou consommer des substances illicites pendant une expérience.",
            "Créer un nouveau compte après une exclusion : tous les comptes liés sont supprimés.",
          ],
          "Vous pouvez tout de même faire un recours : c'est une vérification que nous ne nous sommes trompés ni de personne ni de faits, pas une seconde chance.",
        ],
      },
      {
        title: "Pas de discrimination",
        body: [
          "Réunir des personnes d'origines, de parcours et d'opinions différents, c'est le cœur de Wenzy. Nous agissons contre toute discrimination, qu'elle vienne d'un participant ou d'un lieu.",
          [
            "Propos haineux ou dégradants visant l'origine, la religion, la nationalité, le genre, l'orientation sexuelle, le handicap ou l'âge.",
            "Mise à l'écart volontaire : un groupe qui ignore ou isole un convive à cause de ce qu'il est.",
            "Remarques dégradantes répétées (sur un accent, des origines, des « blagues » liées à l'identité). Une maladresse appelle une remarque bienveillante ; la répétition est une violation.",
          ],
          "Selon la gravité, cela va de l'avertissement pédagogique à l'exclusion. Si cela vous arrive, y compris de la part du personnel d'un lieu, signalez-le.",
        ],
      },
      {
        title: "Harcèlement et attention non désirée",
        body: [
          [
            "Remarques, propositions ou conversations à caractère sexuel non désirées ; envoi ou présentation de contenus explicites, par quelque moyen que ce soit.",
            "Attention amoureuse non désirée : s'intéresser à quelqu'un n'est pas une faute, insister après un refus clair en est une. Demander un numéro, c'est permis ; redemander après un « non », ça ne l'est pas. Nous jugeons le comportement, pas l'intention.",
          ],
        ],
      },
      {
        title: "Un usage loyal de Wenzy",
        body: [
          [
            "Pas de vente ni de prospection : ne profitez pas d'une expérience pour recruter, vendre, promouvoir votre entreprise ou gagner des abonnés. Parler de son métier, c'est de la conversation ; orienter la soirée vers une transaction, non.",
            "Soyez vous-même : pas de fausse identité, pas de photos d'autrui.",
            "Pas de spam, de robots ni de liens trompeurs.",
            "Pas de contournement : comptes multiples, abus des codes promo, de la liste d'attente ou des avis sont interdits.",
            "Réglez votre part : si une consommation hors prix est partagée sur place, partir sans payer revient à la faire payer aux autres.",
            "Rien qui mette les autres en danger : ni promotion de la violence ou de l'extrémisme, ni exploitation de qui que ce soit.",
            "Fair-play : au sport comme au jeu, respectez les règles, les consignes de sécurité et le niveau des autres. On vient pour partager un bon moment, jamais pour humilier ou blesser qui que ce soit.",
          ],
        ],
      },
      {
        title: "Parler de sujets difficiles",
        body: [
          "L'amitié passe aussi par des conversations profondes : deuil, santé mentale, épreuves de la vie. Elles sont les bienvenues, avec égard pour les personnes autour de vous.",
          "Ce qui n'est pas permis : promouvoir ou glorifier l'automutilation, le suicide ou les troubles alimentaires, pousser quelqu'un vers un comportement dangereux, ou montrer des images choquantes.",
          "Si quelqu'un vous confie qu'il va mal : la bienveillance d'abord. Si vous êtes inquiet pour sa sécurité, prévenez-nous — et en cas d'urgence, appelez les secours.",
        ],
      },
      {
        title: "Les lieux partenaires",
        body: [
          [
            "Respectez le personnel et le règlement de chaque lieu : sans nos partenaires, il n'y aurait pas d'expériences.",
            "Un problème qui vient du lieu (conditions dangereuses, personnel irrespectueux, intoxication alimentaire, allergie ou régime non respecté) ? Dites-le-nous : nous en parlons directement au lieu, et votre signalement n'a aucune conséquence sur votre compte.",
          ],
        ],
      },
      {
        title: "Comment nous traitons les signalements",
        body: [
          [
            "Avec discrétion : nous ne disons pas à la personne signalée qui l'a signalée, et nous ne partageons votre récit qu'avec les personnes qui doivent agir.",
            "Signalez des violations, pas des désaccords : une opinion différente ou un manque d'affinités ne sont pas des fautes. Les signalements fonctionnent parce qu'ils sont fiables.",
            "Un faux signalement volontaire, pour nuire à quelqu'un ou le viser pour ce qu'il est, est lui-même une violation.",
          ],
          "Nous ne pouvons pas toujours vous communiquer l'issue d'un signalement, mais aucun n'est ignoré.",
        ],
      },
      {
        title: "Les mesures",
        body: [
          "La plupart des situations suivent une gradation :",
          [
            "Avertissement pédagogique : pour une première fois, peu grave. Nous expliquons ce qui a dépassé la limite ; votre compte n'est pas restreint.",
            "Avertissement formel : pour un comportement répété ou plus sérieux. Il est noté sur votre compte et compte s'il y a une prochaine fois.",
            "Restriction ou suspension temporaire : par exemple, accès aux seules expériences sur demande.",
            "Exclusion définitive : si le comportement continue, ou si le tort causé le justifie à lui seul.",
          ],
          "La mesure dépend de la gravité, de la répétition et du risque pour les autres membres. Nous vous indiquons toujours la règle concernée et la mesure prise, par e-mail.",
        ],
      },
      {
        title: "Recours",
        body: [
          "Si nous avons pris une mesure sur votre compte et que vous pensez que nous nous sommes trompés, écrivez à {{supportEmail}} dans les 7 jours suivant la notification. Votre recours est examiné par une personne qui n'a pas pris la première décision. Dites-nous ce qui, selon vous, nous a échappé : si la décision est maintenue, nous vous expliquons pourquoi.",
        ],
      },
      {
        title: "Évolution de ces règles",
        body: [
          "Ces règles évoluent avec la communauté et ce que nous apprenons. Chaque version est datée sur cette page, et les changements importants sont annoncés par e-mail.",
        ],
      },
    ],
  },

  terms: {
    title: "Conditions générales d'utilisation",
    updated: UPDATED_FR,
    intro:
      "Ces conditions encadrent l'accès et l'utilisation du site Wenzy. En créant un compte ou en cochant « J'accepte », vous concluez un contrat électronique avec Wenzy. Si vous ne les acceptez pas, n'utilisez pas le service. Prix, paiement, annulation et abonnement relèvent des [conditions générales de vente](/cgv) ; le comportement attendu de chacun est précisé dans les [règles de la communauté](/charte).",
    sections: [
      { title: "1. Éditeur", body: ["Le site est édité par {{publisher}}, dont le siège est situé {{address}} (ICE {{ice}}, RC {{rc}}). Contact : {{supportEmail}}. Hébergement : {{host}}."] },
      {
        title: "2. Le service",
        body: [
          "Wenzy réunit une communauté qui se retrouve chaque semaine, en petits groupes, autour de rendez-vous fixes : le Dîner du mercredi, l'activité du samedi (une activité différente chaque semaine), le Café du samedi et le Brunch du dimanche, ainsi que des éditions spéciales. Des organisateurs partenaires proposent aussi leurs activités, validées par notre équipe. Tout se passe dans des lieux publics ou chez des partenaires. Nous choisissons les lieux, composons les groupes, vous informons et restons votre interlocuteur unique.",
          "Wenzy n'est pas un service de rencontre amoureuse. Des liens peuvent naître entre adultes consentants, mais toute pression amoureuse ou sexuelle, toute insistance et tout comportement qui met le groupe mal à l'aise sont interdits.",
        ],
      },
      {
        title: "3. Ce que nous faisons, et ce que fait le lieu",
        body: [
          [
            "Le lieu partenaire prépare et sert les repas et boissons, ou assure l'activité (cours, atelier, matériel). Il en reste responsable, ainsi que de son établissement.",
            "Régime alimentaire : avec votre accord, nous le transmettons au lieu et en tenons compte dans le choix des lieux quand c'est possible, sans pouvoir garantir chaque option partout.",
            "Allergies et intolérances : nous ne préparons pas les plats et ne pouvons exclure tout risque de réaction ou de contamination. Vérifiez directement auprès du personnel avant de consommer.",
            "Ce qui est inclus dans le prix figure sur la fiche de chaque expérience ; toute consommation supplémentaire se règle directement auprès du lieu, à vos frais. Consultez la carte ou la description avant de réserver ; si le lieu ne vous convient pas, contactez-nous et nous chercherons une solution (autre date, ou annulation selon les conditions de vente).",
            "Le lieu figure sur la fiche ou vous est communiqué avant l'expérience. Il peut changer si une raison sérieuse l'impose (sécurité, qualité, capacité, fermeture imprévue) : vous en êtes alors informé.",
          ],
        ],
      },
      {
        title: "4. Ce que nous ne pouvons pas garantir",
        body: [
          [
            "Le nombre exact de participants (si le minimum n'est pas atteint, l'expérience peut être annulée et remboursée selon les conditions de vente).",
            "Une répartition précise entre femmes et hommes ou une tranche d'âge exacte.",
            "Des affinités avec chacun : nous composons les groupes avec soin, mais une rencontre reste une rencontre.",
            "Que vous ne recroisiez jamais une personne déjà rencontrée — nous l'évitons quand c'est possible.",
          ],
        ],
      },
      {
        title: "5. Conditions pour s'inscrire et compte",
        body: [
          [
            "Avoir 18 ans ou plus, et utiliser le service à titre personnel (et non professionnel).",
            "Ne pas avoir été exclu auparavant, sauf accord écrit de notre part.",
            "Fournir des informations exactes et à jour, sous votre vrai prénom ; un seul compte par personne. Nous pouvons vous demander de confirmer votre identité ou votre âge en cas de doute.",
            "Vos identifiants sont personnels : vous êtes responsable de leur confidentialité et de l'activité de votre compte. Prévenez-nous immédiatement en cas d'utilisation non autorisée.",
            "La confirmation de l'adresse e-mail et le questionnaire de profil sont nécessaires pour réserver. Vos réponses peuvent être modifiées à tout moment.",
            "Certaines expériences demandent un âge minimum plus élevé, indiqué sur leur fiche : il est vérifié à la réservation à partir de votre date de naissance.",
          ],
          "Si vous ne remplissez plus ces conditions, votre accès peut prendre fin.",
        ],
      },
      {
        title: "6. Réservations, demandes et listes d'attente",
        body: [
          "Une expérience se réserve directement ou, si elle est « sur demande », après validation de votre demande par l'équipe. Quand une date est complète, vous pouvez rejoindre la liste d'attente. Le fonctionnement détaillé (prix, délais de paiement, annulation, remboursement) figure dans les [conditions générales de vente](/cgv).",
          "Pour les activités physiques (running, padel, yoga, randonnée…), réserver ou demander à participer implique d'accepter les [conditions de participation aux activités physiques](/conditions-activites-physiques).",
        ],
      },
      {
        title: "7. Composition des groupes",
        body: [
          "Les groupes sont composés à partir de votre ville, de vos langues, de votre âge, de vos centres d'intérêt et de vos réponses au questionnaire, en évitant de réunir les mêmes personnes, afin que chacun puisse participer à la conversation. Une personne de l'équipe relit chaque composition. Ce n'est ni une évaluation psychologique ni un jugement sur votre personne.",
          "Certaines expériences comportent aussi un court questionnaire (10 questions au plus, uniquement à choix : niveau, allure, envies…) à remplir pendant la réservation, avant le paiement. Selon l'expérience, les réponses servent à réunir des niveaux proches (ex. au padel) ou à mélanger les profils ; elles ne sont jamais montrées aux autres participants et sont effacées 30 jours après l'expérience.",
        ],
      },
      {
        title: "8. Règles de conduite",
        body: [
          "Chaque membre respecte les [règles de la communauté](/charte) et les consignes de la page [Sécurité](/securite), ainsi que la loi et le règlement des lieux. Il est notamment interdit :",
          [
            "de harceler, menacer, intimider, discriminer ou avoir un comportement sexuel non consenti ;",
            "de demander à d'autres membres des informations personnelles ou financières, ou de l'argent ;",
            "d'utiliser le compte d'une autre personne ou d'en créer plusieurs, y compris après une suspension ;",
            "de démarcher les participants (vente, recrutement, promotion, campagne ou propagande) ;",
            "de venir accompagné d'une personne qui ne figure pas sur la réservation ;",
            "de partager des informations sur la vie privée d'autres membres, ou des photos d'eux sans leur accord ;",
            "de publier des contenus illicites, haineux, trompeurs ou portant atteinte aux droits d'autrui ;",
            "d'utiliser des robots, d'extraire des données du site ou de nuire à son fonctionnement ou à sa réputation.",
          ],
        ],
      },
      {
        title: "9. Fiabilité : annulations tardives et absences",
        body: [
          "Une place réservée est une place refusée à quelqu'un d'autre. En cas d'annulations tardives ou d'absences répétées, l'équipe peut limiter votre accès (expériences sur demande, liste d'attente) ou suspendre temporairement votre compte, après vous avoir prévenu. Les conséquences financières sont décrites dans les conditions générales de vente.",
        ],
      },
      {
        title: "10. Photos et vidéos",
        body: [
          "Nous pouvons photographier ou filmer certaines expériences pour en partager l'ambiance. Nous ne publions aucune image où vous êtes reconnaissable sans votre accord préalable, demandé séparément de ces conditions. Vous pouvez retirer cet accord à tout moment en écrivant à {{supportEmail}} : nous retirons alors l'image de nos supports dans un délai raisonnable.",
          "De votre côté, demandez l'accord des personnes concernées avant de publier une photo ou une vidéo d'elles.",
        ],
      },
      {
        title: "11. Contenus publiés par les membres",
        body: [
          "Les avis, la photo de profil, la biographie et les messages joints aux demandes restent sous votre responsabilité. Vous accordez à Wenzy, gratuitement et pour la durée nécessaire, une licence non exclusive pour les héberger et les afficher dans le cadre du service (vos avis sont signés de votre prénom et de l'initiale de votre nom). L'équipe peut masquer un contenu inapproprié, faux ou contraire à la loi.",
          "Avis : une photo jointe n'est publiée qu'après vérification par l'équipe (n'y montrez personne sans son accord). Un avis de 2 étoiles ou moins, ou qui contient des propos injurieux ou des coordonnées personnelles, est relu par l'équipe avant publication : il est publié s'il respecte nos règles, même s'il est négatif. Un avis reste possible après un remboursement accordé pour une expérience à laquelle vous étiez inscrit·e. L'organisateur de l'activité et l'équipe peuvent répondre publiquement sous votre avis. Tout membre ou organisateur peut signaler un avis ; un signalement ne le masque pas automatiquement : l'équipe vérifie et décide, et chaque décision est conservée dans l'historique de l'avis.",
        ],
      },
      {
        title: "12. Signalements, sanctions et recours",
        body: [
          "Tout comportement inapproprié peut être signalé. Selon la gravité, l'équipe peut avertir, restreindre, suspendre ou exclure un membre ; les faits graves entraînent une exclusion immédiate (détail dans les [règles de la communauté](/charte)). Toute suspension ou exclusion vous est notifiée par e-mail, avec la règle concernée.",
          "Vous pouvez la contester en écrivant à {{supportEmail}} dans les 7 jours suivant la notification. Le recours est examiné par une personne qui n'a pas pris la première décision, et la réponse est motivée. Chaque décision est enregistrée.",
        ],
      },
      {
        title: "13. Propriété intellectuelle",
        body: ["La marque Wenzy, le site, ses textes, visuels, logiciels et sa présentation sont protégés. Vous bénéficiez d'un droit d'utilisation personnel, non transférable et non commercial ; toute reproduction ou extraction sans autorisation est interdite."],
      },
      {
        title: "14. Responsabilités",
        body: [
          "Wenzy organise les expériences avec soin, sélectionne ses lieux partenaires, prend des mesures raisonnables de sécurité et informe les participants de tout changement. Nous ne pouvons toutefois garantir qu'une rencontre entre personnes soit sans aucun risque. Dans les limites permises par la loi, nous ne répondons pas des actes des participants, des prestations des lieux partenaires (repas, boissons, activités) ni des cas de force majeure. Les textes et photos de présentation sont indicatifs. Chaque participant reste responsable de son comportement et de sa consommation.",
        ],
      },
      {
        title: "15. Durée, suppression du compte et suspension",
        body: [
          "Vous pouvez demander la suppression de votre compte à tout moment depuis vos préférences. Nous pouvons suspendre ou fermer un compte qui enfreint ces conditions ou qui présente un risque pour la communauté.",
        ],
      },
      { title: "16. Données personnelles", body: ["Le traitement de vos données est décrit dans la [politique de confidentialité](/confidentialite), conformément à la loi n° 09-08."] },
      { title: "17. Modifications", body: ["Ces conditions peuvent évoluer. La version applicable est celle publiée sur le site, avec sa date d'entrée en vigueur. En cas de changement important, vous en êtes informé par e-mail avant son entrée en vigueur et votre accord peut vous être redemandé ; les simples corrections de forme peuvent intervenir à tout moment."] },
      {
        title: "18. Droit applicable et litiges",
        body: [
          "Ces conditions sont soumises au droit marocain. Si vous êtes consommateur, vous bénéficiez des dispositions protectrices de la loi n° 31-08 édictant des mesures de protection du consommateur.",
          "En cas de désaccord, écrivez d'abord à {{supportEmail}} pour rechercher une solution amiable. À défaut d'accord, les tribunaux de Casablanca sont compétents, sous réserve des règles impératives applicables aux consommateurs.",
        ],
      },
    ],
  },
  sales: {
    "title": "Conditions générales de vente",
    "updated": UPDATED_FR,
    "intro": "Ces conditions s'appliquent à toute réservation et à l'achat d'un Carnet ou d'un Pass sur Wenzy. Le prix, ce qui se règle sur place et les conditions d'annulation sont toujours affichés avant le paiement.",
    "sections": [
      {
        "title": "1. Vendeur",
        "body": [
          "{{publisher}}, {{address}} — ICE {{ice}}. Contact : {{supportEmail}}."
        ]
      },
      {
        "title": "2. Prix : 35 DH en ligne, le reste sur place",
        "body": [
          "Sur Wenzy, vous ne payez en ligne que les frais Wenzy : un prix unique par place (35 DH à ce jour, affiché avant le paiement), toutes taxes comprises. Il rémunère l'organisation : la composition des groupes, le lieu, l'accueil et le suivi.",
          "Tout le reste se règle sur place, directement au lieu ou à l'organisateur, et n'est jamais encaissé par Wenzy : votre consommation au restaurant (la gamme Casual, Premium ou Exclusive indique un budget), ou le prix de l'activité affiché sur la fiche (padel, cours, atelier…). Ce montant ne figure pas sur notre facture et n'est pas dû si votre réservation est annulée.",
          "Un code promo porte sur les frais Wenzy, une fois par personne, dans les conditions indiquées avec le code."
        ]
      },
      {
        "title": "3. Réservation et paiement",
        "body": [
          [
            "La place est bloquée le temps du paiement (15 minutes par carte ; jusqu'à l'échéance indiquée pour un virement), puis remise en vente si le paiement n'a pas abouti.",
            "Le questionnaire de l'activité, s'il y en a un, se remplit avant le paiement.",
            "Événement sur demande : aucun paiement à la demande ; si elle est acceptée, la place est réservée 24 heures pour payer.",
            "Liste d'attente : une place libérée est proposée en priorité aux personnes qui ont un Pass, puis dans l'ordre d'inscription, et réservée 4 heures pour payer.",
            "Virement bancaire : une référence unique et les coordonnées de Wenzy vous sont communiquées ; la réservation est confirmée dès réception du virement du montant exact. Non reçu à l'échéance, la place est libérée ; un virement arrivé ensuite donne droit à une place s'il en reste, sinon il est remboursé.",
            "Paiement par carte : auprès d'un prestataire sécurisé ; Wenzy ne reçoit ni ne conserve aucune donnée de carte.",
            "Les rendez-vous de la semaine (le Dîner du mercredi, l'activité du samedi, le Café du samedi, le Brunch du dimanche) : une seule date est ouverte à la fois (pour l'activité du samedi, une seule pour toute la rotation) et ses réservations ferment la veille à 20h30 ; la date suivante s'ouvre alors (avec un Pass, une semaine plus tôt).",
            "Tables : vous choisissez votre gamme (Casual, Premium ou Exclusive), qui fixe le type de restaurant et le budget sur place. Si vous acceptez la gamme voisine, vous pouvez y être placé·e quand votre gamme n'a pas assez d'inscrits ; sinon, l'article 5 s'applique. Les autres Tables ferment 12 heures avant le début (au plus tard la veille à 18 h pour un début avant 14 h) ; les autres activités, 2 heures avant."
          ]
        ]
      },
      {
        "title": "4. Annulation et changement de date par le participant",
        "body": [
          "Vous pouvez toujours annuler depuis votre réservation. Les frais Wenzy sont remboursés selon les conditions d'annulation de l'événement, affichées avant la réservation (la plus courante : remboursement intégral jusqu'à 48 heures avant, aucun remboursement ensuite). Le montant remboursé est indiqué avant que vous confirmiez.",
          "Jusqu'à la fermeture des réservations, vous pouvez déplacer votre réservation sur une autre date du même rendez-vous, sans repayer, s'il reste de la place. En cas d'annulation ensuite, le remboursement reste calculé sur votre date d'origine (déplacer puis annuler ne rembourse pas davantage qu'annuler à la date d'origine). Chaque changement est confirmé par e-mail, avec l'invitation agenda mise à jour.",
          "Le remboursement se fait sur le moyen de paiement d'origine (par virement pour un paiement par virement)."
        ]
      },
      {
        "title": "5. Annulation, minimum non atteint ou changement par Wenzy",
        "body": [
          "Si Wenzy annule un événement, les frais Wenzy sont intégralement remboursés.",
          "S'il n'y a pas assez d'inscrits pour former une table ou un groupe, Wenzy peut maintenir l'événement, vous proposer une autre date ou un événement équivalent (même format, même gamme). Vous acceptez la proposition, sans repayer, ou vous êtes intégralement remboursé·e ; vous n'êtes jamais déplacé·e sans votre accord, et sans réponse à l'heure indiquée, vous êtes remboursé·e.",
          "Le lieu des Tables est choisi après la fermeture des réservations, parmi nos lieux partenaires, puis révélé 5 heures avant le début (la veille à 21 h pour un début le matin ou le midi). Plusieurs lieux peuvent accueillir les tables d'une même date. Si un lieu change après la révélation, les personnes concernées sont prévenues aussitôt."
        ]
      },
      {
        "title": "6. Carnet et Pass",
        "body": [
          [
            "Carnet : 3 crédits valables 3 mois à compter de l'achat ; 1 crédit par place, invité compris. Un crédit revient si vous annulez dans les délais remboursés de l'événement, ou si la place n'est pas payée à temps. Un nouveau carnet ajoute ses crédits et repousse leur validité à 3 mois.",
            "Pass (1 semaine, 1 mois, 3 mois, 6 mois ou 1 an) : votre place est incluse à chaque réservation (la place d'un invité se paie ou se règle avec un crédit du carnet), avec l'accès en avant-première aux nouvelles dates, les événements réservés aux abonnés et la priorité sur la liste d'attente. Le pass couvre 2 réservations à venir au maximum à la fois, et seulement les événements qui ont lieu pendant sa période de validité.",
            "Le Carnet et le Pass couvrent les frais Wenzy, y compris pour les activités des organisateurs ; ils ne couvrent jamais ce qui se règle sur place.",
            "Paiement en une fois, sans renouvellement automatique. Un nouveau pass prolonge le pass en cours. Le pass semaine ne se paie que par carte.",
            "Droit de rétractation : dans les 7 jours suivant l'achat, si le Carnet ou le Pass n'a pas encore servi (aucun crédit utilisé, aucune place couverte), le bouton « Me rétracter » de la page Carnet et Pass l'annule et vous rembourse intégralement ; un avoir est émis."
          ]
        ]
      },
      {
        "title": "7. Check-in et absences",
        "body": [
          "Le jour J, vous indiquez votre arrivée depuis votre réservation (« check-in »), de 30 minutes avant à 1 heure après le début ; avec une hôtesse ou un organisateur, c'est son pointage qui fait foi.",
          "Sans check-in, la place est notée comme une absence et n'est pas remboursée. Pour une place incluse dans un Pass : une première absence donne un avertissement ; une deuxième dans les 90 jours suspend le pass pendant 14 jours (vous pouvez toujours réserver, mais vos places ne sont plus incluses). Si vous étiez bien présent·e, écrivez-nous : l'absence est annulée. Une place incluse dans votre Pass que vous annulez à moins de 24 heures du début compte aussi comme une absence."
        ]
      },
      {
        "title": "8. Facturation",
        "body": [
          "Une facture est émise pour chaque paiement en ligne (frais Wenzy, Carnet ou Pass) et disponible dans votre espace, rubrique « Mes factures ». Un avoir est émis pour chaque remboursement. Ce qui se règle sur place est facturé, le cas échéant, par le lieu ou l'organisateur."
        ]
      },
      {
        "title": "9. Réclamations et droit applicable",
        "body": [
          "Pour toute réclamation : {{supportEmail}}. Nous répondons sous 72 heures ouvrées. Ces conditions sont soumises au droit marocain, notamment à la loi n° 31-08 édictant des mesures de protection du consommateur ; à défaut d'accord amiable, les tribunaux compétents sont ceux de Casablanca."
        ]
      }
    ]
  },

  privacy: {
    title: "Politique de confidentialité",
    updated: UPDATED_FR,
    intro:
      "Cette politique explique quelles données nous collectons, comment, pourquoi, combien de temps nous les gardons, avec qui elles sont partagées et comment exercer vos droits, conformément à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel. Elle s'applique au site Wenzy, à l'espace membre et à tous les services qui y sont accessibles.",
    sections: [
      {
        title: "1. L'essentiel",
        body: [
          [
            "Nous collectons uniquement ce qui est utile pour organiser des expériences en petit groupe, en sécurité.",
            "Nous ne vendons jamais vos données et n'utilisons aucun cookie publicitaire ni votre position GPS.",
            "Au sein d'un groupe, seuls votre prénom, votre photo de profil (si vous en avez mis une) et vos centres d'intérêt sont partagés.",
            "Votre régime et vos allergies ne sont transmis au lieu qu'avec votre accord explicite.",
            "Aucune photo où vous êtes reconnaissable n'est publiée sans votre accord.",
            "Vous pouvez à tout moment consulter, corriger ou télécharger vos données et supprimer votre compte.",
          ],
        ],
      },
      {
        title: "2. Responsable du traitement",
        body: [
          "{{publisher}}, {{address}} (ICE {{ice}}), est responsable des données traitées sur le site. Pour toute question relative à vos données : {{privacyEmail}}.",
          "Déclaration des traitements auprès de la CNDP : {{cndpDeclaration}}. Autorisation de transfert des données hors du Maroc : {{cndpTransfer}}.",
          "Il vous appartient de nous fournir des informations exactes et de les tenir à jour depuis votre espace membre.",
        ],
      },
      {
        title: "3. Données collectées",
        body: [
          [
            "Compte : prénom, nom, adresse e-mail, téléphone (facultatif). Le mot de passe est géré par notre prestataire d'authentification et n'est jamais stocké en clair.",
            "Profil et questionnaire : date de naissance (pour vérifier la majorité), ville, langues parlées, centres d'intérêt, objectifs ; genre (facultatif ; nécessaire pour réserver une activité réservée aux femmes), profession, biographie, photo, quartier, univers préférés, niveau sportif et préférence d'âge pour son groupe, ambiance de groupe souhaitée, façon d'être en groupe, humour, ce qui compte pour vous, fréquence sportive, type d'adresse, alimentation, secteur d'activité, comment vous nous avez connus, usage de WhatsApp et compte Instagram (facultatifs ; utilisés pour composer les groupes et pour les suggestions « Pour vous », jamais montrés aux autres participants). Nous ne demandons ni situation amoureuse, ni enfants, ni religion. Le questionnaire n'est ni une évaluation médicale ni une évaluation psychologique.",
            "Localisation approximative : votre ville et, si vous l'indiquez, votre quartier. Aucun suivi GPS.",
            "Expériences : réservations, demandes de participation (message, compte Instagram facultatif), listes d'attente, tables ou équipes, présence le jour J, absences, avis (et photo jointe, publiée seulement après vérification par l'équipe), « Mon groupe » (les personnes que vous aimeriez revoir — jamais montré à la personne sauf si c'est réciproque — et celles avec qui vous ne voulez plus être réuni·e), abonnement, codes promo utilisés.",
            "Préférences d'accueil : régime alimentaire, allergies et langue(s) souhaitée(s), si vous les indiquez, avec la date de votre accord pour leur transmission au lieu.",
            "Questionnaire d'une expérience : vos réponses (uniquement des choix : niveau, allure, envies…), si l'expérience en comporte un.",
            "Activités physiques : la version des conditions de participation que vous avez acceptée et sa date.",
            "Tables : votre check-in (heure d'arrivée), un résumé de votre table sans les noms (âges, langues, secteurs, centres d'intérêt des autres convives), les messages échangés avec votre table après la rencontre, et les signalements que vous faites ou qui vous concernent (lus par l'équipe seulement). Une heure avant, le lieu reçoit le prénom de chaque convive et, si vous l'avez accepté, votre régime et vos allergies.",
            "Paiements et factures : montant, date, statut, référence du prestataire, documents émis. Les données de carte bancaire sont saisies et traitées uniquement par le prestataire de paiement : nous ne les recevons jamais.",
            "Sécurité et assistance : signalements, messages envoyés à l'équipe, décisions de modération et recours.",
            "Données techniques : adresse IP, journaux de connexion et de sécurité, cookies strictement nécessaires.",
          ],
        ],
      },
      {
        title: "4. Comment nous les recueillons",
        body: [
          [
            "Directement auprès de vous : création du compte, questionnaire, réservation, demande de participation, formulaire de contact ou de candidature partenaire, signalement, avis.",
            "Automatiquement : journaux techniques et cookies strictement nécessaires lorsque vous utilisez le site.",
            "Par nos prestataires : le prestataire de paiement nous confirme le statut et la référence de chaque paiement.",
            "Par notre équipe : présence le jour J, composition des groupes, décisions de modération.",
          ],
        ],
      },
      {
        title: "5. Pourquoi, sur quelle base, et combien de temps",
        body: [
          {
            table: {
              head: ["Finalité", "Base légale", "Durée de conservation"],
              rows: [
                ["Créer et gérer votre compte", "Exécution du contrat", "Tant que le compte est actif, puis 3 ans après la dernière activité, avant suppression ou anonymisation."],
                ["Réserver, payer, être remboursé, recevoir confirmations, rappels et changements", "Exécution du contrat", "Durée de la relation ; les pièces comptables suivent la durée légale (ligne « Obligations légales »)."],
                ["Composer les tables et équipes, sans réunir toujours les mêmes personnes", "Exécution du contrat ; intérêt légitime", "Durée du compte (l'historique des groupes sert à proposer de nouvelles rencontres)."],
                ["Transmettre régime, allergies et langues souhaitées au lieu", "Votre consentement explicite (le régime et les allergies peuvent révéler une donnée de santé)", "Le temps de l'expérience et de son suivi, puis effacement au plus tard 30 jours après l'expérience. Vous pouvez retirer votre accord jusqu'au début de l'expérience."],
                ["Composer les groupes à partir du questionnaire d'une expérience (niveau, allure, envies…)", "Exécution du contrat", "Jusqu'à l'expérience, puis effacement automatique 30 jours après l'expérience."],
                ["Conserver la preuve de l'acceptation des conditions de participation aux activités physiques", "Intérêt légitime (preuve en cas de litige)", "Avec la réservation, 5 ans au plus après l'expérience."],
                ["Composer les tables, révéler le lieu, transmettre au lieu les prénoms et allergies partagées, traiter les signalements", "Exécution du contrat ; intérêt légitime (sécurité)", "Messages de table : 14 jours après leur ouverture ; signalements : 3 ans."],
                ["Protéger la communauté : vérification de l'âge, prévention des faux comptes et de la fraude, signalements, modération, recours", "Intérêt légitime ; obligations légales", "Le temps nécessaire à la sécurité de la communauté, 3 ans au plus après la décision."],
                ["Répondre à vos messages et demandes d'assistance", "Intérêt légitime", "3 ans après le dernier échange."],
                ["Vous envoyer nos nouveautés par e-mail", "Votre consentement, retirable à tout moment dans vos préférences", "Jusqu'au retrait de votre accord, ou 3 ans après votre dernier contact avec nous."],
                ["Vous prévenir par e-mail des nouvelles expériences (alerte de l'accueil ou de vos préférences)", "Votre consentement (sans compte : confirmé par un lien reçu par e-mail)", "Jusqu'à l'arrêt des alertes (lien dans chaque e-mail, ou vos préférences) ; une inscription non confirmée est effacée au bout de 7 jours."],
                ["Publier des photos ou vidéos d'expériences où vous êtes reconnaissable", "Votre consentement, demandé séparément", "Jusqu'au retrait de votre accord."],
                ["Assurer la sécurité et le bon fonctionnement du site", "Intérêt légitime", "Journaux techniques et de sécurité : 12 mois."],
                ["Obligations légales (comptabilité, demandes des autorités)", "Obligation légale", "Pièces comptables (paiements, factures, avoirs) : 10 ans, conformément à la loi n° 9-88 relative aux obligations comptables."],
                ["Traiter vos demandes d'exercice de droits", "Obligation légale", "Le temps de traiter la demande ; un éventuel justificatif d'identité est supprimé dès la vérification faite."],
              ],
            },
          },
        ],
      },
      {
        title: "6. Composition des groupes : en toute transparence",
        body: [
          "Un outil propose une composition des tables et des équipes à partir de vos langues, de votre âge, de vos centres d'intérêt, de vos réponses facultatives de l'inscription (ambiance, façon d'être en groupe, humour, budget, rythme sportif, secteur) et de vos réponses au questionnaire, en évitant de réunir des personnes qui se sont déjà rencontrées. Notre équipe relit et ajuste chaque composition : aucune n'est révélée sans validation humaine. Vous pouvez modifier vos réponses à tout moment ; certaines informations restent nécessaires au fonctionnement du service (âge, ville, langues). En savoir plus : [comment nous composons les groupes](/blog/comment-nous-composons-les-tables).",
          "Pour certaines expériences, vos réponses au questionnaire de l'expérience (niveau, allure…) servent aussi à réunir des niveaux proches ou à mélanger les profils. Le calcul est fait sur nos propres serveurs, sans service d'intelligence artificielle externe ; vos réponses ne sont jamais montrées aux autres participants et sont effacées 30 jours après l'expérience.",
        ],
      },
      {
        title: "7. Cookies",
        body: [
          "Nous utilisons uniquement des cookies strictement nécessaires : maintien de votre connexion et mémorisation de la langue. Ils ne nécessitent pas votre consentement. Nous n'utilisons aucun cookie de mesure d'audience, de personnalisation ou de publicité ; si cela devait changer, votre consentement serait demandé au préalable.",
        ],
      },
      {
        title: "8. Qui y a accès",
        body: [
          [
            "Notre équipe, uniquement les personnes qui en ont besoin (assistance, sécurité, modération, technique), selon leur rôle ; ces accès sont enregistrés.",
            "Les autres participants de votre groupe : uniquement votre prénom, votre photo de profil (si vous en avez mis une) et vos centres d'intérêt, une fois le groupe révélé.",
            "Le lieu qui accueille l'expérience : le nombre de participants, les prénoms pour l'accueil et les marque-places et, avec votre accord, votre régime, vos allergies et vos langues souhaitées. Jamais vos coordonnées.",
            "L'organisateur d'une activité que vous réservez (activités proposées par des organisateurs) : votre prénom, l'initiale de votre nom et votre numéro de téléphone, pour vous accueillir et vous joindre au sujet de l'activité, jusqu'à 7 jours après la date. Il ne peut pas les exporter ni les utiliser à d'autres fins.",
            "Les autorités, lorsque la loi l'exige.",
          ],
          "Nos prestataires traitent les données pour notre compte, selon nos instructions et avec des garanties de sécurité :",
          {
            table: {
              head: ["Prestataire", "Rôle", "Localisation"],
              rows: [
                ["Google Cloud (Firebase)", "Hébergement du site, base de données, authentification, stockage des fichiers", "Union européenne (Belgique, Pays-Bas)"],
                ["Brevo", "Envoi des e-mails (confirmations, rappels, factures)", "Union européenne (France)"],
                ["Prestataire de paiement", "Saisie et traitement des paiements par carte (nous ne recevons jamais vos données de carte)", "Précisé ici dès sa mise en place"],
              ],
            },
          },
          "Nous ne vendons jamais vos données.",
          "Cartes : sur la fiche d'une activité, la carte (OpenStreetMap) ne se charge que si vous cliquez sur « Afficher la carte » ; votre navigateur contacte alors les serveurs d'OpenStreetMap, qui reçoivent votre adresse IP. Le lien « Itinéraire » ouvre Google Maps, soumis à ses propres règles.",
        ],
      },
      {
        title: "9. Transferts hors du Maroc",
        body: ["Vos données sont hébergées dans l'Union européenne. Ce transfert hors du Maroc est encadré conformément à la loi n° 09-08 et aux procédures de la CNDP ({{cndpTransfer}}), et nos prestataires sont tenus contractuellement de protéger vos données."],
      },
      {
        title: "10. Sécurité",
        body: [
          "Nous appliquons des mesures techniques et organisationnelles adaptées : échanges chiffrés (HTTPS), mots de passe jamais stockés en clair, accès limités selon les rôles et enregistrés, règles d'accès à la base de données, aucune donnée de carte conservée, sauvegardes.",
          "De votre côté, gardez votre mot de passe confidentiel et déconnectez-vous sur un appareil partagé.",
        ],
      },
      {
        title: "11. Vos droits",
        body: [
          "Conformément à la loi n° 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition, notamment à la prospection. Vous pouvez aussi demander la suppression de vos données et retirer à tout moment un consentement donné (sans remettre en cause ce qui a été fait avant).",
          [
            "Depuis votre espace membre : modifier votre profil et vos réponses, gérer vos préférences d'e-mails, télécharger vos données, demander la suppression de votre compte.",
            "Pour toute autre demande : {{privacyEmail}}. Nous pouvons vous demander de justifier de votre identité en cas de doute.",
            "Nous répondons dans les meilleurs délais, et au plus tard dans un délai d'un mois.",
          ],
          "Vous pouvez également saisir la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP, www.cndp.ma).",
        ],
      },
      {
        title: "12. Mineurs et protection de l'enfance",
        body: [
          "Le service est réservé aux personnes majeures (18 ans et plus). Si un compte semble appartenir à un mineur, nous pouvons le suspendre et procéder à des vérifications.",
          "Nous appliquons une tolérance zéro envers toute exploitation ou mise en danger de mineurs : tout contenu ou comportement de ce type entraîne la fermeture immédiate du compte, la conservation sécurisée des éléments utiles et un signalement aux autorités compétentes. Pour nous alerter : {{safetyEmail}}.",
        ],
      },
      { title: "13. Modifications", body: ["Cette politique peut évoluer avec le service et la réglementation. La version applicable est celle publiée sur le site, avec sa date de mise à jour ; en cas de changement important, vous en êtes informé par e-mail."] },
    ],
  },
};

const UPDATED_EN = "Last updated: 23 November 2026 · effective the same day";

const en: Record<BaseLegalKey, LegalDoc> = {
  physical: {
    "title": "Terms for physical activities",
    "updated": UPDATED_EN,
    "intro": "These terms apply to experiences marked “Physical activity” on their page: sport, padel, running, yoga, hiking, dance… You accept them when you book or request to take part. They complete the [terms of use](/cgu), the [terms of sale](/cgv) and our [safety](/securite) advice.",
    "sections": [
      {
        "title": "1. What these terms are for",
        "body": [
          "A physical activity requires effort and carries its own risks (falls, sprains, knocks, fatigue). These terms tell you about those risks, set out the rules that help limit them and explain each party's role: you, the partner venue and Wenzy."
        ]
      },
      {
        "title": "2. Your health",
        "body": [
          [
            "By booking, you confirm you are fit to take part and know of no reason not to.",
            "If in doubt (heart or breathing condition, recent injury, pregnancy, ongoing treatment…), ask a doctor before booking.",
            "If something bothers you on the day, tell the coach or the team discreetly: you can reduce the effort or stop at any time.",
            "Don't send us any medical certificate or document: we don't collect information about your health."
          ]
        ]
      },
      {
        "title": "3. Your level",
        "body": [
          "The expected level is shown on the page. Choose a suitable activity and answer the experience questionnaire honestly (level, pace…): it places you with people at your level, for everyone's enjoyment and safety."
        ]
      },
      {
        "title": "4. During the activity",
        "body": [
          [
            "Follow the instructions of the coach and the venue, and the rules of the game.",
            "Wear the required outfit and protective gear (for example, suitable shoes for padel) and use equipment as instructed.",
            "Warm up, drink water and go at your own pace: nobody has to keep up at all costs.",
            "No alcohol or substances before or during the activity. The coach or the team may refuse to let someone take part if they put themselves or others in danger.",
            "Respect other participants and their level: fair play is part of the experience."
          ]
        ]
      },
      {
        "title": "5. The risks of the activity",
        "body": [
          "Despite these precautions, a physical activity carries normal, foreseeable risks: sore muscles, falls, sprains, bruises (for example, being hit by a padel ball), fatigue. You take part knowing these risks."
        ]
      },
      {
        "title": "6. Who does what",
        "body": [
          [
            "Wenzy organises the experience, chooses partner venues and checks that they have liability insurance.",
            "The partner venue is responsible for its facilities, its equipment and, where relevant, the coaching of the activity.",
            "You are responsible for your behaviour, for following instructions and for any damage you cause to other people or equipment.",
            "We advise you to have personal insurance (personal accident, liability): check your policies."
          ],
          "Nothing in these terms limits Wenzy's or the partner venue's liability for their own faults, or your rights under the law."
        ]
      },
      {
        "title": "7. Minimum age and weather",
        "body": [
          "Our experiences are for people aged 18 and over; some activities require a higher minimum age, shown on their page and checked when you book. For an outdoor activity, if the weather doesn't allow it to be done safely, it is postponed or cancelled according to the [terms of sale](/cgv)."
        ]
      },
      {
        "title": "8. If there's an accident",
        "body": [
          "Tell the coach, the venue staff or the team immediately. In an emergency in Morocco: 15 (Civil Protection, emergency help), 19 (police), 112 from a mobile. Afterwards, report what happened from your booking: we look into it with the venue and get back to you."
        ]
      },
      {
        "title": "9. Your agreement",
        "body": [
          "The version of these terms you accept and its date are recorded with your booking. A new version applies to bookings made after it is published."
        ]
      }
    ]
  },
  safety: {
    title: "Safety",
    updated: UPDATED_EN,
    intro:
      "Meeting new people should feel exciting, never worrying. Every Wenzy experience happens in a group, in a public place or at a selected partner venue, with safeguards built in from the start. This page explains what we do to protect you, and what you can do to look after yourself and others.",
    sections: [
      {
        title: "Our principles",
        body: [
          [
            "Safety before growth: when there is a risk, we always choose the most careful option, even if it costs us a booking or a member.",
            "Friendship first: Wenzy is not a dating app. Pushiness, romantic or sexual pressure and repeated unwanted advances are prohibited.",
            "Adults only: the service is for people aged 18 and over. An account that seems to belong to a minor may be restricted, verified or removed.",
            "Real people: everyone uses their real first name. Fake profiles, impersonation and multiple accounts are prohibited; we may ask for verification if in doubt.",
          ],
        ],
      },
      {
        title: "What we do",
        body: [
          [
            "Always in public places or at selected partners (restaurants, studios, workshops) — never at a participant's home.",
            "For dinners and group activities, small groups put together and reviewed by our team: less pressure, nobody left out.",
            "Some experiences are “on request”: the team approves each participant.",
            "The bare minimum is shared: your group only sees your first name, your profile photo (if you added one) and your interests. No phone number, email or surname.",
            "No private messaging between participants: you meet in person first, in a public place.",
            "Every member accepts our [community rules](/charte) before booking, and every report is read by a person on our team.",
          ],
        ],
      },
      {
        title: "Before the experience",
        body: [
          [
            "Tell someone close: let them know where you're going and when you expect to be back.",
            "Plan your way there and back before you leave, especially in the evening or if you might have a drink.",
            "A specific need (mobility, hearing, sight, diet, allergy)? Mention it when booking, under “For your welcome”, or write to us as early as possible so we can take it into account for the venue and your group.",
            "Book and pay only on our official website. We never ask you to pay by bank transfer, by message or in cash to a stranger. Be wary of pages or accounts imitating our name.",
            "Before the experience, we send you what you need (venue, time and, depending on the format, your table or team). Your contact details are never shared with other participants.",
          ],
        ],
      },
      {
        title: "During the experience",
        body: [
          [
            "Everything is optional. You can leave at any time without explaining why. Nobody can push you to drink, stay, share your contact details or do anything at all: “no” is a complete answer.",
            "Keep your drink and belongings in sight, wherever you are.",
            "Alcohol is never required and non-alcoholic drinks are always available. Staying clear-headed keeps you in charge of your evening.",
            "Your first name is enough. Address, workplace, phone, social media: share them only if and when you decide to.",
            "Allergy or intolerance: confirm it directly with the waiter or staff rather than relying on the menu alone.",
            "Feeling unwell or uncomfortable? Talk to the venue staff or the organiser, or contact our team.",
          ],
        ],
      },
      {
        title: "Outings, sport and outdoor activities",
        body: [
          [
            "Be visible: in the evening or early morning, wear light colours and stay on well-lit paths.",
            "Keep one ear free: if you listen to music, keep the volume low so you can hear traffic and the group.",
            "Bring the essentials: a charged phone, water, ID or the number of someone to contact.",
            "Go at your own pace: nobody has to keep up at all costs. Dizzy, overheated, in pain? Stop and say so.",
            "Mind the weather: in strong heat, drink before you arrive, protect yourself from the sun and slow down; in rain, wear suitable shoes.",
            "Stay together: a walk isn't a race. Look out for each other and help anyone in difficulty get home safely.",
            "Level and questionnaire: answer the experience questionnaire honestly (level, pace…); it places you with people at your level, for everyone's enjoyment and safety.",
            "Equipment and outfit: follow what the page says (equipment provided, what to bring, suggested outfit) and the instructions of the coach or venue (warm-up, protective gear, game rules).",
            "Physical activities: before booking, you accept our [terms for physical activities](/conditions-activites-physiques). If you have any doubt about your health, ask a doctor before coming.",
            "Outdoors: if the weather doesn't allow the activity, we postpone or cancel it, and you're refunded if the new date doesn't suit you (see the [terms of sale](/cgv)).",
          ],
        ],
      },
      {
        title: "In an emergency",
        body: [
          "If someone's life or safety is at risk, call the emergency services first, then let us know:",
          ["Police: 19", "Royal Gendarmerie (outside cities): 177", "Civil protection (fire, ambulance): 15", "From a mobile phone, 112 also connects you to emergency services"],
          "This includes someone feeling unwell during the experience, a person in distress, a participant who can't be found after an experience, or a threat against a venue or a group. Venue staff know the exact address: ask them to help guide the emergency services.",
          "Not sure it's serious? Tell us anyway: we would rather hear about something that turns out to be fine than miss a real emergency.",
        ],
      },
      {
        title: "After the experience",
        body: [
          [
            "Stay in touch at your own pace: share your contact details only with people you trust.",
            "Never send money. Don't lend anything or share bank details, codes or gift cards with someone you met through Wenzy, however moving their story. It's the most common scam: report it to us.",
            "Get home safely: don't drive after drinking and don't get in a car with someone who has. Take a taxi, a ride-hailing app or the tram.",
          ],
        ],
      },
      {
        title: "Report a problem",
        body: [
          "During or after an experience, report any behaviour through the “Report someone's behaviour” link on your booking, to {{safetyEmail}} or via the Contact page. You can report what happened to you or what you witnessed. Tell us the date, the experience and what happened.",
          "Every report is read by the team as quickly as possible (target: within 48 hours) and stays confidential: we never tell the person concerned who reported them.",
        ],
      },
      {
        title: "What we do about it",
        body: [
          "Depending on severity: a warning, a restriction, a temporary suspension or a permanent ban. Serious acts lead to an immediate ban, and we may cooperate with the authorities as provided by law. An account reported by two different people within 90 days can't book while the team reviews the situation; a suspended account loses its upcoming bookings and immediately leaves its tables and their messages. Details, including how to appeal, are in our [community rules](/charte).",
        ],
      },
      {
        title: "Your data and our team",
        body: [
          "We never sell your data. Only team members who need it (support, safety, moderation, technical) can access it, and that access is logged. Details are in the [privacy policy](/confidentialite).",
          "Found a security vulnerability? Write to us privately at {{securityEmail}} and give us time to fix it before talking about it publicly.",
        ],
      },
    ],
  },
  community: {
    title: "Community rules",
    updated: UPDATED_EN,
    intro:
      "Wenzy brings together people who don't know each other around a table, a workshop or an outing. It works because everyone arrives open to others — and it only holds if everyone feels safe and respected. These rules set out what we expect from every member, what we act on when something goes wrong, and what happens next.",
    sections: [
      {
        title: "Where they apply",
        body: [
          [
            "During experiences, from arrival to departure, including what directly follows (a drink afterwards, the journey home).",
            "On the website: profile, reviews, participation requests and exchanges with our team.",
            "Outside Wenzy, when a member contacts another against their wishes after an experience.",
          ],
          "For practical advice before, during and after meeting people, see our [Safety](/securite) page.",
        ],
      },
      {
        title: "How to reach us",
        body: [
          "Report someone's behaviour from your booking (“Report someone's behaviour”), to {{safetyEmail}} or via the Contact page. You can report what happened to you or what you witnessed: every report is handled the same way, whoever files it, and it is read by a person on our team.",
          "If we've taken action on your account and you think we got it wrong, you can appeal (see below).",
        ],
      },
      {
        title: "Your account",
        body: [
          [
            "Be 18 or over. We may ask for proof; an account belonging to a minor is closed.",
            "Use the first name you go by day to day: no pseudonym, joke name or someone else's name.",
            "A photo is optional; if you add one, it must show you, be recent, without heavy filters or text, and never show a child.",
            "A confirmed, accurate email address.",
            "One person, one account.",
          ],
        ],
      },
      {
        title: "Show up, or cancel in time",
        body: [
          "An empty seat is noticed and weighs on the whole group. If you can't come, cancel within the deadlines in the [terms of sale](/cgv) to free up the spot.",
          "Coming with friends? Book their seats in the same booking: the group is put together for a precise number of people, and an unexpected guest would take someone else's place. The person who books makes sure their guests know these rules, and is responsible for them.",
        ],
      },
      {
        title: "Respect other people's privacy",
        body: [
          "You'll learn personal things about the people you meet: handle them with care.",
          [
            "Ask before you post. A photo or video of another member only goes online with their agreement; some people have real reasons to stay private. Don't photograph someone who has asked you not to.",
            "Never use what you learned to find someone: looking up their home, workplace or social media, or turning up there, is harassment. Asking for a number is normal; going looking for it isn't.",
            "Silence is an answer. Chasing someone who has stopped replying, or contacting them even once after they've asked you to stop, is a violation — through any channel.",
            "Respect physical and conversational boundaries. A hug, a heavy topic or a personal question can be welcome for one person and uncomfortable for another. If unsure, ask; and take a change of subject at face value.",
          ],
        ],
      },
      {
        title: "The red lines",
        body: [
          "These lead to an immediate, permanent ban with no prior warning. Where appropriate, we cooperate with the authorities.",
          [
            "Physical or sexual violence, including any non-consensual sexual contact, during or after an experience.",
            "Tampering with someone's drink or food, for any reason.",
            "Theft or extortion. An honest mistake (leaving with the wrong jacket) isn't theft: tell us and we'll sort it out.",
            "Specific threats to harm a member, in person or in writing.",
            "Sharing, threatening to share or asking for intimate images of someone without their consent.",
            "Scams: fake investments, requests for money or loans, stolen payment methods, any deception that costs a member money.",
            "Any exploitation or endangerment of minors, online or offline: zero tolerance, reported to the authorities.",
            "Selling or using illegal substances during an experience.",
            "Creating a new account after a ban: all linked accounts are removed.",
          ],
          "You can still appeal: it's a check that we didn't get the wrong person or the wrong facts, not a second chance.",
        ],
      },
      {
        title: "No discrimination",
        body: [
          "Bringing together people of different backgrounds, paths and opinions is the heart of Wenzy. We act on discrimination in every form, whether it comes from a participant or a venue.",
          [
            "Hateful or degrading remarks targeting origin, religion, nationality, gender, sexual orientation, disability or age.",
            "Deliberate exclusion: a group ignoring or isolating a guest because of who they are.",
            "Repeated demeaning remarks (about an accent, someone's background, identity-based “jokes”). A clumsy comment calls for a kind word; a pattern is a violation.",
          ],
          "Depending on severity, this ranges from an educational warning to a ban. If it happens to you, including from venue staff, report it.",
        ],
      },
      {
        title: "Harassment and unwanted attention",
        body: [
          [
            "Unwanted sexual remarks, propositions or conversations; sending or showing explicit content, through any channel.",
            "Unwanted romantic attention: being interested in someone isn't a violation, carrying on after a clear no is. Asking for a number is fine; asking again after a “no” isn't. We judge the behaviour, not the intent.",
          ],
        ],
      },
      {
        title: "Using Wenzy fairly",
        body: [
          [
            "No selling or soliciting: don't use an experience to recruit, sell, promote your business or farm followers. Talking about your job is conversation; steering the evening towards a transaction isn't.",
            "Be yourself: no false identity, no one else's photos.",
            "No spam, bots or misleading links.",
            "No gaming the system: multiple accounts and abuse of promo codes, the waitlist or reviews are prohibited.",
            "Pay your share: if something outside the price is shared on site, leaving without paying means the others pay for you.",
            "Fair play: in sport as in games, respect the rules, safety instructions and other people's level. You come to share a good time, never to humiliate or hurt anyone.",
            "Nothing that endangers others: no promotion of violence or extremism, no exploitation of anyone.",
          ],
        ],
      },
      {
        title: "Talking about hard things",
        body: [
          "Friendship also means deep conversations: grief, mental health, life's hardships. They're welcome, with care for the people around you.",
          "What isn't allowed: promoting or glorifying self-harm, suicide or eating disorders, pushing someone towards dangerous behaviour, or showing graphic images.",
          "If someone tells you they're struggling: kindness first. If you're worried about their safety, tell us — and in an emergency, call the emergency services.",
        ],
      },
      {
        title: "Partner venues",
        body: [
          [
            "Respect each venue's staff and house rules: without our partners, there would be no experiences.",
            "A problem caused by the venue (unsafe conditions, disrespectful staff, food poisoning, an allergy or diet not respected)? Tell us: we raise it directly with the venue, and your report has no consequence for your account.",
          ],
        ],
      },
      {
        title: "How we handle reports",
        body: [
          [
            "Discreetly: we don't tell the reported person who reported them, and we only share your account with the people who need it to act.",
            "Report violations, not disagreements: a different opinion or not clicking with someone isn't a violation. Reports work because they're trusted.",
            "A deliberately false report, to harm someone or target them for who they are, is itself a violation.",
          ],
          "We can't always tell you the outcome of a report, but none goes unread.",
        ],
      },
      {
        title: "What we do",
        body: [
          "Most situations follow a ladder:",
          [
            "Educational warning: for a first, minor issue. We explain what crossed the line; your account isn't restricted.",
            "Formal warning: for repeated or more serious behaviour. It's recorded on your account and counts if there's a next time.",
            "Restriction or temporary suspension: for example, access to on-request experiences only.",
            "Permanent ban: if the behaviour continues, or if the harm justifies it on its own.",
          ],
          "The action depends on severity, repetition and the risk to other members. We always tell you, by email, which rule was involved and what action was taken.",
        ],
      },
      {
        title: "Appeals",
        body: [
          "If we've taken action on your account and you think we got it wrong, write to {{supportEmail}} within 7 days of the notification. Your appeal is reviewed by someone who wasn't involved in the original decision. Tell us what you think we missed: if we uphold the decision, we'll explain why.",
        ],
      },
      {
        title: "Changes to these rules",
        body: [
          "These rules evolve with the community and what we learn. Each version is dated on this page, and significant changes are announced by email.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    updated: UPDATED_EN,
    intro: "These terms govern access to and use of Wenzy. By creating an account or ticking “I accept”, you enter into an electronic contract with Wenzy. If you do not accept them, do not use the service. Prices, payment, cancellation and membership are covered by the [terms of sale](/cgv); the behaviour expected from everyone is set out in the [community rules](/charte). The French version prevails.",
    sections: [
      { title: "1. Publisher", body: ["The site is published by {{publisher}}, registered office {{address}} (ICE {{ice}}, RC {{rc}}). Contact: {{supportEmail}}. Hosting: {{host}}."] },
      { title: "2. The service", body: ["Wenzy brings together a community that meets every week, in small groups, around fixed gatherings: Wednesday Dinner, the Saturday activity (a different one each week), Saturday Coffee and Sunday Brunch, plus special editions. Partner organisers also offer their activities, approved by our team. Everything takes place in public places or at partner venues. We choose the venues, put the groups together, keep you informed and are your single point of contact.", "Wenzy is not a dating service. Connections may grow between consenting adults, but any romantic or sexual pressure, pushiness or behaviour that makes the group uncomfortable is prohibited."] },
      {
        title: "3. What we do, and what the venue does",
        body: [
          [
            "The partner venue prepares and serves food and drinks, or runs the activity (class, workshop, equipment). It remains responsible for them and for its premises.",
            "Diet: with your consent, we pass it on to the venue and take it into account when choosing venues where possible, but cannot guarantee every option everywhere.",
            "Allergies and intolerances: we don't prepare the food and cannot rule out any risk of reaction or contamination. Check directly with the staff before eating or drinking.",
            "What the price includes is stated on each experience page; anything extra is paid directly to the venue, at your expense. Check the menu or description before booking; if the venue doesn't suit you, contact us and we'll look for a solution (another date, or cancellation under the terms of sale).",
            "The venue is shown on the page or shared before the experience. It may change for a serious reason (safety, quality, capacity, unexpected closure): you will be informed.",
          ],
        ],
      },
      {
        title: "4. What we cannot guarantee",
        body: [
          [
            "The exact number of participants (if the minimum isn't reached, the experience may be cancelled and refunded under the terms of sale).",
            "A precise balance of women and men or an exact age range.",
            "Getting on with everyone: we put groups together carefully, but a meeting is still a meeting.",
            "That you will never meet someone you've met before — we avoid it where possible.",
          ],
        ],
      },
      {
        title: "5. Eligibility and account",
        body: [
          [
            "Be 18 or over, and use the service in a personal (not professional) capacity.",
            "Not have been banned before, unless we have agreed in writing.",
            "Provide accurate, up-to-date information under your real first name; one account per person. We may ask you to confirm your identity or age if in doubt.",
            "Your login details are personal: you are responsible for keeping them confidential and for activity on your account. Tell us immediately about any unauthorised use.",
            "A confirmed email address and the profile questionnaire are required to book. You can change your answers at any time.",
            "Some experiences have a higher minimum age, shown on their page: it is checked when you book, from your date of birth.",
          ],
          "If you no longer meet these conditions, your access may end.",
        ],
      },
      { title: "6. Bookings, requests and waitlists", body: ["An experience is booked directly or, if it is “on request”, once the team approves your request. When a date is full, you can join the waitlist. Prices, payment deadlines, cancellation and refunds are described in the [terms of sale](/cgv).", "For physical activities (running, padel, yoga, hiking…), booking or requesting to take part means accepting the [terms for physical activities](/conditions-activites-physiques).",] },
      { title: "7. How groups are put together", body: ["Groups are based on your city, languages, age, interests and questionnaire answers, avoiding seating the same people together again, so that everyone can join the conversation. A person on our team reviews each line-up. This is neither a psychological assessment nor a judgement about you.", "Some experiences also include a short questionnaire (10 questions at most, multiple choice only: level, pace, preferences…) to fill in while booking, before payment. Depending on the experience, answers are used to group similar levels (e.g. padel) or to mix profiles; they are never shown to other participants and are deleted 30 days after the experience."] },
      {
        title: "8. Code of conduct",
        body: [
          "Every member follows the [community rules](/charte), the advice on the [Safety](/securite) page, the law and each venue's house rules. In particular, you may not:",
          [
            "harass, threaten, intimidate, discriminate or behave sexually without consent;",
            "ask other members for personal or financial information, or for money;",
            "use someone else's account or create several, including after a suspension;",
            "solicit participants (sales, recruitment, promotion, campaigning or propaganda);",
            "bring someone who isn't on the booking;",
            "share information about other members' private lives, or photos of them without their agreement;",
            "post unlawful, hateful or misleading content, or content that infringes others' rights;",
            "use bots, scrape data from the site or harm its operation or reputation.",
          ],
        ],
      },
      { title: "9. Reliability: late cancellations and no-shows", body: ["A booked spot is a spot someone else couldn't have. After repeated late cancellations or no-shows, the team may limit your access (on-request experiences, waitlist) or temporarily suspend your account, after warning you. Financial consequences are described in the terms of sale."] },
      {
        title: "10. Photos and videos",
        body: [
          "We may photograph or film some experiences to share the atmosphere. We never publish an image in which you can be recognised without your prior agreement, asked for separately from these terms. You can withdraw it at any time by writing to {{supportEmail}}: we then remove the image from our channels within a reasonable time.",
          "For your part, ask people for their agreement before posting a photo or video of them.",
        ],
      },
      { title: "11. Member content", body: ["Reviews, profile photo, bio and messages attached to requests remain your responsibility. You grant Wenzy a free, non-exclusive licence, for as long as needed, to host and display them as part of the service (reviews are signed with your first name and last initial). The team may hide content that is inappropriate, false or unlawful.", "Reviews: an attached photo is only published after the team checks it (don't show anyone without their consent). A review of 2 stars or less, or containing insults or personal contact details, is read by the team before publication: it is published if it follows our rules, even if it is negative. You can still leave a review after a refund granted for an experience you were booked on. The activity's organizer and the team may reply publicly under your review. Any member or organizer can report a review; a report does not hide it automatically: the team checks and decides, and every decision is kept in the review's history."] },
      {
        title: "12. Reports, sanctions and appeals",
        body: [
          "Inappropriate behaviour can be reported. Depending on severity, the team may warn, restrict, suspend or ban a member; serious acts lead to an immediate ban (details in the [community rules](/charte)). Any suspension or ban is notified to you by email, with the rule concerned.",
          "You can appeal by writing to {{supportEmail}} within 7 days of the notification. The appeal is reviewed by someone who wasn't involved in the original decision, and the answer is reasoned. Every decision is logged.",
        ],
      },
      { title: "13. Intellectual property", body: ["Wenzy brand, the site, its texts, visuals, software and design are protected. You receive a personal, non-transferable, non-commercial right of use; any reproduction or extraction without permission is prohibited."] },
      { title: "14. Liability", body: ["Wenzy organises experiences with care, selects its partner venues, takes reasonable safety measures and informs participants of any change. We cannot, however, guarantee that meeting people is entirely risk-free. To the extent permitted by law, we are not liable for participants' acts, partner venues' services (food, drinks, activities) or force majeure. Descriptive texts and photos are indicative. Each participant remains responsible for their own behaviour and consumption."] },
      { title: "15. Duration, account deletion and suspension", body: ["You can request the deletion of your account at any time from your preferences. We may suspend or close an account that breaches these terms or poses a risk to the community."] },
      { title: "16. Personal data", body: ["How we process your data is described in the [privacy policy](/confidentialite), in accordance with Moroccan Law 09-08."] },
      { title: "17. Changes", body: ["These terms may change. The applicable version is the one published on the site with its effective date. You will be informed of significant changes by email before they take effect and may be asked to accept them again; minor wording corrections may be made at any time."] },
      {
        title: "18. Governing law and disputes",
        body: [
          "These terms are governed by Moroccan law. If you are a consumer, you benefit from the protective provisions of Law 31-08 on consumer protection.",
          "If you disagree with us, first write to {{supportEmail}} so we can look for an amicable solution. Failing agreement, the courts of Casablanca have jurisdiction, subject to the mandatory rules that protect consumers.",
        ],
      },
    ],
  },
  sales: {
    "title": "Terms of sale",
    "updated": UPDATED_EN,
    "intro": "These terms apply to every booking and to buying a Pack or a Pass on Wenzy. The price, what is paid on site and the cancellation terms are always shown before payment.",
    "sections": [
      {
        "title": "1. Seller",
        "body": [
          "{{publisher}}, {{address}} — ICE {{ice}}. Contact: {{supportEmail}}."
        ]
      },
      {
        "title": "2. Price: 35 DH online, the rest on site",
        "body": [
          "On Wenzy, you only pay the Wenzy fee online: a single price per seat (35 DH at present, shown before payment), all taxes included. It pays for the organisation: putting groups together, the venue, the welcome and the follow-up.",
          "Everything else is paid on site, directly to the venue or the organizer, and is never collected by Wenzy: what you eat and drink at the restaurant (the Casual, Premium or Exclusive tier shows a budget), or the activity price shown on the page (padel, class, workshop…). This amount is not on our invoice and is not due if your booking is cancelled.",
          "A promo code applies to the Wenzy fee, once per person, under the conditions stated with the code."
        ]
      },
      {
        "title": "3. Booking and payment",
        "body": [
          [
            "The seat is held while you pay (15 minutes by card; until the stated deadline for a bank transfer), then released if payment didn't go through.",
            "The activity questionnaire, if there is one, is filled in before payment.",
            "On-request event: no payment when you ask; if accepted, the seat is held for 24 hours for you to pay.",
            "Waiting list: a freed seat is offered first to people with a Pass, then in sign-up order, and held for 4 hours for payment.",
            "Bank transfer: you receive a unique reference and Wenzy's bank details; the booking is confirmed once the exact amount is received. If not received by the deadline, the seat is released; a later transfer gets a seat if one is left, otherwise it is refunded.",
            "Card payment: through a secure provider; Wenzy never receives or stores card data.",
            "Weekly gatherings (Wednesday Dinner, the Saturday activity, Saturday Coffee, Sunday Brunch): one date is open at a time (for the Saturday activity, one for the whole rotation) and its bookings close at 8:30 pm the day before; the next date then opens (a week earlier with a Pass).",
            "Tables: you choose your tier (Casual, Premium or Exclusive), which sets the type of restaurant and the budget on site. If you accept the neighbouring tier, you may be placed there when your tier doesn't have enough people; otherwise, section 5 applies. Other Tables close 12 hours before the start (at the latest 6 pm the day before for a start before 2 pm); other activities, 2 hours before."
          ]
        ]
      },
      {
        "title": "4. Cancellation and date change by the participant",
        "body": [
          "You can always cancel from your booking. The Wenzy fee is refunded according to the event's cancellation terms, shown before you book (the most common: full refund up to 48 hours before, no refund after). The refund amount is shown before you confirm.",
          "Until bookings close, you can move your booking to another date of the same event, at no extra cost, if seats are left. If you cancel afterwards, the refund is still based on your original date (moving then cancelling doesn't refund more than cancelling at the original date). Every change is confirmed by email, with an updated calendar invitation.",
          "Refunds go back to the original payment method (by bank transfer for a transfer payment)."
        ]
      },
      {
        "title": "5. Cancellation, minimum not reached or changes by Wenzy",
        "body": [
          "If Wenzy cancels an event, the Wenzy fee is refunded in full.",
          "If there aren't enough people to form a table or group, Wenzy may keep the event, or offer you another date or an equivalent event (same format, same tier). You accept the offer at no extra cost, or you're refunded in full; you're never moved without your consent, and without an answer by the stated time, you're refunded.",
          "The venue for Tables is chosen after bookings close, among our partner venues, then revealed 5 hours before the start (9 pm the day before for a morning or lunchtime start). Several venues may host the tables of one date. If a venue changes after the reveal, the people concerned are told straight away."
        ]
      },
      {
        "title": "6. Pack and Pass",
        "body": [
          [
            "Pack: 3 credits valid for 3 months from purchase; 1 credit per seat, guest included. A credit comes back if you cancel within the event's refundable period, or if the seat isn't paid in time. A new pack adds its credits and extends their validity to 3 months.",
            "Pass (1 week, 1 month, 3 months, 6 months or 1 year): your seat is included in every booking (a guest's seat is paid or covered with a pack credit), with early access to new dates, members-only events and priority on the waiting list. The pass covers up to 2 upcoming bookings at a time, and only events taking place while it is valid.",
            "The Pack and the Pass cover the Wenzy fee, including for organizers' activities; they never cover what is paid on site.",
            "One-off payment, no automatic renewal. A new pass extends the current one. The weekly pass can only be paid by card.",
            "Right of withdrawal: within 7 days of purchase, if the Pack or Pass hasn't been used (no credit spent, no seat covered), the “Withdraw” button on the Pack and Pass page cancels it with a full refund; a credit note is issued."
          ]
        ]
      },
      {
        "title": "7. Check-in and no-shows",
        "body": [
          "On the day, you check in from your booking, from 30 minutes before to 1 hour after the start; with a host or an organizer, their check-in counts.",
          "Without check-in, the seat counts as a no-show and isn't refunded. For a seat included in a Pass: a first no-show is a warning; a second within 90 days suspends the pass for 14 days (you can still book, but your seats aren't included). If you were actually there, write to us: the no-show is cancelled. Cancelling a seat included in your Pass within 24 hours of the start also counts as a no-show."
        ]
      },
      {
        "title": "8. Invoicing",
        "body": [
          "An invoice is issued for every online payment (Wenzy fee, Pack or Pass) and is available in your account under “My invoices”. A credit note is issued for every refund. What is paid on site is invoiced, where applicable, by the venue or organizer."
        ]
      },
      {
        "title": "9. Complaints and governing law",
        "body": [
          "For any complaint: {{supportEmail}}. We reply within 72 working hours. These terms are governed by Moroccan law, in particular Law No. 31-08 on consumer protection; failing an amicable agreement, the courts of Casablanca have jurisdiction."
        ]
      }
    ]
  },

  privacy: {
    title: "Privacy policy",
    updated: UPDATED_EN,
    intro: "This policy explains what data we collect, how, why, how long we keep it, who it is shared with and how to exercise your rights, in accordance with Moroccan Law 09-08 on the protection of individuals with regard to the processing of personal data. It applies to Wenzy website, the member area and every service available through them. The French version prevails.",
    sections: [
      { title: "1. Key points", body: [["We only collect what is useful to organise small-group experiences safely.", "We never sell your data and use no advertising cookies or GPS location.", "Within a group, only your first name, your profile photo (if you added one) and your interests are shared.", "Your diet and allergies are only passed on to the venue with your explicit consent.", "No photo in which you can be recognised is published without your agreement.", "You can view, correct or download your data and delete your account at any time."]] },
      { title: "2. Data controller", body: ["{{publisher}}, {{address}} (ICE {{ice}}), is responsible for the data processed on the site. For any question about your data: {{privacyEmail}}.", "Declaration to the CNDP: {{cndpDeclaration}}. Authorisation to transfer data outside Morocco: {{cndpTransfer}}.", "It is up to you to give us accurate information and keep it up to date from your member area."] },
      { title: "3. Data we collect", body: [["Account: first name, last name, email address, phone (optional). Your password is handled by our authentication provider and never stored in plain text.", "Profile and questionnaire: date of birth (to check you are an adult), city, languages, interests, goals; gender (optional; needed to book a women-only activity), profession, bio, photo, neighbourhood, favourite universes, sports level and group age preference, preferred group vibe, how you are in a group, humour, what matters to you, how often you exercise, the kind of places you like, diet, work sector, how you heard about us, WhatsApp use and Instagram account (optional; used to put groups together and for “For you” suggestions, never shown to other participants). We never ask about relationship status, children or religion. The questionnaire is neither a medical nor a psychological assessment.", "Approximate location: your city and, if you provide it, your neighbourhood. No GPS tracking.", "Experiences: bookings, participation requests (message, optional Instagram account), waitlists, tables or teams, attendance on the day, no-shows, reviews (and an attached photo, published only after the team checks it), “My group” (people you'd like to see again — never shown to them unless it's mutual — and people you don't want to be grouped with again), membership, promo codes used.", "Welcome preferences: diet, allergies and preferred language(s), if you provide them, with the date of your consent to share them with the venue.", "Payments and invoices: amount, date, status, provider reference, documents issued. Card details are entered and processed only by the payment provider: we never receive them.", "Safety and support: reports, messages sent to the team, moderation decisions and appeals.", "Technical data: IP address, connection and security logs, strictly necessary cookies.", "Experience questionnaire: your answers (multiple choice only: level, pace, preferences…), if the experience has one.", "Physical activities: the version of the participation terms you accepted and its date.", "Tables: your check-in (arrival time), a summary of your table without names (other guests' ages, languages, fields and interests), the messages exchanged with your table after the event, and the reports you make or that concern you (read by the team only). One hour before, the venue receives each guest's first name and, if you agreed, your diet and allergies."]] },
      { title: "4. How we collect it", body: [["Directly from you: account creation, questionnaire, booking, participation request, contact or partner application form, report, review.", "Automatically: technical logs and strictly necessary cookies when you use the site.", "From our providers: the payment provider confirms the status and reference of each payment.", "From our team: attendance on the day, group line-ups, moderation decisions."]] },
      {
        title: "5. Why, on what basis, and for how long",
        body: [
          {
            table: {
              head: ["Purpose", "Legal basis", "Retention"],
              rows: [
                ["Creating and managing your account", "Performance of the contract", "While the account is active, then 3 years after the last activity, before deletion or anonymisation."],
                ["Booking, paying, getting refunds, receiving confirmations, reminders and changes", "Performance of the contract", "For the duration of the relationship; accounting records follow the legal period (see “Legal obligations”)."],
                ["Putting tables and teams together, without always seating the same people", "Performance of the contract; legitimate interest", "For the life of the account (group history is used to suggest new encounters)."],
                ["Passing diet, allergies and preferred languages on to the venue", "Your explicit consent (diet and allergies may reveal health data)", "For the experience and its follow-up, then deleted no later than 30 days after the experience. You can withdraw your consent until the experience starts."],
                ["Putting groups together from an experience questionnaire (level, pace, preferences…)", "Performance of the contract", "Until the experience, then deleted automatically 30 days after it."],
                ["Keeping proof that the terms for physical activities were accepted", "Legitimate interest (evidence in case of dispute)", "With the booking, at most 5 years after the experience."],
                ["Putting tables together, revealing the venue, sending the venue first names and shared allergies, handling reports", "Performance of the contract; legitimate interest (safety)", "Table messages: 14 days after they open; reports: 3 years."],
                ["Protecting the community: age checks, preventing fake accounts and fraud, reports, moderation, appeals", "Legitimate interest; legal obligations", "As long as needed for the community's safety, at most 3 years after the decision."],
                ["Answering your messages and support requests", "Legitimate interest", "3 years after the last exchange."],
                ["Sending you our news by email", "Your consent, which you can withdraw at any time in your preferences", "Until you withdraw consent, or 3 years after your last contact with us."],
                ["Emailing you about new experiences (alert on the home page or in your preferences)", "Your consent (without an account: confirmed through a link sent by email)", "Until you stop the alerts (link in every email, or your preferences); an unconfirmed sign-up is deleted after 7 days."],
                ["Publishing photos or videos of experiences in which you can be recognised", "Your consent, asked for separately", "Until you withdraw consent."],
                ["Keeping the site secure and working properly", "Legitimate interest", "Technical and security logs: 12 months."],
                ["Legal obligations (accounting, requests from authorities)", "Legal obligation", "Accounting records (payments, invoices, credit notes): 10 years, under Law 9-88 on accounting obligations."],
                ["Handling requests to exercise your rights", "Legal obligation", "For the time needed to handle the request; any proof of identity is deleted once checked."],
              ],
            },
          },
        ],
      },
      { title: "6. How groups are put together, transparently", body: ["A tool suggests table and team line-ups based on your languages, age, interests and questionnaire answers, avoiding seating people together who have already met. Our team reviews and adjusts every line-up: none is revealed without human approval. You can change your answers at any time; some information remains necessary for the service to work (age, city, languages). Learn more: [how we put groups together](/blog/comment-nous-composons-les-tables).", "For some experiences, your answers to the experience questionnaire (level, pace…) are also used to group similar levels or to mix profiles. The calculation runs on our own servers, with no external artificial-intelligence service; your answers are never shown to other participants and are deleted 30 days after the experience."] },
      { title: "7. Cookies", body: ["We only use strictly necessary cookies: keeping you signed in and remembering your language. They do not require your consent. We use no audience measurement, personalisation or advertising cookies; if that changes, we will ask for your consent first."] },
      {
        title: "8. Who can access it",
        body: [
          ["Our team, only people who need it (support, safety, moderation, technical), according to their role; this access is logged.", "Other participants in your group: only your first name, your profile photo (if you added one) and your interests, once the group is revealed.", "The venue hosting the experience: the number of participants, first names for the welcome and place cards and, with your consent, your diet, allergies and preferred languages. Never your contact details.", "The organizer of an activity you book (activities offered by organizers): your first name, last-name initial and phone number, to welcome you and contact you about the activity, until 7 days after the date. It cannot export them or use them for anything else.", "Authorities, where required by law."],
          "Our providers process data on our behalf, following our instructions and with security safeguards:",
          {
            table: {
              head: ["Provider", "Role", "Location"],
              rows: [
                ["Google Cloud (Firebase)", "Website hosting, database, authentication, file storage", "European Union (Belgium, Netherlands)"],
                ["Brevo", "Sending emails (confirmations, reminders, invoices)", "European Union (France)"],
                ["Payment provider", "Entering and processing card payments (we never receive your card details)", "Stated here as soon as it is in place"],
              ],
            },
          },
          "We never sell your data.",
          "Maps: on an activity page, the map (OpenStreetMap) only loads if you click “Show the map”; your browser then contacts OpenStreetMap's servers, which receive your IP address. The “Directions” link opens Google Maps, which has its own rules.",
        ],
      },
      { title: "9. Transfers outside Morocco", body: ["Your data is hosted in the European Union. This transfer outside Morocco is handled in accordance with Law 09-08 and CNDP procedures ({{cndpTransfer}}), and our providers are contractually bound to protect your data."] },
      { title: "10. Security", body: ["We apply appropriate technical and organisational measures: encrypted connections (HTTPS), passwords never stored in plain text, role-based and logged access, database access rules, no card data stored, backups.", "On your side, keep your password confidential and sign out on shared devices."] },
      {
        title: "11. Your rights",
        body: [
          "Under Law 09-08, you have the right of access, rectification and objection, including to marketing. You can also ask for your data to be deleted and withdraw any consent at any time (without affecting what was done before).",
          ["From your member area: edit your profile and answers, manage your email preferences, download your data, request the deletion of your account.", "For anything else: {{privacyEmail}}. We may ask you to prove your identity if in doubt.", "We reply as quickly as possible, and within one month at the latest."],
          "You can also contact the Moroccan data protection authority (CNDP, www.cndp.ma).",
        ],
      },
      { title: "12. Minors and child protection", body: ["The service is for adults only (18 and over). If an account seems to belong to a minor, we may suspend it and carry out checks.", "We have zero tolerance for any exploitation or endangerment of minors: any such content or behaviour leads to the immediate closure of the account, secure preservation of relevant evidence and a report to the competent authorities. To alert us: {{safetyEmail}}."] },
      { title: "13. Changes", body: ["This policy may change with the service and the regulations. The applicable version is the one published on the site with its update date; you will be informed of significant changes by email."] },
    ],
  },
};

export const LEGAL_DOCS: Record<"fr" | "en" | "ar", Record<LegalKey, LegalDoc>> = {
  fr: { ...fr, ...MARKETPLACE_LEGAL.fr },
  en: { ...en, ...MARKETPLACE_LEGAL.en },
  ar: { ...LEGAL_AR, ...MARKETPLACE_LEGAL.ar },
};
