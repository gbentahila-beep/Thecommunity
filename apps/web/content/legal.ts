/**
 * Textes juridiques et page Sécurité, rédigés à partir du fonctionnement réel du site.
 * (Relecture par un avocat : suivie dans docs/16, jamais mentionnée sur le site.)
 * Les jetons {{…}} sont remplacés par les informations légales (lib/legal-info.ts) ou « à compléter » ; « [texte](/chemin) » crée un lien interne.
 * Français : version de référence. Anglais et arabe (content/legal-ar.ts) : traductions.
 */

import { LEGAL_AR } from "./legal-ar";

export type LegalKey = "terms" | "sales" | "privacy" | "safety" | "community";
/** Bloc : paragraphe, liste à puces, ou tableau (affiché en fiches sur mobile). */
export type LegalTable = { table: { head: string[]; rows: string[][] } };
export type LegalBlock = string | string[] | LegalTable;
export type LegalSection = { title: string; body: LegalBlock[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const UPDATED_FR = "Dernière mise à jour : 8 novembre 2026 · en vigueur à la même date";

const fr: Record<LegalKey, LegalDoc> = {
  safety: {
    title: "Sécurité",
    updated: UPDATED_FR,
    intro:
      "Rencontrer de nouvelles personnes doit être enthousiasmant, jamais inquiétant. Chaque expérience The Host Club se déroule en groupe, dans un lieu public ou chez un partenaire sélectionné, avec des garde-fous prévus dès sa conception. Cette page explique ce que nous faisons pour vous protéger, et ce que vous pouvez faire pour veiller sur vous et sur les autres.",
    sections: [
      {
        title: "Nos principes",
        body: [
          [
            "La sécurité avant la croissance : face à un risque, nous choisissons toujours l'option la plus prudente, même si elle nous coûte une réservation ou un membre.",
            "L'amitié d'abord : The Host Club n'est pas une application de rencontre amoureuse. L'insistance, la pression amoureuse ou sexuelle et les avances répétées non désirées sont interdites.",
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
            "En petits groupes composés et relus par notre équipe : moins de pression, personne d'isolé.",
            "Certaines expériences sont « sur demande » : l'équipe valide chaque participant.",
            "Le strict minimum partagé : votre groupe ne voit que votre prénom et vos centres d'intérêt. Ni téléphone, ni e-mail, ni nom de famille.",
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
            "Un besoin particulier (mobilité, audition, vue, régime, allergie) ? Indiquez-le en réservant, rubrique « Pour votre accueil », ou écrivez-nous le plus tôt possible : nous pourrons en tenir compte pour le lieu et la table.",
            "Réservez et payez uniquement sur notre site officiel. Nous ne demandons jamais de payer par virement, par message ou en espèces à un inconnu. Méfiez-vous des pages ou comptes qui imitent notre nom.",
            "Avant l'expérience, nous vous communiquons les informations utiles (lieu, horaire, et selon le format votre table). Vos coordonnées ne sont jamais transmises aux autres participants.",
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
            "Un malaise, une situation gênante ? Parlez-en au personnel du lieu ou à l'hôte, ou contactez notre équipe.",
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
          ],
        ],
      },
      {
        title: "En cas d'urgence",
        body: [
          "Si la vie ou la sécurité de quelqu'un est en jeu, appelez d'abord les secours, puis prévenez-nous :",
          ["Police : 19", "Gendarmerie royale (hors des villes) : 177", "Protection civile (pompiers, ambulances) : 15", "Depuis un téléphone portable, le 112 vous oriente aussi vers les secours"],
          "Cela vaut pour un malaise à table, une personne en détresse, un participant introuvable après une expérience ou une menace visant un lieu ou un groupe. Le personnel du lieu connaît l'adresse exacte : demandez-lui de l'aide pour guider les secours.",
          "Pas sûr que ce soit grave ? Prévenez-nous quand même : nous préférons être alertés pour une situation qui se révèle sans gravité plutôt que de passer à côté d'une vraie urgence.",
        ],
      },
      {
        title: "Après l'expérience",
        body: [
          [
            "Gardez le contact à votre rythme : partagez vos coordonnées seulement avec les personnes en qui vous avez confiance.",
            "N'envoyez jamais d'argent. Ne prêtez rien, ne communiquez ni informations bancaires, ni codes, ni cartes cadeaux à une personne rencontrée via The Host Club, aussi touchante que soit son histoire. C'est l'arnaque la plus courante : signalez-la-nous.",
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
          "Selon la gravité : avertissement, restriction, suspension temporaire ou exclusion définitive. Les faits graves entraînent une exclusion immédiate, et nous pouvons coopérer avec les autorités dans le cadre prévu par la loi. Le détail, y compris le recours, figure dans nos [règles de la communauté](/charte).",
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
      "The Host Club réunit des personnes qui ne se connaissent pas autour d'une table, d'un atelier ou d'une sortie. Cela fonctionne parce que chacun arrive ouvert aux autres — et cela ne tient que si tout le monde se sent en sécurité et respecté. Ces règles disent ce que nous attendons de chaque membre, ce sur quoi nous agissons quand quelque chose ne va pas, et ce qui se passe ensuite.",
    sections: [
      {
        title: "Où elles s'appliquent",
        body: [
          [
            "Pendant les expériences, de l'arrivée au départ, y compris ce qui les prolonge directement (un verre après, le trajet du retour).",
            "Sur le site : profil, avis, demandes de participation et échanges avec l'équipe.",
            "En dehors de The Host Club, lorsqu'un membre en contacte un autre contre son gré à la suite d'une expérience.",
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
          "Une place vide se voit et pèse sur toute la table. Si vous ne pouvez plus venir, annulez dans les délais indiqués dans les [conditions de vente](/cgv) pour libérer la place.",
          "Vous venez avec des amis ? Réservez leurs places dans la même réservation : la table est composée pour un nombre précis de personnes, et un invité non prévu prendrait la place de quelqu'un d'autre. La personne qui réserve s'assure que ses invités connaissent ces règles, et en répond.",
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
        title: "Pas de discrimination à table",
        body: [
          "Réunir des personnes d'origines, de parcours et d'opinions différents, c'est le cœur de The Host Club. Nous agissons contre toute discrimination, qu'elle vienne d'un participant ou d'un lieu.",
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
        title: "Un usage loyal de The Host Club",
        body: [
          [
            "Pas de vente ni de prospection : ne profitez pas d'une expérience pour recruter, vendre, promouvoir votre entreprise ou gagner des abonnés. Parler de son métier, c'est de la conversation ; orienter la soirée vers une transaction, non.",
            "Soyez vous-même : pas de fausse identité, pas de photos d'autrui.",
            "Pas de spam, de robots ni de liens trompeurs.",
            "Pas de contournement : comptes multiples, abus des codes promo, de la liste d'attente ou des avis sont interdits.",
            "Réglez votre part : si une consommation hors prix est partagée sur place, partir sans payer revient à la faire payer aux autres.",
            "Rien qui mette les autres en danger : ni promotion de la violence ou de l'extrémisme, ni exploitation de qui que ce soit.",
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
      "Ces conditions encadrent l'accès et l'utilisation du site The Host Club. En créant un compte ou en cochant « J'accepte », vous concluez un contrat électronique avec The Host Club. Si vous ne les acceptez pas, n'utilisez pas le service. Prix, paiement, annulation et abonnement relèvent des [conditions générales de vente](/cgv) ; le comportement attendu de chacun est précisé dans les [règles de la communauté](/charte).",
    sections: [
      { title: "1. Éditeur", body: ["Le site est édité par {{publisher}}, dont le siège est situé {{address}} (ICE {{ice}}, RC {{rc}}). Contact : {{supportEmail}}. Hébergement : {{host}}."] },
      {
        title: "2. Le service",
        body: [
          "The Host Club propose des expériences sociales en petit groupe (repas, ateliers, sport, jeux, sorties) pour rencontrer de nouvelles personnes, dans des lieux publics ou chez des partenaires. Nous choisissons les lieux, composons les groupes, vous informons et restons votre interlocuteur unique.",
          "The Host Club n'est pas un service de rencontre amoureuse. Des liens peuvent naître entre adultes consentants, mais toute pression amoureuse ou sexuelle, toute insistance et tout comportement qui met le groupe mal à l'aise sont interdits.",
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
          ],
          "Si vous ne remplissez plus ces conditions, votre accès peut prendre fin.",
        ],
      },
      {
        title: "6. Réservations, demandes et listes d'attente",
        body: [
          "Une expérience se réserve directement ou, si elle est « sur demande », après validation de votre demande par l'équipe. Quand une date est complète, vous pouvez rejoindre la liste d'attente. Le fonctionnement détaillé (prix, délais de paiement, annulation, remboursement) figure dans les [conditions générales de vente](/cgv).",
        ],
      },
      {
        title: "7. Composition des groupes",
        body: [
          "Les groupes sont composés à partir de votre ville, de vos langues, de votre âge, de vos centres d'intérêt et de vos réponses au questionnaire, en évitant de réunir les mêmes personnes, afin que chacun puisse participer à la conversation. Une personne de l'équipe relit chaque composition. Ce n'est ni une évaluation psychologique ni un jugement sur votre personne.",
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
          "Les avis, la photo de profil, la biographie et les messages joints aux demandes restent sous votre responsabilité. Vous accordez à The Host Club, gratuitement et pour la durée nécessaire, une licence non exclusive pour les héberger et les afficher dans le cadre du service (vos avis sont signés de votre prénom et de l'initiale de votre nom). L'équipe peut masquer un contenu inapproprié, faux ou contraire à la loi.",
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
        body: ["La marque The Host Club, le site, ses textes, visuels, logiciels et sa présentation sont protégés. Vous bénéficiez d'un droit d'utilisation personnel, non transférable et non commercial ; toute reproduction ou extraction sans autorisation est interdite."],
      },
      {
        title: "14. Responsabilités",
        body: [
          "The Host Club organise les expériences avec soin, sélectionne ses lieux partenaires, prend des mesures raisonnables de sécurité et informe les participants de tout changement. Nous ne pouvons toutefois garantir qu'une rencontre entre personnes soit sans aucun risque. Dans les limites permises par la loi, nous ne répondons pas des actes des participants, des prestations des lieux partenaires (repas, boissons, activités) ni des cas de force majeure. Les textes et photos de présentation sont indicatifs. Chaque participant reste responsable de son comportement et de sa consommation.",
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
    title: "Conditions générales de vente",
    updated: UPDATED_FR,
    intro: "Ces conditions s'appliquent à toute réservation d'expérience et à l'abonnement annuel achetés sur The Host Club. Les prix, ce qui est inclus et les conditions d'annulation sont toujours affichés avant le paiement.",
    sections: [
      { title: "1. Vendeur", body: ["{{publisher}}, {{address}} — ICE {{ice}}. Contact : {{supportEmail}}."] },
      {
        title: "2. Prix",
        body: [
          "Les prix sont indiqués en dirhams marocains (DH), toutes taxes comprises, par place. Ce qui est inclus (repas, boissons, matériel, cours…) est précisé sur la fiche de chaque expérience ; toute consommation supplémentaire se règle directement auprès du lieu. Les membres abonnés bénéficient du prix membre affiché à côté du prix public.",
          "Un code promo s'applique après le prix membre, sur les réservations directes, une fois par personne, dans les conditions indiquées avec le code. D'éventuels frais de service peuvent s'ajouter : ils sont toujours affichés avant le paiement, ne s'appliquent jamais à une place gratuite et sont remboursés avec la place.",
          "Certaines expériences se règlent en deux parts, toujours indiquées sur la fiche : la part organisation, payée en ligne à la réservation, et une part réglée sur place directement au partenaire (un prix fixe annoncé à l'avance, ou votre consommation). La part sur place n'est jamais encaissée par The Host Club : elle ne figure pas sur notre facture et n'est pas due si votre réservation est annulée. Le prix membre, l'abonnement, les codes promo et les frais de service ne portent que sur la part payée en ligne.",
        ],
      },
      {
        title: "3. Réservation et paiement",
        body: [
          [
            "Réservation directe : la place est bloquée le temps du paiement (15 minutes pour un paiement par carte ; jusqu'à l'échéance indiquée pour un virement), puis remise en vente si le paiement n'a pas abouti.",
            "Expérience sur demande : aucun paiement à la demande ; si elle est acceptée, la place est réservée 24 heures pour payer.",
            "Liste d'attente : si une place se libère, elle est proposée à la première personne inscrite et réservée 4 heures pour payer.",
            "Paiement par virement bancaire : après la réservation, une référence unique et les coordonnées bancaires de The Host Club sont communiquées (à l'écran et par e-mail). La place est bloquée jusqu'à l'échéance indiquée : 48 heures au plus, et au plus tard 24 heures avant l'expérience. La réservation est confirmée, avec le billet et la facture, dès que l'équipe constate la réception du virement du montant exact portant la référence.",
            "Virement non reçu à l'échéance : la place est libérée et vous en êtes informé. Un virement arrivé ensuite donne droit à une place s'il en reste, sinon il est intégralement remboursé. Les remboursements d'un virement se font par virement : les coordonnées nécessaires vous sont demandées à ce moment-là et ne sont pas enregistrées sur le site.",
            "Lorsque le paiement par carte est proposé, il s'effectue auprès d'un prestataire de paiement sécurisé ; The Host Club ne reçoit ni ne conserve aucune donnée de carte. La réservation est confirmée à réception de la confirmation du paiement.",
          ],
        ],
      },
      {
        title: "4. Annulation par le membre",
        body: [
          [
            "Jusqu'à 48 heures avant le début : remboursement intégral.",
            "Moins de 48 heures avant le début : pas de remboursement (la place peut être proposée à la liste d'attente).",
            "Une expérience peut prévoir des conditions particulières, indiquées sur sa fiche avant la réservation.",
          ],
          "L'annulation se fait depuis l'espace membre (Mes réservations). Le remboursement est effectué sur le moyen de paiement utilisé ; son délai d'apparition dépend de votre banque.",
        ],
      },
      {
        title: "5. Annulation ou modification par The Host Club",
        body: [
          "Si nous annulons une expérience (météo, indisponibilité du partenaire, nombre insuffisant de participants…), vous êtes prévenu et remboursé intégralement. Nous pouvons proposer de déplacer votre réservation vers une autre date de la même expérience ; vous restez libre d'annuler avec remboursement intégral si la nouvelle date ne vous convient pas.",
        ],
      },
      {
        title: "6. Abonnement annuel",
        body: [
          [
            "L'abonnement donne accès, pendant 12 mois, aux avantages décrits sur la page Abonnement (prix membre et, selon la formule, accès anticipé aux nouvelles dates et expériences réservées aux membres).",
            "Il est payé en une fois et n'est pas renouvelé automatiquement : vous pouvez le renouveler à partir de 30 jours avant l'échéance, la nouvelle période commençant à l'échéance.",
            "Vous pouvez y renoncer dans les 7 jours suivant le paiement en écrivant à {{supportEmail}} : vous êtes alors remboursé, déduction faite des avantages déjà utilisés (différence entre le prix public et le prix membre des places réservées).",
          ],
        ],
      },
      {
        title: "7. Absences",
        body: ["Une absence sans annulation (no-show) n'ouvre pas droit à remboursement. Des absences ou annulations tardives répétées peuvent limiter l'accès aux expériences sur demande ou entraîner une suspension temporaire ([conditions générales d'utilisation](/cgu), article 9)."],
      },
      { title: "8. Facturation", body: ["Un document (facture ou reçu) est émis pour chaque paiement et un avoir pour chaque remboursement. Ils sont envoyés par e-mail et disponibles dans l'espace membre, rubrique « Mes factures »."] },
      {
        title: "9. Réclamations et droit applicable",
        body: ["Toute réclamation peut être adressée à {{supportEmail}} ; nous recherchons d'abord une solution amiable. Ces conditions sont soumises au droit marocain, notamment la loi n° 31-08 édictant des mesures de protection du consommateur ; à défaut d'accord, les tribunaux de Casablanca sont compétents."],
      },
    ],
  },

  privacy: {
    title: "Politique de confidentialité",
    updated: UPDATED_FR,
    intro:
      "Cette politique explique quelles données nous collectons, comment, pourquoi, combien de temps nous les gardons, avec qui elles sont partagées et comment exercer vos droits, conformément à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel. Elle s'applique au site The Host Club, à l'espace membre et à tous les services qui y sont accessibles.",
    sections: [
      {
        title: "1. L'essentiel",
        body: [
          [
            "Nous collectons uniquement ce qui est utile pour organiser des expériences en petit groupe, en sécurité.",
            "Nous ne vendons jamais vos données et n'utilisons aucun cookie publicitaire ni votre position GPS.",
            "Au sein d'un groupe, seuls votre prénom et vos centres d'intérêt sont partagés.",
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
            "Profil et questionnaire : date de naissance (pour vérifier la majorité), ville, langues parlées, centres d'intérêt, objectifs ; genre, profession, biographie et photo (facultatifs). Le questionnaire n'est ni une évaluation médicale ni une évaluation psychologique.",
            "Localisation approximative : votre ville et, si vous l'indiquez, votre quartier. Aucun suivi GPS.",
            "Expériences : réservations, demandes de participation (message, compte Instagram facultatif), listes d'attente, tables ou équipes, présence le jour J, absences, avis, abonnement, codes promo utilisés.",
            "Préférences d'accueil : régime alimentaire, allergies et langue(s) de table, si vous les indiquez, avec la date de votre accord pour leur transmission au lieu.",
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
            "Par notre équipe : présence le jour J, composition des tables, décisions de modération.",
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
                ["Composer les tables et équipes, sans réunir toujours les mêmes personnes", "Exécution du contrat ; intérêt légitime", "Durée du compte (l'historique des tables sert à proposer de nouvelles rencontres)."],
                ["Transmettre régime, allergies et langues de table au lieu", "Votre consentement explicite (le régime et les allergies peuvent révéler une donnée de santé)", "Le temps de l'expérience et de son suivi, puis effacement au plus tard 30 jours après l'expérience. Vous pouvez retirer votre accord jusqu'au début de l'expérience."],
                ["Protéger la communauté : vérification de l'âge, prévention des faux comptes et de la fraude, signalements, modération, recours", "Intérêt légitime ; obligations légales", "Le temps nécessaire à la sécurité de la communauté, 3 ans au plus après la décision."],
                ["Répondre à vos messages et demandes d'assistance", "Intérêt légitime", "3 ans après le dernier échange."],
                ["Vous envoyer nos nouveautés par e-mail", "Votre consentement, retirable à tout moment dans vos préférences", "Jusqu'au retrait de votre accord, ou 3 ans après votre dernier contact avec nous."],
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
          "Un outil propose une composition des tables et des équipes à partir de vos langues, de votre âge, de vos centres d'intérêt et de vos réponses au questionnaire, en évitant de réunir des personnes qui se sont déjà rencontrées. Notre équipe relit et ajuste chaque composition : aucune n'est révélée sans validation humaine. Vous pouvez modifier vos réponses à tout moment ; certaines informations restent nécessaires au fonctionnement du service (âge, ville, langues). En savoir plus : [comment nous composons les tables](/blog/comment-nous-composons-les-tables).",
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
            "Les autres participants de votre groupe : uniquement votre prénom et vos centres d'intérêt, une fois le groupe révélé.",
            "Le lieu qui accueille l'expérience : le nombre de participants, les prénoms pour l'accueil et les marque-places et, avec votre accord, votre régime, vos allergies et vos langues de table. Jamais vos coordonnées.",
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

const UPDATED_EN = "Last updated: 8 November 2026 · effective the same day";

const en: Record<LegalKey, LegalDoc> = {
  safety: {
    title: "Safety",
    updated: UPDATED_EN,
    intro:
      "Meeting new people should feel exciting, never worrying. Every The Host Club experience happens in a group, in a public place or at a selected partner venue, with safeguards built in from the start. This page explains what we do to protect you, and what you can do to look after yourself and others.",
    sections: [
      {
        title: "Our principles",
        body: [
          [
            "Safety before growth: when there is a risk, we always choose the most careful option, even if it costs us a booking or a member.",
            "Friendship first: The Host Club is not a dating app. Pushiness, romantic or sexual pressure and repeated unwanted advances are prohibited.",
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
            "Small groups put together and reviewed by our team: less pressure, nobody left out.",
            "Some experiences are “on request”: the team approves each participant.",
            "The bare minimum is shared: your group only sees your first name and interests. No phone number, email or surname.",
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
            "A specific need (mobility, hearing, sight, diet, allergy)? Mention it when booking, under “For your welcome”, or write to us as early as possible so we can take it into account for the venue and the table.",
            "Book and pay only on our official website. We never ask you to pay by bank transfer, by message or in cash to a stranger. Be wary of pages or accounts imitating our name.",
            "Before the experience, we send you what you need (venue, time and, depending on the format, your table). Your contact details are never shared with other participants.",
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
            "Feeling unwell or uncomfortable? Talk to the venue staff or the host, or contact our team.",
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
          ],
        ],
      },
      {
        title: "In an emergency",
        body: [
          "If someone's life or safety is at risk, call the emergency services first, then let us know:",
          ["Police: 19", "Royal Gendarmerie (outside cities): 177", "Civil protection (fire, ambulance): 15", "From a mobile phone, 112 also connects you to emergency services"],
          "This includes someone feeling unwell at the table, a person in distress, a participant who can't be found after an experience, or a threat against a venue or a group. Venue staff know the exact address: ask them to help guide the emergency services.",
          "Not sure it's serious? Tell us anyway: we would rather hear about something that turns out to be fine than miss a real emergency.",
        ],
      },
      {
        title: "After the experience",
        body: [
          [
            "Stay in touch at your own pace: share your contact details only with people you trust.",
            "Never send money. Don't lend anything or share bank details, codes or gift cards with someone you met through The Host Club, however moving their story. It's the most common scam: report it to us.",
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
          "Depending on severity: a warning, a restriction, a temporary suspension or a permanent ban. Serious acts lead to an immediate ban, and we may cooperate with the authorities as provided by law. Details, including how to appeal, are in our [community rules](/charte).",
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
      "The Host Club brings together people who don't know each other around a table, a workshop or an outing. It works because everyone arrives open to others — and it only holds if everyone feels safe and respected. These rules set out what we expect from every member, what we act on when something goes wrong, and what happens next.",
    sections: [
      {
        title: "Where they apply",
        body: [
          [
            "During experiences, from arrival to departure, including what directly follows (a drink afterwards, the journey home).",
            "On the website: profile, reviews, participation requests and exchanges with our team.",
            "Outside The Host Club, when a member contacts another against their wishes after an experience.",
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
          "An empty seat is noticed and weighs on the whole table. If you can't come, cancel within the deadlines in the [terms of sale](/cgv) to free up the spot.",
          "Coming with friends? Book their seats in the same booking: the table is put together for a precise number of people, and an unexpected guest would take someone else's place. The person who books makes sure their guests know these rules, and is responsible for them.",
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
        title: "No discrimination at the table",
        body: [
          "Bringing together people of different backgrounds, paths and opinions is the heart of The Host Club. We act on discrimination in every form, whether it comes from a participant or a venue.",
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
        title: "Using The Host Club fairly",
        body: [
          [
            "No selling or soliciting: don't use an experience to recruit, sell, promote your business or farm followers. Talking about your job is conversation; steering the evening towards a transaction isn't.",
            "Be yourself: no false identity, no one else's photos.",
            "No spam, bots or misleading links.",
            "No gaming the system: multiple accounts and abuse of promo codes, the waitlist or reviews are prohibited.",
            "Pay your share: if something outside the price is shared on site, leaving without paying means the others pay for you.",
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
    intro: "These terms govern access to and use of The Host Club. By creating an account or ticking “I accept”, you enter into an electronic contract with The Host Club. If you do not accept them, do not use the service. Prices, payment, cancellation and membership are covered by the [terms of sale](/cgv); the behaviour expected from everyone is set out in the [community rules](/charte). The French version prevails.",
    sections: [
      { title: "1. Publisher", body: ["The site is published by {{publisher}}, registered office {{address}} (ICE {{ice}}, RC {{rc}}). Contact: {{supportEmail}}. Hosting: {{host}}."] },
      { title: "2. The service", body: ["The Host Club offers small-group social experiences (meals, workshops, sport, games, outings) to meet new people, in public places or at partner venues. We choose the venues, put the groups together, keep you informed and are your single point of contact.", "The Host Club is not a dating service. Connections may grow between consenting adults, but any romantic or sexual pressure, pushiness or behaviour that makes the group uncomfortable is prohibited."] },
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
          ],
          "If you no longer meet these conditions, your access may end.",
        ],
      },
      { title: "6. Bookings, requests and waitlists", body: ["An experience is booked directly or, if it is “on request”, once the team approves your request. When a date is full, you can join the waitlist. Prices, payment deadlines, cancellation and refunds are described in the [terms of sale](/cgv)."] },
      { title: "7. How groups are put together", body: ["Groups are based on your city, languages, age, interests and questionnaire answers, avoiding seating the same people together again, so that everyone can join the conversation. A person on our team reviews each line-up. This is neither a psychological assessment nor a judgement about you."] },
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
      { title: "11. Member content", body: ["Reviews, profile photo, bio and messages attached to requests remain your responsibility. You grant The Host Club a free, non-exclusive licence, for as long as needed, to host and display them as part of the service (reviews are signed with your first name and last initial). The team may hide content that is inappropriate, false or unlawful."] },
      {
        title: "12. Reports, sanctions and appeals",
        body: [
          "Inappropriate behaviour can be reported. Depending on severity, the team may warn, restrict, suspend or ban a member; serious acts lead to an immediate ban (details in the [community rules](/charte)). Any suspension or ban is notified to you by email, with the rule concerned.",
          "You can appeal by writing to {{supportEmail}} within 7 days of the notification. The appeal is reviewed by someone who wasn't involved in the original decision, and the answer is reasoned. Every decision is logged.",
        ],
      },
      { title: "13. Intellectual property", body: ["The Host Club brand, the site, its texts, visuals, software and design are protected. You receive a personal, non-transferable, non-commercial right of use; any reproduction or extraction without permission is prohibited."] },
      { title: "14. Liability", body: ["The Host Club organises experiences with care, selects its partner venues, takes reasonable safety measures and informs participants of any change. We cannot, however, guarantee that meeting people is entirely risk-free. To the extent permitted by law, we are not liable for participants' acts, partner venues' services (food, drinks, activities) or force majeure. Descriptive texts and photos are indicative. Each participant remains responsible for their own behaviour and consumption."] },
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
    title: "Terms of sale",
    updated: UPDATED_EN,
    intro: "These terms apply to every experience booking and to the annual membership purchased on The Host Club. Prices, what is included and cancellation terms are always shown before payment. The French version prevails.",
    sections: [
      { title: "1. Seller", body: ["{{publisher}}, {{address}} — ICE {{ice}}. Contact: {{supportEmail}}."] },
      { title: "2. Prices", body: ["Prices are shown in Moroccan dirhams (MAD), all taxes included, per spot. What is included (meal, drinks, equipment, classes…) is stated on each experience page; anything extra is paid directly to the venue. Members pay the member price shown next to the public price.", "A promo code applies after the member price, on direct bookings, once per person, under the conditions stated with the code. A service fee may be added: it is always shown before payment, never applies to a free spot and is refunded with the spot.", "Some experiences are paid in two parts, always shown on the experience page: the organisation part, paid online when you book, and a part paid on site directly to the partner (a fixed price announced in advance, or whatever you order). The on-site part is never collected by The Host Club: it is not on our invoice and is not owed if your booking is cancelled. Member prices, membership, promo codes and service fees only apply to the part paid online."] },
      { title: "3. Booking and payment", body: [["Direct booking: your spot is held while you pay (15 minutes for a card payment; until the stated deadline for a bank transfer), then released if payment fails.", "On-request experiences: nothing to pay when you apply; once accepted, your spot is held for 24 hours.", "Waitlist: if a spot opens up, it is offered to the first person on the list and held for 4 hours.", "Payment by bank transfer: after booking, you receive a unique reference and The Host Club's bank details (on screen and by email). Your spot is held until the stated deadline: 48 hours at most, and no later than 24 hours before the experience. Your booking is confirmed, with your ticket and invoice, as soon as the team sees the transfer of the exact amount with the reference.", "Transfer not received by the deadline: the spot is released and you are told. A transfer that arrives later gets you a spot if one is left; otherwise it is refunded in full. Refunds of a transfer are made by transfer: we ask for the details needed at that time and do not store them on the site.", "When card payment is offered, it is handled by a secure payment provider; The Host Club never receives or stores card details. Your booking is confirmed once payment is confirmed."]] },
      { title: "4. Cancellation by the member", body: [["Up to 48 hours before the start: full refund.", "Less than 48 hours before the start: no refund (the spot may be offered to the waitlist).", "An experience may have specific conditions, shown on its page before booking."], "Cancel from your member area (My bookings). Refunds go back to the original payment method; how long they take to appear depends on your bank."] },
      { title: "5. Cancellation or change by The Host Club", body: ["If we cancel an experience (weather, partner unavailable, not enough participants…), you are informed and fully refunded. We may offer to move your booking to another date of the same experience; you remain free to cancel with a full refund if the new date doesn't suit you."] },
      { title: "6. Annual membership", body: [["Membership gives access for 12 months to the benefits described on the Membership page (member price and, depending on the plan, early access to new dates and members-only experiences).", "It is paid once and is not renewed automatically: you can renew from 30 days before it ends, the new period starting at the end date.", "You may withdraw within 7 days of payment by writing to {{supportEmail}}: you are refunded minus any benefits already used (the difference between the public price and the member price of the spots you booked)."]] },
      { title: "7. No-shows", body: ["Not attending without cancelling does not entitle you to a refund. Repeated no-shows or late cancellations may limit access to on-request experiences or lead to a temporary suspension ([Terms of use](/cgu), section 9)."] },
      { title: "8. Invoices", body: ["A document (invoice or receipt) is issued for each payment and a credit note for each refund. They are emailed to you and available in your member area under “My invoices”."] },
      { title: "9. Complaints and governing law", body: ["Complaints can be sent to {{supportEmail}}; we always look for an amicable solution first. These terms are governed by Moroccan law, including Law 31-08 on consumer protection; failing agreement, the courts of Casablanca have jurisdiction."] },
    ],
  },
  privacy: {
    title: "Privacy policy",
    updated: UPDATED_EN,
    intro: "This policy explains what data we collect, how, why, how long we keep it, who it is shared with and how to exercise your rights, in accordance with Moroccan Law 09-08 on the protection of individuals with regard to the processing of personal data. It applies to The Host Club website, the member area and every service available through them. The French version prevails.",
    sections: [
      { title: "1. Key points", body: [["We only collect what is useful to organise small-group experiences safely.", "We never sell your data and use no advertising cookies or GPS location.", "Within a group, only your first name and interests are shared.", "Your diet and allergies are only passed on to the venue with your explicit consent.", "No photo in which you can be recognised is published without your agreement.", "You can view, correct or download your data and delete your account at any time."]] },
      { title: "2. Data controller", body: ["{{publisher}}, {{address}} (ICE {{ice}}), is responsible for the data processed on the site. For any question about your data: {{privacyEmail}}.", "Declaration to the CNDP: {{cndpDeclaration}}. Authorisation to transfer data outside Morocco: {{cndpTransfer}}.", "It is up to you to give us accurate information and keep it up to date from your member area."] },
      { title: "3. Data we collect", body: [["Account: first name, last name, email address, phone (optional). Your password is handled by our authentication provider and never stored in plain text.", "Profile and questionnaire: date of birth (to check you are an adult), city, languages, interests, goals; gender, profession, bio and photo (optional). The questionnaire is neither a medical nor a psychological assessment.", "Approximate location: your city and, if you provide it, your neighbourhood. No GPS tracking.", "Experiences: bookings, participation requests (message, optional Instagram account), waitlists, tables or teams, attendance on the day, no-shows, reviews, membership, promo codes used.", "Welcome preferences: diet, allergies and table language(s), if you provide them, with the date of your consent to share them with the venue.", "Payments and invoices: amount, date, status, provider reference, documents issued. Card details are entered and processed only by the payment provider: we never receive them.", "Safety and support: reports, messages sent to the team, moderation decisions and appeals.", "Technical data: IP address, connection and security logs, strictly necessary cookies."]] },
      { title: "4. How we collect it", body: [["Directly from you: account creation, questionnaire, booking, participation request, contact or partner application form, report, review.", "Automatically: technical logs and strictly necessary cookies when you use the site.", "From our providers: the payment provider confirms the status and reference of each payment.", "From our team: attendance on the day, table line-ups, moderation decisions."]] },
      {
        title: "5. Why, on what basis, and for how long",
        body: [
          {
            table: {
              head: ["Purpose", "Legal basis", "Retention"],
              rows: [
                ["Creating and managing your account", "Performance of the contract", "While the account is active, then 3 years after the last activity, before deletion or anonymisation."],
                ["Booking, paying, getting refunds, receiving confirmations, reminders and changes", "Performance of the contract", "For the duration of the relationship; accounting records follow the legal period (see “Legal obligations”)."],
                ["Putting tables and teams together, without always seating the same people", "Performance of the contract; legitimate interest", "For the life of the account (table history is used to suggest new encounters)."],
                ["Passing diet, allergies and table languages on to the venue", "Your explicit consent (diet and allergies may reveal health data)", "For the experience and its follow-up, then deleted no later than 30 days after the experience. You can withdraw your consent until the experience starts."],
                ["Protecting the community: age checks, preventing fake accounts and fraud, reports, moderation, appeals", "Legitimate interest; legal obligations", "As long as needed for the community's safety, at most 3 years after the decision."],
                ["Answering your messages and support requests", "Legitimate interest", "3 years after the last exchange."],
                ["Sending you our news by email", "Your consent, which you can withdraw at any time in your preferences", "Until you withdraw consent, or 3 years after your last contact with us."],
                ["Publishing photos or videos of experiences in which you can be recognised", "Your consent, asked for separately", "Until you withdraw consent."],
                ["Keeping the site secure and working properly", "Legitimate interest", "Technical and security logs: 12 months."],
                ["Legal obligations (accounting, requests from authorities)", "Legal obligation", "Accounting records (payments, invoices, credit notes): 10 years, under Law 9-88 on accounting obligations."],
                ["Handling requests to exercise your rights", "Legal obligation", "For the time needed to handle the request; any proof of identity is deleted once checked."],
              ],
            },
          },
        ],
      },
      { title: "6. How groups are put together, transparently", body: ["A tool suggests table and team line-ups based on your languages, age, interests and questionnaire answers, avoiding seating people together who have already met. Our team reviews and adjusts every line-up: none is revealed without human approval. You can change your answers at any time; some information remains necessary for the service to work (age, city, languages). Learn more: [how we put tables together](/blog/comment-nous-composons-les-tables)."] },
      { title: "7. Cookies", body: ["We only use strictly necessary cookies: keeping you signed in and remembering your language. They do not require your consent. We use no audience measurement, personalisation or advertising cookies; if that changes, we will ask for your consent first."] },
      {
        title: "8. Who can access it",
        body: [
          ["Our team, only people who need it (support, safety, moderation, technical), according to their role; this access is logged.", "Other participants in your group: only your first name and interests, once the group is revealed.", "The venue hosting the experience: the number of participants, first names for the welcome and place cards and, with your consent, your diet, allergies and table languages. Never your contact details.", "Authorities, where required by law."],
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

export const LEGAL_DOCS: Record<"fr" | "en" | "ar", Record<LegalKey, LegalDoc>> = { fr, en, ar: LEGAL_AR };
