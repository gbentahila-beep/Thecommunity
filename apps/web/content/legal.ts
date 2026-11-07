/**
 * Textes juridiques et page Sécurité — PROJETS rédigés à partir du fonctionnement réel du site,
 * à faire relire et valider par un avocat avant l'ouverture au public (docs/11, section E).
 * Les jetons {{…}} sont remplacés par les informations légales (lib/legal-info.ts) ou « à compléter ».
 * Français : version de référence. Anglais : traduction. Arabe : traduction à venir (la version française s'affiche).
 */

export type LegalKey = "terms" | "sales" | "privacy" | "safety";
export type LegalSection = { title: string; body: (string | string[])[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const fr: Record<LegalKey, LegalDoc> = {
  safety: {
    title: "Sécurité",
    updated: "Version provisoire du 7 novembre 2026",
    intro:
      "Rencontrer de nouvelles personnes doit rester un plaisir. Voici comment nous organisons chaque expérience pour que chacun se sente à l'aise, et ce que vous pouvez faire si quelque chose ne va pas.",
    sections: [
      {
        title: "Notre approche",
        body: [
          "The Host Club n'est pas un site de rencontre amoureuse : nous réunissons de petits groupes autour d'une activité (table, atelier, sport, jeu, sortie).",
          [
            "Les expériences ont lieu dans des lieux publics ou chez des partenaires sélectionnés (restaurants, studios, ateliers), jamais au domicile d'un participant.",
            "Les groupes sont petits et composés par notre équipe, qui reste joignable avant et pendant l'expérience.",
            "Certaines expériences sont « sur demande » : l'équipe valide chaque participant.",
          ],
        ],
      },
      {
        title: "Avant l'expérience",
        body: [
          [
            "Chaque membre a 18 ans ou plus, a confirmé son adresse e-mail et répondu au questionnaire de profil avant de pouvoir réserver.",
            "Nous partageons le strict minimum : au sein d'un groupe, seuls le prénom et les centres d'intérêt sont visibles. Ni numéro de téléphone, ni adresse e-mail, ni nom de famille.",
            "Il n'y a pas de messagerie privée entre participants : on se rencontre d'abord, en vrai, dans un lieu public.",
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
        title: "Notre charte de bonne conduite",
        body: [
          "En réservant, chaque membre s'engage à :",
          [
            "respecter les autres participants, l'équipe et le personnel des lieux ;",
            "ne tenir aucun propos ni comportement discriminant, insultant, harcelant ou à caractère sexuel non désiré ;",
            "respecter le consentement et les limites de chacun, y compris après l'expérience ;",
            "ne pas démarcher commercialement les autres participants ;",
            "ne pas photographier ni filmer les autres sans leur accord ;",
            "venir à l'heure, ou annuler à temps pour libérer la place.",
          ],
        ],
      },
      {
        title: "Signaler un problème",
        body: [
          "Pendant ou après une expérience, vous pouvez nous signaler un comportement par e-mail à {{safetyEmail}} ou via la page Contact. Indiquez la date, l'expérience et ce qui s'est passé : votre signalement reste confidentiel.",
          "Nous répondons au plus vite (objectif : sous 48 heures) et pouvons, selon la gravité : prévenir la personne, l'exclure d'une expérience, suspendre ou fermer son compte. Chaque décision est enregistrée.",
        ],
      },
      {
        title: "En cas d'urgence",
        body: [
          "Si vous êtes en danger, appelez immédiatement les secours :",
          ["Police : 19", "Gendarmerie royale : 177", "Protection civile (pompiers, ambulances) : 15"],
          "Prévenez ensuite notre équipe pour que nous puissions vous accompagner.",
        ],
      },
    ],
  },

  terms: {
    title: "Conditions générales d'utilisation",
    updated: "Version provisoire du 7 novembre 2026 — à valider par un avocat",
    intro:
      "Ces conditions encadrent l'utilisation du site The Host Club. En créant un compte, vous les acceptez. Les conditions de vente (prix, paiement, annulation, abonnement) figurent dans les Conditions générales de vente.",
    sections: [
      { title: "1. Éditeur", body: ["Le site est édité par {{publisher}}, dont le siège est situé {{address}} (ICE {{ice}}, RC {{rc}}). Contact : {{supportEmail}}. Hébergement : {{host}}."] },
      {
        title: "2. Le service",
        body: [
          "The Host Club propose des expériences sociales en petit groupe (repas, ateliers, sport, jeux, sorties) pour rencontrer de nouvelles personnes. Il ne s'agit pas d'un service de rencontre amoureuse.",
          "Les expériences se déroulent chez des partenaires (restaurants, studios, ateliers…) ou dans des lieux publics. The Host Club organise, compose les groupes et sert d'interlocuteur unique.",
        ],
      },
      {
        title: "3. Compte",
        body: [
          [
            "Le service est réservé aux personnes de 18 ans et plus.",
            "Vous vous engagez à fournir des informations exactes et à les tenir à jour ; un seul compte par personne.",
            "Vos identifiants sont personnels : vous êtes responsable de leur confidentialité.",
            "La confirmation de l'adresse e-mail et le questionnaire de profil sont nécessaires pour réserver.",
          ],
        ],
      },
      {
        title: "4. Réservations, demandes et listes d'attente",
        body: [
          "Une expérience se réserve directement ou, si elle est « sur demande », après validation de votre demande par l'équipe. Quand une date est complète, vous pouvez rejoindre la liste d'attente. Le fonctionnement détaillé (prix, délais de paiement, annulation, remboursement) est décrit dans les Conditions générales de vente.",
        ],
      },
      {
        title: "5. Règles de conduite",
        body: [
          "Chaque membre respecte la charte de bonne conduite (page Sécurité). En cas de manquement, l'équipe peut prévenir le membre, annuler une réservation, suspendre ou fermer le compte. Ces mesures sont proportionnées à la gravité des faits et enregistrées.",
        ],
      },
      {
        title: "6. Contenus publiés par les membres",
        body: [
          "Les avis, la photo de profil, la biographie et les messages joints aux demandes restent sous votre responsabilité. Vous autorisez The Host Club à afficher vos avis (signés de votre prénom et de l'initiale de votre nom) sur le site. L'équipe peut masquer un contenu inapproprié, faux ou contraire à la loi.",
        ],
      },
      {
        title: "7. Responsabilités",
        body: [
          "The Host Club s'engage à organiser les expériences avec soin et à informer les participants de tout changement. Chaque partenaire reste responsable des prestations qu'il fournit sur place (repas, cours, sécurité de son établissement). Chaque participant reste responsable de son comportement et de sa consommation. Notre responsabilité ne peut être engagée en cas de force majeure.",
        ],
      },
      { title: "8. Propriété intellectuelle", body: ["La marque The Host Club, le site, ses textes, visuels et logiciels sont protégés. Toute reproduction sans autorisation est interdite."] },
      { title: "9. Données personnelles", body: ["Le traitement de vos données est décrit dans la Politique de confidentialité, conformément à la loi n° 09-08."] },
      { title: "10. Modifications", body: ["Ces conditions peuvent évoluer. La version en vigueur est celle publiée sur le site ; en cas de changement important, vous en serez informé et votre accord pourra vous être redemandé."] },
      { title: "11. Droit applicable", body: ["Ces conditions sont soumises au droit marocain. À défaut d'accord amiable, les tribunaux de Casablanca sont compétents."] },
    ],
  },

  sales: {
    title: "Conditions générales de vente",
    updated: "Version provisoire du 7 novembre 2026 — à valider par un avocat et un expert-comptable",
    intro: "Ces conditions s'appliquent à toute réservation d'expérience et à l'abonnement annuel achetés sur The Host Club.",
    sections: [
      { title: "1. Vendeur", body: ["{{publisher}}, {{address}} — ICE {{ice}}. Contact : {{supportEmail}}."] },
      {
        title: "2. Prix",
        body: [
          "Les prix sont indiqués en dirhams marocains (DH), toutes taxes comprises, par place. Ce qui est inclus (repas, boissons, matériel…) est précisé sur la fiche de chaque expérience. Les membres abonnés bénéficient du prix membre affiché à côté du prix public.",
        ],
      },
      {
        title: "3. Réservation et paiement",
        body: [
          [
            "Réservation directe : la place est bloquée 15 minutes le temps du paiement, puis remise en vente si le paiement n'a pas abouti.",
            "Expérience sur demande : aucun paiement à la demande ; si elle est acceptée, la place est réservée 24 heures pour payer.",
            "Liste d'attente : si une place se libère, elle est proposée à la première personne inscrite et réservée 4 heures pour payer.",
            "Le paiement s'effectue en ligne par carte, auprès d'un prestataire de paiement sécurisé ; The Host Club ne conserve aucune donnée de carte. La réservation est confirmée à réception de la confirmation du paiement.",
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
          "L'annulation se fait depuis l'espace membre (Mes réservations). Le remboursement est effectué sur le moyen de paiement utilisé.",
        ],
      },
      {
        title: "5. Annulation ou modification par The Host Club",
        body: [
          "Si nous annulons une expérience (météo, indisponibilité du partenaire, nombre insuffisant de participants…), vous êtes remboursé intégralement et prévenu. Nous pouvons proposer de déplacer votre réservation vers une autre date de la même expérience ; vous restez libre d'annuler avec remboursement si la nouvelle date ne vous convient pas.",
        ],
      },
      {
        title: "6. Abonnement annuel",
        body: [
          [
            "L'abonnement donne accès, pendant 12 mois, aux avantages décrits sur la page Abonnement (prix membre, et selon la formule : accès anticipé aux nouvelles dates, expériences réservées aux membres).",
            "Il est payé en une fois et n'est pas renouvelé automatiquement : vous pouvez le renouveler à partir de 30 jours avant l'échéance, la nouvelle période commençant à l'échéance.",
            "Conditions de rétractation et de remboursement de l'abonnement : [à définir avec l'avocat].",
          ],
        ],
      },
      { title: "7. Absence", body: ["Une absence non annulée (no-show) n'ouvre pas droit à remboursement. Des absences répétées peuvent limiter l'accès aux expériences sur demande."] },
      { title: "8. Facturation", body: ["Une facture ou un reçu est mis à disposition dans l'espace membre pour chaque paiement, et un avoir pour chaque remboursement."] },
      { title: "9. Réclamations et droit applicable", body: ["Toute réclamation peut être adressée à {{supportEmail}}. Ces conditions sont soumises au droit marocain (notamment la loi n° 31-08 sur la protection du consommateur) ; à défaut d'accord amiable, les tribunaux de Casablanca sont compétents."] },
    ],
  },

  privacy: {
    title: "Politique de confidentialité",
    updated: "Version provisoire du 7 novembre 2026 — à valider par un avocat",
    intro:
      "Cette politique explique quelles données nous collectons, pourquoi, avec qui elles sont partagées et comment exercer vos droits, conformément à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.",
    sections: [
      {
        title: "1. Responsable du traitement",
        body: [
          "{{publisher}}, {{address}} (ICE {{ice}}). Pour toute question relative à vos données : {{privacyEmail}}.",
          "Déclaration des traitements auprès de la CNDP : {{cndpDeclaration}}. Autorisation de transfert des données hors du Maroc : {{cndpTransfer}}.",
        ],
      },
      {
        title: "2. Données collectées",
        body: [
          [
            "Compte : prénom, nom, adresse e-mail, mot de passe (stocké sous forme chiffrée par notre prestataire d'authentification), téléphone (facultatif).",
            "Profil : date de naissance, ville, langues parlées, centres d'intérêt, objectifs ; genre, profession, biographie et photo (facultatifs).",
            "Réservations, demandes de participation (message, compte Instagram facultatif), listes d'attente, avis, abonnement.",
            "Paiements : montant, date, statut et référence du prestataire. Les données de carte bancaire sont saisies et traitées uniquement par le prestataire de paiement : nous ne les recevons jamais.",
            "Données techniques : journaux de connexion et de sécurité, cookies strictement nécessaires (session, langue).",
          ],
        ],
      },
      {
        title: "3. Pourquoi nous les utilisons",
        body: [
          [
            "Fournir le service : compte, réservations, paiements, remboursements, notifications.",
            "Composer des groupes équilibrés (langues, centres d'intérêt, tranches d'âge) et, pour les expériences sur demande, permettre à l'équipe de choisir les participants.",
            "Assurer la sécurité : prévention des abus et de la fraude, traitement des signalements.",
            "Respecter nos obligations légales, notamment comptables.",
            "Vous informer de nos nouveautés, uniquement si vous l'avez accepté (désactivable à tout moment dans vos préférences).",
          ],
        ],
      },
      {
        title: "4. Qui y a accès",
        body: [
          [
            "Notre équipe habilitée, selon son rôle (accès journalisés).",
            "Les autres participants de votre groupe : uniquement votre prénom et vos centres d'intérêt, une fois le groupe révélé.",
            "Le partenaire qui accueille l'expérience : le nombre de places et, si nécessaire, votre prénom.",
            "Nos prestataires techniques, pour notre compte : hébergement (Google Cloud / Firebase), paiement, envoi d'e-mails.",
          ],
          "Nous ne vendons jamais vos données.",
        ],
      },
      {
        title: "5. Où sont-elles hébergées",
        body: ["Vos données sont hébergées par Google Cloud dans l'Union européenne (Belgique et Pays-Bas). Ce transfert hors du Maroc fait l'objet des démarches requises auprès de la CNDP ({{cndpTransfer}})."],
      },
      {
        title: "6. Durées de conservation",
        body: [
          [
            "Compte : tant qu'il est actif, puis 3 ans après la dernière activité, avant suppression ou anonymisation.",
            "Journaux techniques et de sécurité : 12 mois.",
            "Pièces comptables (paiements, factures) : durée imposée par la loi.",
          ],
        ],
      },
      {
        title: "7. Sécurité",
        body: ["Nous appliquons des mesures techniques et organisationnelles adaptées : échanges chiffrés, accès limités selon les rôles et journalisés, double authentification pour l'équipe, aucune donnée de carte conservée, sauvegardes."],
      },
      {
        title: "8. Vos droits",
        body: [
          "Vous disposez d'un droit d'accès, de rectification et d'opposition (loi n° 09-08). Depuis votre espace membre, vous pouvez télécharger vos données et demander la suppression de votre compte. Pour toute autre demande : {{privacyEmail}}. Vous pouvez aussi saisir la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP, www.cndp.ma).",
        ],
      },
      { title: "9. Mineurs", body: ["Le service est réservé aux personnes majeures (18 ans et plus)."] },
      { title: "10. Modifications", body: ["Cette politique peut évoluer ; la date de mise à jour figure en haut de page. En cas de changement important, vous en serez informé."] },
    ],
  },
};

const en: Record<LegalKey, LegalDoc> = {
  safety: {
    title: "Safety",
    updated: "Draft version — 7 November 2026",
    intro: "Meeting new people should always feel good. Here is how we organise every experience so that everyone feels comfortable, and what you can do if something goes wrong.",
    sections: [
      {
        title: "Our approach",
        body: [
          "The Host Club is not a dating service: we bring small groups together around an activity (a table, a workshop, sport, a game, an outing).",
          [
            "Experiences take place in public venues or at selected partners (restaurants, studios, workshops), never at a participant's home.",
            "Groups are small and put together by our team, who can be reached before and during the experience.",
            "Some experiences are “on request”: the team approves each participant.",
          ],
        ],
      },
      {
        title: "Before the experience",
        body: [
          [
            "Every member is 18 or over, has confirmed their email address and completed the profile questionnaire before booking.",
            "We share the bare minimum: within a group, only first names and interests are visible. No phone numbers, email addresses or surnames.",
            "There is no private messaging between participants: you meet first, in person, in a public place.",
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
        title: "Our code of conduct",
        body: [
          "By booking, every member agrees to:",
          [
            "respect other participants, our team and venue staff;",
            "never make discriminatory, insulting, harassing or unwanted sexual remarks or advances;",
            "respect everyone's consent and boundaries, including after the experience;",
            "not solicit other participants for business;",
            "not photograph or film others without their consent;",
            "arrive on time, or cancel early enough to free up the spot.",
          ],
        ],
      },
      {
        title: "Report a problem",
        body: [
          "During or after an experience, you can report behaviour by email at {{safetyEmail}} or through the Contact page. Tell us the date, the experience and what happened: your report stays confidential.",
          "We reply as soon as possible (target: within 48 hours) and, depending on severity, may warn the person, exclude them from an experience, or suspend or close their account. Every decision is logged.",
        ],
      },
      {
        title: "In an emergency",
        body: ["If you are in danger, call the emergency services immediately:", ["Police: 19", "Royal Gendarmerie: 177", "Civil protection (fire, ambulance): 15"], "Then let our team know so we can support you."],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    updated: "Draft version — 7 November 2026 — to be reviewed by a lawyer",
    intro: "These terms govern your use of The Host Club. By creating an account, you accept them. Prices, payment, cancellation and membership are covered by the Terms of sale. The French version prevails.",
    sections: [
      { title: "1. Publisher", body: ["The site is published by {{publisher}}, registered office {{address}} (ICE {{ice}}, RC {{rc}}). Contact: {{supportEmail}}. Hosting: {{host}}."] },
      { title: "2. The service", body: ["The Host Club offers small-group social experiences (meals, workshops, sport, games, outings) to meet new people. It is not a dating service.", "Experiences take place at partner venues (restaurants, studios, workshops…) or in public places. The Host Club organises them, puts the groups together and is your single point of contact."] },
      { title: "3. Account", body: [["The service is for people aged 18 and over.", "You agree to provide accurate information and keep it up to date; one account per person.", "Your login details are personal and you are responsible for keeping them confidential.", "A confirmed email address and the profile questionnaire are required to book."]] },
      { title: "4. Bookings, requests and waitlists", body: ["An experience is booked directly or, if it is “on request”, once the team approves your request. When a date is full, you can join the waitlist. Prices, payment deadlines, cancellation and refunds are described in the Terms of sale."] },
      { title: "5. Code of conduct", body: ["Every member follows the code of conduct (Safety page). In case of a breach, the team may warn the member, cancel a booking, or suspend or close the account. Measures are proportionate and logged."] },
      { title: "6. Member content", body: ["Reviews, profile photo, bio and messages attached to requests remain your responsibility. You allow The Host Club to display your reviews (signed with your first name and last initial). The team may hide content that is inappropriate, false or unlawful."] },
      { title: "7. Liability", body: ["The Host Club organises experiences with care and informs participants of any change. Each partner remains responsible for the services it provides on site. Each participant remains responsible for their own behaviour and consumption. We are not liable in cases of force majeure."] },
      { title: "8. Intellectual property", body: ["The Host Club brand, the site, its texts, visuals and software are protected. Any reproduction without permission is prohibited."] },
      { title: "9. Personal data", body: ["How we process your data is described in the Privacy policy, in accordance with Moroccan Law 09-08."] },
      { title: "10. Changes", body: ["These terms may change. The version published on the site applies; you will be informed of significant changes."] },
      { title: "11. Governing law", body: ["These terms are governed by Moroccan law. Failing an amicable settlement, the courts of Casablanca have jurisdiction."] },
    ],
  },
  sales: {
    title: "Terms of sale",
    updated: "Draft version — 7 November 2026 — to be reviewed by a lawyer and an accountant",
    intro: "These terms apply to every experience booking and to the annual membership purchased on The Host Club. The French version prevails.",
    sections: [
      { title: "1. Seller", body: ["{{publisher}}, {{address}} — ICE {{ice}}. Contact: {{supportEmail}}."] },
      { title: "2. Prices", body: ["Prices are shown in Moroccan dirhams (MAD), all taxes included, per spot. What is included is stated on each experience page. Members pay the member price shown next to the public price."] },
      { title: "3. Booking and payment", body: [["Direct booking: your spot is held for 15 minutes while you pay, then released if payment fails.", "On-request experiences: nothing to pay when you apply; once accepted, your spot is held for 24 hours.", "Waitlist: if a spot opens up, it is offered to the first person on the list and held for 4 hours.", "Payment is made online by card through a secure payment provider; The Host Club never stores card details. Your booking is confirmed once payment is confirmed."]] },
      { title: "4. Cancellation by the member", body: [["Up to 48 hours before the start: full refund.", "Less than 48 hours before the start: no refund (the spot may be offered to the waitlist).", "An experience may have specific conditions, shown on its page before booking."], "Cancel from your member area (My bookings). Refunds go back to the original payment method."] },
      { title: "5. Cancellation or change by The Host Club", body: ["If we cancel an experience, you receive a full refund and are notified. We may offer to move your booking to another date of the same experience; you remain free to cancel with a refund."] },
      { title: "6. Annual membership", body: [["Membership gives access for 12 months to the benefits described on the Membership page.", "It is paid once and is not renewed automatically: you can renew from 30 days before it ends, the new period starting at the end date.", "Withdrawal and refund conditions for the membership: [to be defined with the lawyer]."]] },
      { title: "7. No-shows", body: ["Not attending without cancelling does not entitle you to a refund. Repeated no-shows may limit access to on-request experiences."] },
      { title: "8. Invoices", body: ["An invoice or receipt is available in your member area for each payment, and a credit note for each refund."] },
      { title: "9. Complaints and governing law", body: ["Complaints can be sent to {{supportEmail}}. These terms are governed by Moroccan law (including Law 31-08 on consumer protection); failing an amicable settlement, the courts of Casablanca have jurisdiction."] },
    ],
  },
  privacy: {
    title: "Privacy policy",
    updated: "Draft version — 7 November 2026 — to be reviewed by a lawyer",
    intro: "This policy explains what data we collect, why, who it is shared with and how to exercise your rights, in accordance with Moroccan Law 09-08 on the protection of individuals with regard to the processing of personal data. The French version prevails.",
    sections: [
      { title: "1. Data controller", body: ["{{publisher}}, {{address}} (ICE {{ice}}). For any question about your data: {{privacyEmail}}.", "Declaration to the CNDP: {{cndpDeclaration}}. Authorisation to transfer data outside Morocco: {{cndpTransfer}}."] },
      { title: "2. Data we collect", body: [["Account: first name, last name, email address, password (stored encrypted by our authentication provider), phone (optional).", "Profile: date of birth, city, languages, interests, goals; gender, profession, bio and photo (optional).", "Bookings, participation requests (message, optional Instagram account), waitlists, reviews, membership.", "Payments: amount, date, status and provider reference. Card details are entered and processed only by the payment provider: we never receive them.", "Technical data: connection and security logs, strictly necessary cookies (session, language)."]] },
      { title: "3. Why we use it", body: [["To provide the service: account, bookings, payments, refunds, notifications.", "To put balanced groups together (languages, interests, age ranges) and, for on-request experiences, to let the team choose participants.", "To keep everyone safe: preventing abuse and fraud, handling reports.", "To meet our legal obligations, including accounting.", "To share news, only if you agreed (you can turn it off at any time in your preferences)."]] },
      { title: "4. Who can access it", body: [["Our authorised team, according to their role (access is logged).", "Other participants in your group: only your first name and interests, once the group is revealed.", "The partner hosting the experience: the number of spots and, if needed, your first name.", "Our technical providers, on our behalf: hosting (Google Cloud / Firebase), payment, email delivery."], "We never sell your data."] },
      { title: "5. Where it is stored", body: ["Your data is hosted by Google Cloud in the European Union (Belgium and the Netherlands). This transfer outside Morocco is subject to the required CNDP formalities ({{cndpTransfer}})."] },
      { title: "6. Retention", body: [["Account: while active, then 3 years after the last activity, before deletion or anonymisation.", "Technical and security logs: 12 months.", "Accounting records (payments, invoices): as required by law."]] },
      { title: "7. Security", body: ["We apply appropriate technical and organisational measures: encrypted connections, role-based and logged access, two-factor authentication for the team, no card data stored, backups."] },
      { title: "8. Your rights", body: ["You have the right of access, rectification and objection (Law 09-08). From your member area, you can download your data and request the deletion of your account. For anything else: {{privacyEmail}}. You can also contact the CNDP (www.cndp.ma)."] },
      { title: "9. Minors", body: ["The service is for adults only (18 and over)."] },
      { title: "10. Changes", body: ["This policy may change; the update date is shown at the top of the page. You will be informed of significant changes."] },
    ],
  },
};

export const LEGAL_DOCS: Record<"fr" | "en", Record<LegalKey, LegalDoc>> = { fr, en };
