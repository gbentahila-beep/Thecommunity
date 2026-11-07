/**
 * Textes juridiques et page Sécurité, rédigés à partir du fonctionnement réel du site.
 * (Relecture par un avocat : suivie dans docs/16, jamais mentionnée sur le site.)
 * Les jetons {{…}} sont remplacés par les informations légales (lib/legal-info.ts) ou « à compléter ».
 * Français : version de référence. Anglais : traduction. Arabe : traduction à venir (la version française s'affiche).
 */

export type LegalKey = "terms" | "sales" | "privacy" | "safety";
export type LegalSection = { title: string; body: (string | string[])[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const UPDATED_FR = "Dernière mise à jour : 8 novembre 2026 · en vigueur à la même date";

const fr: Record<LegalKey, LegalDoc> = {
  safety: {
    title: "Sécurité",
    updated: UPDATED_FR,
    intro:
      "Rencontrer de nouvelles personnes doit rester un plaisir. La sécurité n'est pas une option chez The Host Club : elle guide chacune de nos décisions. Voici nos principes, nos règles, et ce que vous pouvez faire si quelque chose ne va pas.",
    sections: [
      {
        title: "Nos principes",
        body: [
          [
            "La sécurité avant la croissance : face à un risque, nous choisissons toujours l'option la plus prudente, même si elle nous coûte une réservation ou un membre.",
            "L'amitié d'abord : The Host Club n'est pas une application de rencontre amoureuse. Des liens peuvent naître entre adultes consentants, mais l'insistance, la pression amoureuse ou sexuelle et les avances répétées non désirées sont interdites.",
            "Entre adultes : le service est réservé aux personnes de 18 ans et plus. Un compte qui semble appartenir à un mineur peut être restreint, vérifié ou supprimé.",
            "De vraies personnes : chacun se présente sous sa véritable identité. Faux profils, usurpation d'identité, photos d'autrui, comptes multiples ou automatisés sont interdits ; nous pouvons demander une vérification en cas de doute.",
          ],
        ],
      },
      {
        title: "Comment nous organisons les expériences",
        body: [
          [
            "Toujours dans des lieux publics ou chez des partenaires sélectionnés (restaurants, studios, ateliers) — jamais au domicile d'un participant.",
            "En petits groupes composés par notre équipe : moins de pression, personne d'isolé.",
            "Certaines expériences sont « sur demande » : l'équipe valide chaque participant.",
            "Nous partageons le strict minimum : au sein d'un groupe, seuls le prénom et les centres d'intérêt sont visibles. Ni téléphone, ni e-mail, ni nom de famille.",
            "Pas de messagerie privée entre participants : on se rencontre d'abord, en vrai, dans un lieu public.",
            "Pour certains dîners, le lieu exact est communiqué la veille, avec la composition de votre table.",
          ],
        ],
      },
      {
        title: "Pendant l'expérience",
        body: [
          [
            "Vous êtes libre de partir à tout moment, sans avoir à vous justifier.",
            "Si vous ne vous sentez pas à l'aise, parlez-en au personnel du lieu ou contactez notre équipe.",
            "L'alcool n'est jamais obligatoire ; des boissons sans alcool sont toujours proposées. Consommez avec modération.",
            "Gardez vos effets personnels avec vous et rentrez par vos propres moyens.",
          ],
        ],
      },
      {
        title: "Ce qui est interdit",
        body: [
          [
            "Le harcèlement : contacts répétés non désirés, intimidation, moqueries, attaques personnelles.",
            "Les propos haineux ou discriminants visant l'origine, la nationalité, la religion, le handicap, le genre ou l'orientation sexuelle.",
            "Les menaces : violence, dégradation, divulgation d'informations personnelles, chantage.",
            "Les comportements sexuels non consentis : remarques, gestes ou avances non désirés, contenus explicites.",
            "La possession ou la consommation de substances illicites pendant une expérience.",
            "La fraude : fausse identité, contournement d'une suspension, nouveau compte après une exclusion, manipulation des avis.",
            "Le démarchage commercial des autres participants, et le fait de photographier ou filmer quelqu'un sans son accord.",
          ],
        ],
      },
      {
        title: "Notre charte de bonne conduite",
        body: [
          "En réservant, chaque membre s'engage à :",
          [
            "respecter les autres participants, l'équipe et le personnel des lieux ;",
            "respecter le consentement et les limites de chacun, y compris après l'expérience ;",
            "venir à l'heure, ou annuler à temps pour libérer la place.",
          ],
        ],
      },
      {
        title: "Signaler un problème",
        body: [
          "Pendant ou après une expérience, signalez tout comportement à {{safetyEmail}}, via le lien « Signaler un comportement » de votre réservation ou la page Contact : harcèlement, faux profil, propos haineux, comportement dangereux, fraude, contenu inapproprié. Indiquez la date, l'expérience et ce qui s'est passé : votre signalement reste confidentiel.",
          "Chaque signalement est lu par l'équipe le plus vite possible (objectif : sous 48 heures). Un signalement volontairement faux, destiné à nuire, est lui-même considéré comme un abus.",
        ],
      },
      {
        title: "Nos mesures",
        body: [
          "Selon la gravité : avertissement, restriction (par exemple aux expériences sur demande), suspension temporaire, exclusion définitive. Nous privilégions d'abord le dialogue et la gradation, mais les faits graves — menaces, violences, comportement prédateur, usurpation d'identité, propos haineux, fraude — peuvent entraîner une exclusion immédiate.",
          "Chaque décision est enregistrée. Vous pouvez la contester en écrivant à {{supportEmail}}.",
        ],
      },
      {
        title: "En cas d'urgence",
        body: [
          "Si vous êtes en danger, appelez immédiatement les secours :",
          ["Police : 19", "Gendarmerie royale : 177", "Protection civile (pompiers, ambulances) : 15"],
          "Prévenez ensuite notre équipe. En cas de menace, de violence, d'agression, de harcèlement grave ou de risque pour la vie de quelqu'un, nous pouvons suspendre les comptes concernés, conserver les éléments utiles et coopérer avec les autorités dans le cadre prévu par la loi.",
        ],
      },
      {
        title: "Vos données et notre équipe",
        body: [
          "Nous ne vendons jamais vos données. Seules les personnes de l'équipe qui en ont besoin (support, sécurité, modération, technique) y accèdent, et ces accès sont enregistrés. Le détail figure dans la Politique de confidentialité.",
          "Vous avez découvert une faille de sécurité ? Écrivez-nous en privé à {{securityEmail}} et laissez-nous le temps de la corriger avant d'en parler publiquement.",
        ],
      },
    ],
  },

  terms: {
    title: "Conditions générales d'utilisation",
    updated: UPDATED_FR,
    intro:
      "Ces conditions encadrent l'accès et l'utilisation du site The Host Club. En créant un compte ou en cochant « J'accepte », vous concluez un contrat électronique avec The Host Club. Si vous ne les acceptez pas, n'utilisez pas le service. Prix, paiement, annulation et abonnement relèvent des Conditions générales de vente.",
    sections: [
      { title: "1. Éditeur", body: ["Le site est édité par {{publisher}}, dont le siège est situé {{address}} (ICE {{ice}}, RC {{rc}}). Contact : {{supportEmail}}. Hébergement : {{host}}."] },
      {
        title: "2. Le service",
        body: [
          "The Host Club propose des expériences sociales en petit groupe (repas, ateliers, sport, jeux, sorties) pour rencontrer de nouvelles personnes, dans des lieux publics ou chez des partenaires. Nous organisons, composons les groupes et restons votre interlocuteur unique.",
          "The Host Club n'est pas un service de rencontre amoureuse. Des liens peuvent naître entre adultes consentants, mais toute pression amoureuse ou sexuelle, toute insistance et tout comportement qui met le groupe mal à l'aise sont interdits.",
        ],
      },
      {
        title: "3. Compte",
        body: [
          [
            "Le service est réservé aux personnes de 18 ans et plus.",
            "Vous fournissez des informations exactes et à jour, sous votre véritable identité ; un seul compte par personne.",
            "Nous pouvons vous demander de confirmer votre identité ou votre âge en cas de doute.",
            "Vos identifiants sont personnels : vous êtes responsable de leur confidentialité et de l'activité de votre compte.",
            "La confirmation de l'adresse e-mail et le questionnaire de profil sont nécessaires pour réserver. Vos réponses peuvent être modifiées à tout moment.",
          ],
        ],
      },
      {
        title: "4. Réservations, demandes et listes d'attente",
        body: [
          "Une expérience se réserve directement ou, si elle est « sur demande », après validation de votre demande par l'équipe. Quand une date est complète, vous pouvez rejoindre la liste d'attente. Le fonctionnement détaillé (prix, délais de paiement, annulation, remboursement) figure dans les Conditions générales de vente.",
        ],
      },
      {
        title: "5. Composition des groupes",
        body: [
          "Les groupes sont composés à partir de votre ville, de vos disponibilités, de vos langues, de vos centres d'intérêt et de vos réponses au questionnaire, afin que chacun puisse participer à la conversation. Cette composition n'est ni une évaluation psychologique ni un jugement sur votre personne.",
        ],
      },
      {
        title: "6. Règles de conduite",
        body: [
          "Chaque membre respecte la charte de bonne conduite et les règles de la page Sécurité. Sont notamment interdits : harcèlement, propos haineux, menaces, intimidation, discrimination, comportements sexuels non consentis, comportements dangereux, possession ou consommation de substances illicites pendant une expérience, fausse identité et comptes multiples.",
          "Les premières rencontres ont toujours lieu dans un lieu public ou chez un partenaire.",
        ],
      },
      {
        title: "7. Fiabilité : annulations tardives et absences",
        body: [
          "Une place réservée est une place refusée à quelqu'un d'autre. En cas d'annulations tardives ou d'absences répétées, l'équipe peut limiter votre accès (expériences sur demande, liste d'attente) ou suspendre temporairement votre compte, après vous avoir prévenu. Les conséquences financières sont décrites dans les Conditions générales de vente.",
        ],
      },
      {
        title: "8. Lieux partenaires",
        body: [
          "Les lieux partenaires sont des établissements indépendants. Ce qui est compris dans le prix est indiqué sur la fiche de chaque expérience ; toute consommation supplémentaire se règle directement auprès du lieu. Chaque partenaire reste responsable des prestations qu'il fournit et de son établissement.",
        ],
      },
      {
        title: "9. Contenus publiés par les membres",
        body: [
          "Les avis, la photo de profil, la biographie et les messages joints aux demandes restent sous votre responsabilité. Vous accordez à The Host Club, gratuitement et pour la durée nécessaire, une licence non exclusive pour les héberger et les afficher dans le cadre du service (vos avis sont signés de votre prénom et de l'initiale de votre nom). L'équipe peut masquer un contenu inapproprié, faux ou contraire à la loi.",
        ],
      },
      {
        title: "10. Signalements, modération et recours",
        body: [
          "Tout comportement inapproprié peut être signalé (page Sécurité). Selon la gravité, l'équipe peut avertir, restreindre, suspendre ou exclure un membre ; les faits graves peuvent entraîner une exclusion immédiate. Chaque décision est enregistrée et peut être contestée à {{supportEmail}}.",
        ],
      },
      {
        title: "11. Propriété intellectuelle",
        body: ["La marque The Host Club, le site, ses textes, visuels, logiciels et sa présentation sont protégés. Vous bénéficiez d'un droit d'utilisation personnel, non transférable et non commercial ; toute reproduction ou extraction sans autorisation est interdite."],
      },
      {
        title: "12. Responsabilités",
        body: [
          "The Host Club organise les expériences avec soin, prend des mesures raisonnables de sécurité et informe les participants de tout changement. Nous ne pouvons toutefois garantir qu'une rencontre entre personnes soit sans aucun risque. Dans les limites permises par la loi, nous ne répondons pas des actes des participants ni des prestations des lieux partenaires, ni des cas de force majeure. Chaque participant reste responsable de son comportement et de sa consommation.",
        ],
      },
      {
        title: "13. Durée, suppression du compte et suspension",
        body: [
          "Vous pouvez demander la suppression de votre compte à tout moment depuis vos préférences. Nous pouvons suspendre ou fermer un compte qui enfreint ces conditions ou qui présente un risque pour la communauté.",
        ],
      },
      { title: "14. Données personnelles", body: ["Le traitement de vos données est décrit dans la Politique de confidentialité, conformément à la loi n° 09-08."] },
      { title: "15. Modifications", body: ["Ces conditions peuvent évoluer. La version applicable est celle publiée sur le site, avec sa date d'entrée en vigueur ; en cas de changement important, vous en serez informé et votre accord pourra vous être redemandé."] },
      {
        title: "16. Droit applicable et litiges",
        body: ["Ces conditions sont soumises au droit marocain. En cas de désaccord, écrivez d'abord à {{supportEmail}} pour rechercher une solution amiable. À défaut d'accord, les tribunaux de Casablanca sont compétents."],
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
        ],
      },
      {
        title: "3. Réservation et paiement",
        body: [
          [
            "Réservation directe : la place est bloquée 15 minutes le temps du paiement, puis remise en vente si le paiement n'a pas abouti.",
            "Expérience sur demande : aucun paiement à la demande ; si elle est acceptée, la place est réservée 24 heures pour payer.",
            "Liste d'attente : si une place se libère, elle est proposée à la première personne inscrite et réservée 4 heures pour payer.",
            "Le paiement s'effectue en ligne par carte, auprès d'un prestataire de paiement sécurisé ; The Host Club ne reçoit ni ne conserve aucune donnée de carte. La réservation est confirmée à réception de la confirmation du paiement.",
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
        body: ["Une absence sans annulation (no-show) n'ouvre pas droit à remboursement. Des absences ou annulations tardives répétées peuvent limiter l'accès aux expériences sur demande ou entraîner une suspension temporaire (Conditions générales d'utilisation, article 7)."],
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
      "Cette politique explique quelles données nous collectons, pourquoi, avec qui elles sont partagées et comment exercer vos droits, conformément à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.",
    sections: [
      {
        title: "1. L'essentiel",
        body: [
          [
            "Nous collectons uniquement ce qui est utile pour organiser des expériences en petit groupe, en sécurité.",
            "Nous ne vendons jamais vos données.",
            "Au sein d'un groupe, seuls votre prénom et vos centres d'intérêt sont partagés.",
            "Nous n'utilisons pas votre position GPS et aucun cookie publicitaire.",
            "Vous pouvez à tout moment consulter, corriger ou télécharger vos données, modifier vos réponses au questionnaire et supprimer votre compte (loi n° 09-08).",
          ],
        ],
      },
      {
        title: "2. Responsable du traitement",
        body: [
          "{{publisher}}, {{address}} (ICE {{ice}}), est responsable des données traitées sur le site. Pour toute question relative à vos données : {{privacyEmail}}.",
          "Déclaration des traitements auprès de la CNDP : {{cndpDeclaration}}. Autorisation de transfert des données hors du Maroc : {{cndpTransfer}}.",
        ],
      },
      {
        title: "3. Données collectées",
        body: [
          [
            "Compte : prénom, nom, adresse e-mail, téléphone (facultatif). Le mot de passe est géré par notre prestataire d'authentification et n'est jamais stocké en clair.",
            "Profil et questionnaire : date de naissance (pour vérifier la majorité), ville, langues parlées, centres d'intérêt, objectifs ; genre, profession, biographie et photo (facultatifs). Le questionnaire n'est ni une évaluation médicale ni une évaluation psychologique.",
            "Localisation approximative : votre ville et, si vous l'indiquez, votre quartier. Aucun suivi GPS.",
            "Expériences : réservations, demandes de participation (message, compte Instagram facultatif), listes d'attente, présence le jour J, absences, avis, abonnement, régime alimentaire ou allergie si vous nous les signalez.",
            "Paiements et factures : montant, date, statut, référence du prestataire, documents émis. Les données de carte bancaire sont saisies et traitées uniquement par le prestataire de paiement : nous ne les recevons jamais.",
            "Sécurité et assistance : signalements, messages envoyés à l'équipe, décisions de modération.",
            "Données techniques : adresse IP, journaux de connexion et de sécurité, cookies strictement nécessaires.",
          ],
        ],
      },
      {
        title: "4. Pourquoi nous les utilisons, et sur quelle base",
        body: [
          [
            "Fournir le service (exécution du contrat) : compte, réservations, paiements, remboursements, factures, notifications.",
            "Composer des groupes équilibrés et, pour les expériences sur demande, permettre à l'équipe de choisir les participants (exécution du contrat, intérêt légitime).",
            "Protéger la communauté : vérification de l'âge, prévention des faux comptes, des abus et de la fraude, traitement des signalements (intérêt légitime, obligations légales).",
            "Respecter nos obligations légales, notamment comptables.",
            "Vous informer de nos nouveautés, uniquement avec votre consentement, retirable à tout moment dans vos préférences.",
          ],
        ],
      },
      {
        title: "5. Composition des groupes : en toute transparence",
        body: [
          "Les groupes sont composés par notre équipe à partir de votre ville, de vos disponibilités, de vos langues, de vos centres d'intérêt et de vos réponses au questionnaire. Un outil de suggestion automatique pourra aider l'équipe ; aucune composition n'est publiée sans validation humaine. Vous pouvez modifier vos réponses à tout moment ; certaines informations restent nécessaires au fonctionnement du service (âge, ville, langues).",
        ],
      },
      {
        title: "6. Cookies",
        body: [
          "Nous utilisons uniquement des cookies strictement nécessaires : maintien de votre connexion et mémorisation de la langue. Ils ne nécessitent pas votre consentement. Nous n'utilisons aucun cookie de mesure d'audience, de personnalisation ou de publicité ; si cela devait changer, votre consentement serait demandé au préalable.",
        ],
      },
      {
        title: "7. Qui y a accès",
        body: [
          [
            "Notre équipe, uniquement les personnes qui en ont besoin (assistance, sécurité, modération, technique), selon leur rôle ; ces accès sont enregistrés.",
            "Les autres participants de votre groupe : uniquement votre prénom et vos centres d'intérêt, une fois le groupe révélé.",
            "Le lieu qui accueille l'expérience : le nombre de participants, les besoins particuliers (régime, allergie) et, si nécessaire, votre prénom pour l'accueil.",
            "Nos prestataires techniques, pour notre compte et selon nos instructions : hébergement (Google Cloud / Firebase), paiement, envoi d'e-mails.",
            "Les autorités, lorsque la loi l'exige.",
          ],
          "Nous ne vendons jamais vos données.",
        ],
      },
      {
        title: "8. Où sont-elles hébergées",
        body: ["Vos données sont hébergées par Google Cloud dans l'Union européenne (Belgique et Pays-Bas). Ce transfert hors du Maroc est encadré conformément à la loi n° 09-08 et aux procédures de la CNDP ({{cndpTransfer}})."],
      },
      {
        title: "9. Durées de conservation",
        body: [
          [
            "Compte : tant qu'il est actif, puis 3 ans après la dernière activité, avant suppression ou anonymisation.",
            "Signalements et décisions de modération : le temps nécessaire à la sécurité de la communauté, 3 ans au plus après la décision.",
            "Journaux techniques et de sécurité : 12 mois.",
            "Pièces comptables (paiements, factures, avoirs) : durée imposée par la loi.",
          ],
        ],
      },
      {
        title: "10. Sécurité",
        body: ["Nous appliquons des mesures techniques et organisationnelles adaptées : échanges chiffrés (HTTPS), mots de passe jamais stockés en clair, accès limités selon les rôles et enregistrés, règles d'accès à la base de données, aucune donnée de carte conservée, sauvegardes."],
      },
      {
        title: "11. Vos droits",
        body: [
          "Vous disposez d'un droit d'accès, de rectification et d'opposition (loi n° 09-08). Depuis votre espace membre, vous pouvez modifier votre profil et vos réponses, télécharger vos données et demander la suppression de votre compte. Pour toute autre demande : {{privacyEmail}}. Vous pouvez aussi saisir la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP, www.cndp.ma).",
        ],
      },
      { title: "12. Mineurs", body: ["Le service est réservé aux personnes majeures (18 ans et plus). Si un compte semble appartenir à un mineur, nous pouvons le suspendre et procéder à des vérifications."] },
      { title: "13. Modifications", body: ["Cette politique peut évoluer. La version applicable est celle publiée sur le site, avec sa date de mise à jour ; en cas de changement important, vous en serez informé."] },
    ],
  },
};

const UPDATED_EN = "Last updated: 8 November 2026 · effective the same day";

const en: Record<LegalKey, LegalDoc> = {
  safety: {
    title: "Safety",
    updated: UPDATED_EN,
    intro: "Meeting new people should always feel good. Safety is not optional at The Host Club: it guides every decision we make. Here are our principles, our rules, and what you can do if something goes wrong.",
    sections: [
      {
        title: "Our principles",
        body: [
          [
            "Safety before growth: when there is a risk, we always choose the most careful option, even if it costs us a booking or a member.",
            "Friendship first: The Host Club is not a dating app. Connections may grow between consenting adults, but pushiness, romantic or sexual pressure and repeated unwanted advances are prohibited.",
            "Adults only: the service is for people aged 18 and over. An account that seems to belong to a minor may be restricted, verified or removed.",
            "Real people: everyone uses their real identity. Fake profiles, impersonation, other people's photos, multiple or automated accounts are prohibited; we may ask for verification if in doubt.",
          ],
        ],
      },
      {
        title: "How we organise experiences",
        body: [
          [
            "Always in public places or at selected partners (restaurants, studios, workshops) — never at a participant's home.",
            "In small groups put together by our team: less pressure, nobody left out.",
            "Some experiences are “on request”: the team approves each participant.",
            "We share the bare minimum: within a group, only first names and interests are visible. No phone numbers, emails or surnames.",
            "No private messaging between participants: you meet first, in person, in a public place.",
            "For some dinners, the exact venue is shared the day before, together with your table.",
          ],
        ],
      },
      {
        title: "During the experience",
        body: [
          [
            "You are free to leave at any time, without having to explain why.",
            "If you feel uncomfortable, talk to the venue staff or contact our team.",
            "Alcohol is never required and non-alcoholic drinks are always available. Please drink responsibly.",
            "Keep your belongings with you and make your own way home.",
          ],
        ],
      },
      {
        title: "What is prohibited",
        body: [
          [
            "Harassment: repeated unwanted contact, intimidation, mockery, personal attacks.",
            "Hateful or discriminatory remarks targeting origin, nationality, religion, disability, gender or sexual orientation.",
            "Threats: violence, damage, disclosing personal information, blackmail.",
            "Non-consensual sexual behaviour: unwanted remarks, gestures or advances, explicit content.",
            "Possessing or using illegal substances during an experience.",
            "Fraud: false identity, getting around a suspension, a new account after a ban, manipulating reviews.",
            "Soliciting other participants for business, and photographing or filming someone without their consent.",
          ],
        ],
      },
      {
        title: "Our code of conduct",
        body: [
          "By booking, every member agrees to:",
          ["respect other participants, our team and venue staff;", "respect everyone's consent and boundaries, including after the experience;", "arrive on time, or cancel early enough to free up the spot."],
        ],
      },
      {
        title: "Report a problem",
        body: [
          "During or after an experience, report any behaviour to {{safetyEmail}}, through the “Report someone's behaviour” link on your booking, or via the Contact page: harassment, fake profile, hate speech, unsafe behaviour, fraud, inappropriate content. Tell us the date, the experience and what happened: your report stays confidential.",
          "Every report is read by the team as quickly as possible (target: within 48 hours). A deliberately false report intended to harm someone is itself considered abuse.",
        ],
      },
      {
        title: "What we do",
        body: [
          "Depending on severity: a warning, a restriction (for example to on-request experiences), a temporary suspension or a permanent ban. We start with dialogue and step up gradually, but serious acts — threats, violence, predatory behaviour, impersonation, hate speech, fraud — may lead to an immediate ban.",
          "Every decision is logged. You can appeal by writing to {{supportEmail}}.",
        ],
      },
      {
        title: "In an emergency",
        body: [
          "If you are in danger, call the emergency services immediately:",
          ["Police: 19", "Royal Gendarmerie: 177", "Civil protection (fire, ambulance): 15"],
          "Then let our team know. In case of threats, violence, assault, serious harassment or a risk to someone's life, we may suspend the accounts involved, keep the relevant information and cooperate with the authorities as provided by law.",
        ],
      },
      {
        title: "Your data and our team",
        body: [
          "We never sell your data. Only team members who need it (support, safety, moderation, technical) can access it, and that access is logged. Details are in the Privacy policy.",
          "Found a security vulnerability? Write to us privately at {{securityEmail}} and give us time to fix it before talking about it publicly.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    updated: UPDATED_EN,
    intro: "These terms govern access to and use of The Host Club. By creating an account or ticking “I accept”, you enter into an electronic contract with The Host Club. If you do not accept them, do not use the service. Prices, payment, cancellation and membership are covered by the Terms of sale. The French version prevails.",
    sections: [
      { title: "1. Publisher", body: ["The site is published by {{publisher}}, registered office {{address}} (ICE {{ice}}, RC {{rc}}). Contact: {{supportEmail}}. Hosting: {{host}}."] },
      { title: "2. The service", body: ["The Host Club offers small-group social experiences (meals, workshops, sport, games, outings) to meet new people, in public places or at partner venues. We organise them, put the groups together and are your single point of contact.", "The Host Club is not a dating service. Connections may grow between consenting adults, but any romantic or sexual pressure, pushiness or behaviour that makes the group uncomfortable is prohibited."] },
      { title: "3. Account", body: [["The service is for people aged 18 and over.", "You provide accurate, up-to-date information under your real identity; one account per person.", "We may ask you to confirm your identity or age if in doubt.", "Your login details are personal: you are responsible for keeping them confidential and for activity on your account.", "A confirmed email address and the profile questionnaire are required to book. You can change your answers at any time."]] },
      { title: "4. Bookings, requests and waitlists", body: ["An experience is booked directly or, if it is “on request”, once the team approves your request. When a date is full, you can join the waitlist. Prices, payment deadlines, cancellation and refunds are described in the Terms of sale."] },
      { title: "5. How groups are put together", body: ["Groups are based on your city, availability, languages, interests and questionnaire answers, so that everyone can join the conversation. This is neither a psychological assessment nor a judgement about you."] },
      { title: "6. Code of conduct", body: ["Every member follows the code of conduct and the rules on the Safety page. Prohibited behaviour includes harassment, hate speech, threats, intimidation, discrimination, non-consensual sexual behaviour, dangerous behaviour, possessing or using illegal substances during an experience, false identity and multiple accounts.", "First meetings always take place in a public place or at a partner venue."] },
      { title: "7. Reliability: late cancellations and no-shows", body: ["A booked spot is a spot someone else couldn't have. After repeated late cancellations or no-shows, the team may limit your access (on-request experiences, waitlist) or temporarily suspend your account, after warning you. Financial consequences are described in the Terms of sale."] },
      { title: "8. Partner venues", body: ["Partner venues are independent businesses. What the price includes is stated on each experience page; anything extra is paid directly to the venue. Each partner remains responsible for the services it provides and for its premises."] },
      { title: "9. Member content", body: ["Reviews, profile photo, bio and messages attached to requests remain your responsibility. You grant The Host Club a free, non-exclusive licence, for as long as needed, to host and display them as part of the service (reviews are signed with your first name and last initial). The team may hide content that is inappropriate, false or unlawful."] },
      { title: "10. Reports, moderation and appeals", body: ["Inappropriate behaviour can be reported (Safety page). Depending on severity, the team may warn, restrict, suspend or ban a member; serious acts may lead to an immediate ban. Every decision is logged and can be appealed at {{supportEmail}}."] },
      { title: "11. Intellectual property", body: ["The Host Club brand, the site, its texts, visuals, software and design are protected. You receive a personal, non-transferable, non-commercial right of use; any reproduction or extraction without permission is prohibited."] },
      { title: "12. Liability", body: ["The Host Club organises experiences with care, takes reasonable safety measures and informs participants of any change. We cannot, however, guarantee that meeting people is entirely risk-free. To the extent permitted by law, we are not liable for participants' acts, partner venues' services or force majeure. Each participant remains responsible for their own behaviour and consumption."] },
      { title: "13. Duration, account deletion and suspension", body: ["You can request the deletion of your account at any time from your preferences. We may suspend or close an account that breaches these terms or poses a risk to the community."] },
      { title: "14. Personal data", body: ["How we process your data is described in the Privacy policy, in accordance with Moroccan Law 09-08."] },
      { title: "15. Changes", body: ["These terms may change. The applicable version is the one published on the site with its effective date; you will be informed of significant changes and may be asked to accept them again."] },
      { title: "16. Governing law and disputes", body: ["These terms are governed by Moroccan law. If you disagree with us, first write to {{supportEmail}} so we can look for an amicable solution. Failing agreement, the courts of Casablanca have jurisdiction."] },
    ],
  },
  sales: {
    title: "Terms of sale",
    updated: UPDATED_EN,
    intro: "These terms apply to every experience booking and to the annual membership purchased on The Host Club. Prices, what is included and cancellation terms are always shown before payment. The French version prevails.",
    sections: [
      { title: "1. Seller", body: ["{{publisher}}, {{address}} — ICE {{ice}}. Contact: {{supportEmail}}."] },
      { title: "2. Prices", body: ["Prices are shown in Moroccan dirhams (MAD), all taxes included, per spot. What is included (meal, drinks, equipment, classes…) is stated on each experience page; anything extra is paid directly to the venue. Members pay the member price shown next to the public price."] },
      { title: "3. Booking and payment", body: [["Direct booking: your spot is held for 15 minutes while you pay, then released if payment fails.", "On-request experiences: nothing to pay when you apply; once accepted, your spot is held for 24 hours.", "Waitlist: if a spot opens up, it is offered to the first person on the list and held for 4 hours.", "Payment is made online by card through a secure payment provider; The Host Club never receives or stores card details. Your booking is confirmed once payment is confirmed."]] },
      { title: "4. Cancellation by the member", body: [["Up to 48 hours before the start: full refund.", "Less than 48 hours before the start: no refund (the spot may be offered to the waitlist).", "An experience may have specific conditions, shown on its page before booking."], "Cancel from your member area (My bookings). Refunds go back to the original payment method; how long they take to appear depends on your bank."] },
      { title: "5. Cancellation or change by The Host Club", body: ["If we cancel an experience (weather, partner unavailable, not enough participants…), you are informed and fully refunded. We may offer to move your booking to another date of the same experience; you remain free to cancel with a full refund if the new date doesn't suit you."] },
      { title: "6. Annual membership", body: [["Membership gives access for 12 months to the benefits described on the Membership page (member price and, depending on the plan, early access to new dates and members-only experiences).", "It is paid once and is not renewed automatically: you can renew from 30 days before it ends, the new period starting at the end date.", "You may withdraw within 7 days of payment by writing to {{supportEmail}}: you are refunded minus any benefits already used (the difference between the public price and the member price of the spots you booked)."]] },
      { title: "7. No-shows", body: ["Not attending without cancelling does not entitle you to a refund. Repeated no-shows or late cancellations may limit access to on-request experiences or lead to a temporary suspension (Terms of use, section 7)."] },
      { title: "8. Invoices", body: ["A document (invoice or receipt) is issued for each payment and a credit note for each refund. They are emailed to you and available in your member area under “My invoices”."] },
      { title: "9. Complaints and governing law", body: ["Complaints can be sent to {{supportEmail}}; we always look for an amicable solution first. These terms are governed by Moroccan law, including Law 31-08 on consumer protection; failing agreement, the courts of Casablanca have jurisdiction."] },
    ],
  },
  privacy: {
    title: "Privacy policy",
    updated: UPDATED_EN,
    intro: "This policy explains what data we collect, why, who it is shared with and how to exercise your rights, in accordance with Moroccan Law 09-08 on the protection of individuals with regard to the processing of personal data. The French version prevails.",
    sections: [
      { title: "1. Key points", body: [["We only collect what is useful to organise small-group experiences safely.", "We never sell your data.", "Within a group, only your first name and interests are shared.", "We do not use your GPS location or any advertising cookies.", "You can view, correct or download your data, change your questionnaire answers and delete your account at any time (Law 09-08)."]] },
      { title: "2. Data controller", body: ["{{publisher}}, {{address}} (ICE {{ice}}), is responsible for the data processed on the site. For any question about your data: {{privacyEmail}}.", "Declaration to the CNDP: {{cndpDeclaration}}. Authorisation to transfer data outside Morocco: {{cndpTransfer}}."] },
      { title: "3. Data we collect", body: [["Account: first name, last name, email address, phone (optional). Your password is handled by our authentication provider and never stored in plain text.", "Profile and questionnaire: date of birth (to check you are an adult), city, languages, interests, goals; gender, profession, bio and photo (optional). The questionnaire is neither a medical nor a psychological assessment.", "Approximate location: your city and, if you provide it, your neighbourhood. No GPS tracking.", "Experiences: bookings, participation requests (message, optional Instagram account), waitlists, attendance on the day, no-shows, reviews, membership, diet or allergies if you tell us.", "Payments and invoices: amount, date, status, provider reference, documents issued. Card details are entered and processed only by the payment provider: we never receive them.", "Safety and support: reports, messages sent to the team, moderation decisions.", "Technical data: IP address, connection and security logs, strictly necessary cookies."]] },
      { title: "4. Why we use it, and on what basis", body: [["To provide the service (performance of the contract): account, bookings, payments, refunds, invoices, notifications.", "To put balanced groups together and, for on-request experiences, to let the team choose participants (performance of the contract, legitimate interest).", "To protect the community: age checks, preventing fake accounts, abuse and fraud, handling reports (legitimate interest, legal obligations).", "To meet our legal obligations, including accounting.", "To share news, only with your consent, which you can withdraw at any time in your preferences."]] },
      { title: "5. How groups are put together, transparently", body: ["Groups are put together by our team based on your city, availability, languages, interests and questionnaire answers. An automatic suggestion tool may help the team; no group is published without human approval. You can change your answers at any time; some information remains necessary for the service to work (age, city, languages)."] },
      { title: "6. Cookies", body: ["We only use strictly necessary cookies: keeping you signed in and remembering your language. They do not require your consent. We use no audience measurement, personalisation or advertising cookies; if that changes, we will ask for your consent first."] },
      { title: "7. Who can access it", body: [["Our team, only people who need it (support, safety, moderation, technical), according to their role; this access is logged.", "Other participants in your group: only your first name and interests, once the group is revealed.", "The venue hosting the experience: the number of participants, special needs (diet, allergies) and, if needed, your first name to welcome you.", "Our technical providers, on our behalf and following our instructions: hosting (Google Cloud / Firebase), payment, email delivery.", "Authorities, where required by law."], "We never sell your data."] },
      { title: "8. Where it is stored", body: ["Your data is hosted by Google Cloud in the European Union (Belgium and the Netherlands). This transfer outside Morocco is handled in accordance with Law 09-08 and CNDP procedures ({{cndpTransfer}})."] },
      { title: "9. Retention", body: [["Account: while active, then 3 years after the last activity, before deletion or anonymisation.", "Reports and moderation decisions: as long as needed for the community's safety, at most 3 years after the decision.", "Technical and security logs: 12 months.", "Accounting records (payments, invoices, credit notes): as required by law."]] },
      { title: "10. Security", body: ["We apply appropriate technical and organisational measures: encrypted connections (HTTPS), passwords never stored in plain text, role-based and logged access, database access rules, no card data stored, backups."] },
      { title: "11. Your rights", body: ["You have the right of access, rectification and objection (Law 09-08). From your member area, you can edit your profile and answers, download your data and request the deletion of your account. For anything else: {{privacyEmail}}. You can also contact the CNDP (www.cndp.ma)."] },
      { title: "12. Minors", body: ["The service is for adults only (18 and over). If an account seems to belong to a minor, we may suspend it and carry out checks."] },
      { title: "13. Changes", body: ["This policy may change. The applicable version is the one published on the site with its update date; you will be informed of significant changes."] },
    ],
  },
};

export const LEGAL_DOCS: Record<"fr" | "en", Record<LegalKey, LegalDoc>> = { fr, en };
