/**
 * Étape 20 — contrat organisateur et conditions de vente des activités proposées par des organisateurs
 * (Wenzy intermédiaire). Rédigés par nous à partir du fonctionnement réel du site, sans reprendre le texte
 * d'une autre société ; relecture par un avocat suivie dans docs/16. Français : version de référence.
 * Toute modification du contrat = changer ORGANIZER_TERMS_VERSION (packages/shared/src/organizer.ts).
 */
import type { LegalDoc } from "./legal";

export type MarketplaceKey = "organizer" | "marketplace";

const UPDATED_FR = "Dernière mise à jour : 23 novembre 2026 · en vigueur à la même date";
const UPDATED_EN = "Last updated: 23 November 2026 · effective the same day";
const UPDATED_AR = "آخر تحديث: 23 نونبر 2026 · ساري المفعول من التاريخ نفسه";

const fr: Record<MarketplaceKey, LegalDoc> = {
  organizer: {
    title: "Contrat organisateur",
    updated: UPDATED_FR,
    intro: "Ce contrat lie {{publisher}} (« Wenzy ») et toute personne ou structure (« l'organisateur ») qui propose ses activités sur le site depuis l'espace organisateur. Il est accepté lors de la demande de compte ; la version acceptée et sa date sont enregistrées. Il complète les [conditions générales d'utilisation](/cgu) et les [règles de la communauté](/charte).",
    sections: [
      { title: "1. Rôle de chacun", body: ["Wenzy édite le site, présente les activités, gère les réservations et le paiement en ligne et accompagne les participants. L'organisateur conçoit, encadre et réalise ses activités sous sa propre responsabilité. Pour les activités de l'organisateur, Wenzy agit comme intermédiaire : le contrat de prestation est conclu entre le participant et l'organisateur, selon les [conditions de vente des activités des organisateurs](/conditions-organisateurs)."] },
      {
        title: "2. Compte et vérification",
        body: [
          "La demande de compte précise l'identité de la structure, une personne à contacter, l'adresse du lieu principal et les catégories d'activités. Elle est accompagnée de justificatifs : registre de commerce ou statut d'auto-entrepreneur, attestation d'assurance responsabilité civile en cours de validité, et pour les activités encadrées un diplôme ou une carte professionnelle.",
          "Wenzy peut valider la demande, demander un complément ou la refuser, sans avoir à se justifier. Les justificatifs sont visibles uniquement par l'équipe. L'organisateur signale tout changement (assurance expirée, changement d'adresse ou de statut) dans les 8 jours.",
        ],
      },
      {
        title: "3. Activités",
        body: [
          [
            "L'organisateur décrit chaque activité de façon exacte et complète : contenu, lieu, durée, prix, ce qui est inclus, niveau, matériel, tenue, âge minimum, conditions de sécurité.",
            "Chaque nouvelle activité est relue par l'équipe avant sa publication. Wenzy peut refuser ou retirer une activité contraire à la loi, aux règles de la communauté, dangereuse ou trompeuse, en expliquant pourquoi.",
            "Une activité déjà en ligne peut être modifiée par l'organisateur ; l'équipe relit la modification. Une place déjà vendue garde son prix et ses conditions.",
            "Les dates sont créées par l'organisateur, qui s'engage à les honorer. Le nombre de places affiché correspond à la capacité réelle du lieu.",
          ],
        ],
      },
      { title: "4. Prix et paiement", body: ["L'organisateur fixe le prix de son activité. Le participant le lui règle sur place, directement, selon les moyens que l'organisateur accepte ; Wenzy n'encaisse jamais ce prix. En ligne, le participant ne paie à Wenzy que ses frais de réservation (le prix Wenzy en vigueur, 35 DH à ce jour), ou les règle avec son Pass ou son Carnet.", "La fiche indique toujours, avant la réservation, le prix à régler sur place à l'organisateur."] },
      { title: "5. Rémunération de Wenzy", body: ["Wenzy se rémunère uniquement par les frais de réservation payés par le participant. L'organisateur ne verse aucune commission à Wenzy et ne lui doit rien au titre des réservations."] },
      { title: "6. Pointage et liste des participants", body: ["L'organisateur consulte la liste de ses participants dans l'espace organisateur et les pointe à l'arrivée (liste ou QR code). Le pointage fait foi pour les absences. Wenzy ne détient aucune somme pour le compte de l'organisateur : il n'y a donc aucun reversement."] },
      { title: "7. Annulations et remboursements", body: ["Le participant peut annuler depuis sa réservation : les frais Wenzy sont remboursés selon les conditions d'annulation de l'activité. Ce qu'il n'a pas encore réglé sur place n'est pas dû.", "Si l'organisateur annule une date, il le fait depuis son espace : les participants sont prévenus et intégralement remboursés des frais Wenzy. Pour ce qui aurait déjà été réglé à l'organisateur, celui-ci rembourse directement le participant.", "Activité non réalisée ou très différente de sa description : Wenzy peut rembourser ses frais au participant après avoir entendu l'organisateur, et suspendre le compte en cas de manquements répétés."] },
      {
        title: "8. Engagements de l'organisateur",
        body: [
          [
            "Respecter la loi et les autorisations nécessaires à son activité, et garder une assurance responsabilité civile valide couvrant les participants.",
            "Assurer la sécurité : encadrement qualifié, matériel en bon état, consignes claires, respect des conditions de participation aux [activités physiques](/conditions-activites-physiques) quand elles s'appliquent.",
            "Accueillir chaque participant sans discrimination, conformément aux [règles de la communauté](/charte), et vérifier les billets à l'entrée.",
            "Ne jamais proposer aux participants de payer en dehors du site ce qui doit être payé en ligne, ni les détourner vers un autre service.",
          ],
        ],
      },
      {
        title: "9. Données des participants",
        body: [
          "L'organisateur reçoit, pour ses activités seulement, le prénom et l'initiale du nom de chaque participant, le nombre de places et, si la personne l'a accepté, son régime et ses allergies. Il les utilise uniquement pour accueillir les participants, les garde confidentielles, ne les transmet à personne et ne les utilise pas pour de la prospection. Il les efface au plus tard 30 jours après l'activité, sauf obligation légale. Il prévient Wenzy sans délai de toute perte ou fuite de ces données.",
        ],
      },
      { title: "10. Avis", body: ["Les participants peuvent laisser un avis après l'activité. L'organisateur peut y répondre publiquement, avec courtoisie. Il ne publie pas de faux avis et n'en demande pas en échange d'un avantage. Un avis contraire aux règles peut être signalé à l'équipe, qui décide de sa publication."] },
      {
        title: "11. Suspension et fin du contrat",
        body: [
          "L'organisateur peut fermer son compte à tout moment, en honorant les dates déjà vendues ou en les annulant avec remboursement intégral. Wenzy peut suspendre un compte, avec un message expliquant pourquoi, en cas de manquement grave (sécurité, fausse information, paiement hors site, plaintes répétées) ; les dates à venir peuvent alors être annulées et remboursées. Les sommes dues restent reversées selon l'article 6.",
        ],
      },
      { title: "12. Responsabilité", body: ["L'organisateur est seul responsable de la réalisation de ses activités et des dommages qu'elles peuvent causer. Wenzy est responsable du bon fonctionnement du site et du traitement des paiements en ligne ; sa responsabilité envers l'organisateur est limitée aux frais Wenzy perçus au titre de ses activités au cours des 12 derniers mois, sauf faute grave."] },
      { title: "13. Droit applicable", body: ["Ce contrat est soumis au droit marocain. En cas de désaccord, les parties cherchent d'abord une solution amiable ({{supportEmail}}) ; à défaut, les tribunaux de Casablanca sont compétents."] },
    ],
  },
  marketplace: {
    title: "Conditions de vente des activités des organisateurs",
    updated: UPDATED_FR,
    intro: "Certaines activités du site sont proposées par des organisateurs indépendants (clubs, ateliers, guides…) : leur nom figure sur la fiche (« Proposé par … »). Ces conditions s'appliquent à leur réservation. Les expériences organisées par Wenzy relèvent des [conditions générales de vente](/cgv).",
    sections: [
      { title: "1. Qui vend quoi", body: ["Pour ces activités, le contrat est conclu entre vous et l'organisateur, qui réalise l'activité sous sa responsabilité. {{publisher}} (« Wenzy ») agit comme intermédiaire : il présente l'activité, enregistre votre réservation, encaisse le paiement en ligne au nom de l'organisateur et vous accompagne en cas de difficulté. Contact : {{supportEmail}}."] },
      { title: "2. Prix et paiement", body: ["Le prix de l'activité est fixé par l'organisateur et se règle sur place, directement à lui ; il est affiché sur la fiche avant la réservation. En ligne, vous ne payez à Wenzy que ses frais de réservation (35 DH à ce jour), ou vous utilisez votre Pass ou votre Carnet. Wenzy n'encaisse jamais le prix de l'activité."] },
      { title: "3. Réservation et billet", body: ["La réservation est confirmée à réception du paiement en ligne (ou immédiatement si rien n'est payable en ligne). Vous recevez un billet avec un QR code, présenté à l'entrée. Les activités « sur demande » ne sont confirmées qu'après acceptation par l'organisateur, puis paiement dans le délai indiqué."] },
      {
        title: "4. Annulation et remboursement",
        body: [
          [
            "Par vous : la politique d'annulation affichée sur la fiche s'applique ; le remboursement porte sur la part payée en ligne, par le moyen de paiement utilisé.",
            "Par l'organisateur (météo, lieu indisponible, nombre minimum non atteint…) : vous êtes prévenu et remboursé intégralement de ce que vous avez payé en ligne.",
            "Activité non réalisée ou très différente de sa description : dans les 7 jours qui suivent l'activité, faites une demande depuis votre réservation (« Mes réservations ») ou écrivez-nous ({{supportEmail}}). Après avoir entendu l'organisateur, Wenzy peut vous rembourser tout ou partie du prix payé en ligne.",
          ],
        ],
      },
      { title: "5. Droit de rétractation", body: ["Une activité de loisirs prévue à une date précise n'ouvre pas de droit de rétractation (loi 31-08 relative à la protection du consommateur). Les conditions d'annulation de l'article 4 s'appliquent."] },
      { title: "6. Sécurité et responsabilité", body: ["L'organisateur est responsable du déroulement de l'activité, de la sécurité et de son assurance. Suivez ses consignes et, pour une activité physique, les [conditions de participation](/conditions-activites-physiques). Wenzy vérifie l'identité, les justificatifs et l'assurance de chaque organisateur avant d'ouvrir son compte, et peut le suspendre en cas de manquement."] },
      { title: "7. Vos données", body: ["L'organisateur reçoit votre prénom, l'initiale de votre nom, le nombre de places et, si vous l'acceptez, votre régime et vos allergies, pour vous accueillir. Il ne peut pas les utiliser à d'autres fins. Détails dans la [politique de confidentialité](/confidentialite)."] },
      { title: "8. Réclamations et droit applicable", body: ["Écrivez-nous ({{supportEmail}}) : nous transmettons à l'organisateur et cherchons une solution sous 15 jours. Ces conditions sont soumises au droit marocain ; à défaut d'accord amiable, les tribunaux de Casablanca sont compétents, sans préjudice des règles protectrices du consommateur."] },
    ],
  },
};

const en: Record<MarketplaceKey, LegalDoc> = {
  organizer: {
    title: "Organizer agreement",
    updated: UPDATED_EN,
    intro: "This agreement binds {{publisher}} (“Wenzy”) and any person or business (“the organizer”) that offers activities on the site from the organizer space. It is accepted when applying for an account; the accepted version and its date are recorded. It supplements the [terms of use](/cgu) and the [community rules](/charte).",
    sections: [
      { title: "1. Who does what", body: ["Wenzy runs the site, presents activities, manages bookings and online payment and supports participants. The organizer designs, supervises and delivers its activities under its own responsibility. For the organizer's activities, Wenzy acts as an intermediary: the service contract is between the participant and the organizer, under the [sales terms for organizers' activities](/conditions-organisateurs)."] },
      { title: "2. Account and checks", body: ["The application states the business identity, a contact person, the main venue address and activity categories, with supporting documents: trade register or self-employed status, a valid civil liability insurance certificate and, for supervised activities, a diploma or professional card.", "Wenzy may approve, request more information or decline, without having to give reasons. Documents are only visible to the team. The organizer reports any change (expired insurance, new address or status) within 8 days."] },
      { title: "3. Activities", body: [["The organizer describes each activity accurately and completely: content, venue, duration, price, what is included, level, equipment, dress code, minimum age, safety conditions.", "Each new activity is reviewed by the team before publication. Wenzy may decline or remove an activity that is unlawful, against the community rules, dangerous or misleading, and explains why.", "An activity already online may be edited by the organizer; the team reviews the change. A seat already sold keeps its price and terms.", "The organizer creates the dates and commits to honouring them. The number of seats shown matches the venue's real capacity."]] },
      { title: "4. Prices and payment", body: ["The organizer sets the price of its activity. The participant pays it on site, directly to the organizer, by the means the organizer accepts; Wenzy never collects this price. Online, the participant only pays Wenzy its booking fee (the current Wenzy price, 35 DH at present), or covers it with a Pass or a Pack.", "The activity page always shows, before booking, the price to pay the organizer on site."] },
      { title: "5. Wenzy's remuneration", body: ["Wenzy is paid only through the booking fee paid by the participant. The organizer pays no commission to Wenzy and owes it nothing for bookings."] },
      { title: "6. Check-in and participant list", body: ["The organizer sees its participant list in the organizer space and checks them in on arrival (list or QR code). Its check-in counts for no-shows. Wenzy holds no money on the organizer's behalf, so there are no payouts."] },
      { title: "7. Cancellations and refunds", body: ["The participant can cancel from their booking: the Wenzy fee is refunded under the activity's cancellation terms. Anything not yet paid on site is not owed.", "If the organizer cancels a date, it does so from its space: participants are notified and fully refunded the Wenzy fee. For anything already paid to the organizer, the organizer refunds the participant directly.", "Activity not delivered or very different from its description: Wenzy may refund its fee to the participant after hearing the organizer, and suspend the account for repeated failings."] },
      { title: "8. Organizer commitments", body: [["Comply with the law and the authorisations required for its activity, and keep valid civil liability insurance covering participants.", "Ensure safety: qualified supervision, equipment in good condition, clear instructions, and the [physical activity terms](/conditions-activites-physiques) where they apply.", "Welcome every participant without discrimination, in line with the [community rules](/charte), and check tickets at the entrance.", "Never ask participants to pay outside the site what must be paid online, nor divert them to another service."]] },
      { title: "9. Participants' data", body: ["For its own activities only, the organizer receives each participant's first name and last-name initial, the number of seats and, if the person agreed, their diet and allergies. It uses them only to welcome participants, keeps them confidential, shares them with no one and does not use them for marketing. It deletes them no later than 30 days after the activity, unless the law requires otherwise, and informs Wenzy without delay of any loss or leak."] },
      { title: "10. Reviews", body: ["Participants may leave a review after the activity. The organizer may reply publicly and courteously. It does not post fake reviews or ask for reviews in exchange for a benefit. A review that breaks the rules can be reported to the team, which decides whether it stays."] },
      { title: "11. Suspension and termination", body: ["The organizer may close its account at any time, honouring dates already sold or cancelling them with a full refund. Wenzy may suspend an account, with a message explaining why, in case of serious breach (safety, false information, off-site payment, repeated complaints); upcoming dates may then be cancelled and refunded. Amounts owed are still paid out under section 6."] },
      { title: "12. Liability", body: ["The organizer alone is responsible for delivering its activities and for any damage they may cause. Wenzy is responsible for the proper operation of the site and the processing of online payments; its liability towards the organizer is limited to the Wenzy fees received for its activities over the previous 12 months, except in case of gross negligence."] },
      { title: "13. Governing law", body: ["This agreement is governed by Moroccan law. In case of disagreement, the parties first seek an amicable solution ({{supportEmail}}); failing that, the courts of Casablanca have jurisdiction."] },
    ],
  },
  marketplace: {
    title: "Sales terms for organizers' activities",
    updated: UPDATED_EN,
    intro: "Some activities on the site are offered by independent organizers (clubs, workshops, guides…): their name appears on the listing (“Offered by …”). These terms apply to booking them. Experiences run by Wenzy fall under the [terms of sale](/cgv).",
    sections: [
      { title: "1. Who sells what", body: ["For these activities, the contract is between you and the organizer, who delivers the activity under its responsibility. {{publisher}} (“Wenzy”) acts as an intermediary: it presents the activity, records your booking, collects the online payment on the organizer's behalf and supports you if something goes wrong. Contact: {{supportEmail}}."] },
      { title: "2. Price and payment", body: ["The activity price is set by the organizer and paid on site, directly to them; it is shown on the page before you book. Online, you only pay Wenzy its booking fee (35 DH at present), or use your Pass or Pack. Wenzy never collects the activity price."] },
      { title: "3. Booking and ticket", body: ["Your booking is confirmed when the online payment is received (or immediately if nothing is payable online). You receive a ticket with a QR code to show at the entrance. “On request” activities are only confirmed once the organizer accepts and you pay within the stated time."] },
      { title: "4. Cancellation and refund", body: [["By you: the cancellation policy shown on the listing applies; refunds cover the amount paid online, to the payment method used.", "By the organizer (weather, venue unavailable, minimum not reached…): you are notified and fully refunded for what you paid online.", "Activity not delivered or very different from its description: within 7 days after the activity, send a request from your booking (“My bookings”) or write to us ({{supportEmail}}). After hearing the organizer, Wenzy may refund all or part of the amount paid online."]] },
      { title: "5. Right of withdrawal", body: ["A leisure activity scheduled for a specific date carries no right of withdrawal (Moroccan consumer protection law 31-08). The cancellation terms in section 4 apply."] },
      { title: "6. Safety and liability", body: ["The organizer is responsible for running the activity, for safety and for its insurance. Follow its instructions and, for a physical activity, the [participation terms](/conditions-activites-physiques). Wenzy checks each organizer's identity, documents and insurance before opening its account, and may suspend it in case of breach."] },
      { title: "7. Your data", body: ["The organizer receives your first name, your last-name initial, the number of seats and, if you agree, your diet and allergies, in order to welcome you. It may not use them for any other purpose. Details in the [privacy policy](/confidentialite)."] },
      { title: "8. Complaints and governing law", body: ["Write to us ({{supportEmail}}): we pass it on to the organizer and look for a solution within 15 days. These terms are governed by Moroccan law; failing an amicable agreement, the courts of Casablanca have jurisdiction, without prejudice to consumer protection rules."] },
    ],
  },
};

const ar: Record<MarketplaceKey, LegalDoc> = {
  organizer: {
    title: "عقد المنظّم",
    updated: UPDATED_AR,
    intro: "يربط هذا العقد بين {{publisher}} (« Wenzy ») وكل شخص أو جهة (« المنظّم ») يقترح أنشطته على الموقع من فضاء المنظّمين. يُقبل عند طلب الحساب، وتُسجَّل النسخة المقبولة وتاريخها. وهو يكمّل [شروط الاستخدام](/cgu) و[قواعد المجتمع](/charte).",
    sections: [
      { title: "1. دور كل طرف", body: ["يدير Wenzy الموقع، ويعرض الأنشطة، ويُدبّر الحجوزات والدفع عبر الإنترنت ويرافق المشاركين. ويصمّم المنظّم أنشطته ويؤطّرها وينجزها تحت مسؤوليته. بالنسبة لأنشطة المنظّم، يعمل Wenzy وسيطاً: يُبرم عقد الخدمة بين المشارك والمنظّم وفق [شروط بيع أنشطة المنظّمين](/conditions-organisateurs)."] },
      { title: "2. الحساب والتحقق", body: ["يحدد طلب الحساب هوية الجهة وشخصاً للتواصل وعنوان المكان الرئيسي وفئات الأنشطة، مع وثائق داعمة: السجل التجاري أو صفة المقاول الذاتي، وشهادة تأمين المسؤولية المدنية سارية المفعول، وبالنسبة للأنشطة المؤطَّرة شهادة أو بطاقة مهنية.", "يمكن لـ Wenzy قبول الطلب أو طلب استكمال أو رفضه دون تبرير. لا يطّلع على الوثائق إلا الفريق. ويبلّغ المنظّم عن أي تغيير (انتهاء التأمين، تغيير العنوان أو الصفة) خلال 8 أيام."] },
      { title: "3. الأنشطة", body: [["يصف المنظّم كل نشاط بدقة وبشكل كامل: المحتوى، المكان، المدة، السعر، ما هو مشمول، المستوى، المعدات، اللباس، السن الأدنى، شروط السلامة.", "يراجع الفريق كل نشاط جديد قبل نشره. ويمكن لـ Wenzy رفض أو سحب نشاط مخالف للقانون أو لقواعد المجتمع أو خطير أو مضلّل، مع ذكر السبب.", "يمكن للمنظّم تعديل نشاط منشور، ويراجع الفريق التعديل. يحتفظ المقعد المبيع بسعره وشروطه.", "ينشئ المنظّم المواعيد ويلتزم باحترامها. ويطابق عدد المقاعد المعروض الطاقة الحقيقية للمكان."]] },
      { title: "4. السعر والدفع", body: ["يحدد المنظّم ثمن نشاطه. ويدفعه المشارك في المكان مباشرة للمنظّم بالوسائل التي يقبلها؛ ولا تحصّل Wenzy هذا الثمن أبدًا. عبر الإنترنت، لا يدفع المشارك لـ Wenzy سوى رسوم الحجز (ثمن Wenzy الساري، 35 درهم حاليًا)، أو يغطيها بالباس أو الدفتر.", "تعرض صفحة النشاط دائمًا، قبل الحجز، الثمن الذي يُدفع للمنظّم في المكان."] },
      { title: "5. أجرة Wenzy", body: ["تتقاضى Wenzy أجرتها فقط من رسوم الحجز التي يدفعها المشارك. ولا يدفع المنظّم أي عمولة لـ Wenzy ولا يدين لها بشيء عن الحجوزات."] },
      { title: "6. تسجيل الحضور ولائحة المشاركين", body: ["يطّلع المنظّم على لائحة مشاركيه في فضاء المنظّم ويسجّل حضورهم عند الوصول (لائحة أو رمز QR). ويُعتمد تسجيله في حالات الغياب. لا تحتفظ Wenzy بأي مبلغ لحساب المنظّم، وبالتالي لا توجد أي تحويلات."] },
      { title: "7. الإلغاء والاسترداد", body: ["يمكن للمشارك الإلغاء من صفحة حجزه: تُسترجع رسوم Wenzy وفق شروط إلغاء النشاط. وما لم يُدفع بعد في المكان غير مستحق.", "إذا ألغى المنظّم موعدًا، يقوم بذلك من فضائه: يُبلَّغ المشاركون ويسترجعون رسوم Wenzy كاملة. وما سبق دفعه للمنظّم، يرده المنظّم مباشرة للمشارك.", "نشاط لم يُنجز أو مختلف كثيرًا عن وصفه: يمكن لـ Wenzy رد رسومها للمشارك بعد الاستماع إلى المنظّم، وتعليق الحساب عند تكرار الإخلال."] },
      { title: "8. التزامات المنظّم", body: [["احترام القانون والتراخيص اللازمة لنشاطه، والحفاظ على تأمين ساري المفعول للمسؤولية المدنية يغطي المشاركين.", "ضمان السلامة: تأطير مؤهَّل، معدات في حالة جيدة، تعليمات واضحة، واحترام [شروط المشاركة في الأنشطة البدنية](/conditions-activites-physiques) عند الاقتضاء.", "استقبال كل مشارك دون تمييز وفق [قواعد المجتمع](/charte)، والتحقق من التذاكر عند الدخول.", "عدم مطالبة المشاركين أبداً بأداء ما يجب أداؤه عبر الموقع خارجه، وعدم تحويلهم إلى خدمة أخرى."]] },
      { title: "9. معطيات المشاركين", body: ["يتلقى المنظّم، لأنشطته فقط، الاسم الشخصي والحرف الأول من الاسم العائلي لكل مشارك وعدد المقاعد، وإن وافق الشخص، نظامه الغذائي وحساسيته. ولا يستعملها إلا لاستقبال المشاركين، ويحافظ على سريتها، ولا ينقلها لأحد ولا يستعملها لأغراض تسويقية. ويحذفها في أجل أقصاه 30 يوماً بعد النشاط ما لم يفرض القانون غير ذلك، ويُخبر Wenzy فوراً بأي ضياع أو تسرّب."] },
      { title: "10. الآراء", body: ["يمكن للمشاركين ترك رأي بعد النشاط، ويمكن للمنظّم الرد علناً وبلباقة. ولا ينشر آراء مزيفة ولا يطلبها مقابل امتياز. ويمكن الإبلاغ عن رأي مخالف للقواعد، ويقرر الفريق في شأنه."] },
      { title: "11. التعليق وإنهاء العقد", body: ["يمكن للمنظّم إغلاق حسابه في أي وقت مع احترام المواعيد المبيعة أو إلغائها مع استرداد كامل. ويمكن لـ Wenzy تعليق حساب، مع رسالة تشرح السبب، في حال إخلال جسيم (السلامة، معلومات خاطئة، أداء خارج الموقع، شكاوى متكررة)، ويمكن حينها إلغاء المواعيد القادمة واسترداد ثمنها. وتبقى المبالغ المستحقة تُحوَّل وفق البند 6."] },
      { title: "12. المسؤولية", body: ["المنظّم وحده مسؤول عن إنجاز أنشطته وعن الأضرار التي قد تسببها. و Wenzy مسؤول عن حسن سير الموقع ومعالجة المدفوعات عبر الإنترنت، وتنحصر مسؤوليته تجاه المنظّم في العمولات المحصّلة خلال الاثني عشر شهراً الأخيرة، إلا في حالة خطأ جسيم."] },
      { title: "13. القانون المطبق", body: ["يخضع هذا العقد للقانون المغربي. وفي حال خلاف، يسعى الطرفان أولاً إلى حل ودي ({{supportEmail}})، وإلا فمحاكم الدار البيضاء هي المختصة."] },
    ],
  },
  marketplace: {
    title: "شروط بيع أنشطة المنظّمين",
    updated: UPDATED_AR,
    intro: "يقترح بعضَ أنشطة الموقع منظّمون مستقلون (أندية، ورشات، مرشدون…)، ويظهر اسمهم على البطاقة (« يقترحه … »). تُطبَّق هذه الشروط على حجزها. أما التجارب التي ينظّمها Wenzy فتخضع لـ[الشروط العامة للبيع](/cgv).",
    sections: [
      { title: "1. من يبيع ماذا", body: ["بالنسبة لهذه الأنشطة، يُبرم العقد بينك وبين المنظّم الذي ينجز النشاط تحت مسؤوليته. ويعمل {{publisher}} (« Wenzy ») وسيطاً: يعرض النشاط، ويسجّل حجزك، ويحصّل الدفع عبر الإنترنت باسم المنظّم، ويرافقك في حال وجود مشكل. للتواصل: {{supportEmail}}."] },
      { title: "2. السعر والدفع", body: ["يحدد المنظّم ثمن النشاط ويُدفع في المكان مباشرة له؛ ويُعرض في الصفحة قبل الحجز. عبر الإنترنت، لا تدفع لـ Wenzy سوى رسوم الحجز (35 درهم حاليًا)، أو تستعمل الباس أو الدفتر. ولا تحصّل Wenzy أبدًا ثمن النشاط."] },
      { title: "3. الحجز والتذكرة", body: ["يتأكد الحجز عند توصّلنا بالدفع عبر الإنترنت (أو فوراً إن لم يكن هناك ما يُدفع عبر الإنترنت). وتتوصل بتذكرة برمز QR تقدّمها عند الدخول. ولا تتأكد الأنشطة « حسب الطلب » إلا بعد قبول المنظّم ثم الدفع في الأجل المحدد."] },
      { title: "4. الإلغاء والاسترداد", body: [["من طرفك: تُطبَّق سياسة الإلغاء المعروضة على البطاقة، ويشمل الاسترداد المبلغ المدفوع عبر الإنترنت بوسيلة الدفع نفسها.", "من طرف المنظّم (الطقس، تعذّر المكان، عدم بلوغ الحد الأدنى…): تُبلَّغ ويُسترد لك كامل ما دفعته عبر الإنترنت.", "نشاط لم يُنجز أو مختلف كثيراً عن وصفه: خلال 7 أيام بعد النشاط، قدّم طلباً من صفحة حجزك («حجوزاتي») أو راسلنا ({{supportEmail}}). وبعد الاستماع إلى المنظّم، يمكن لـ Wenzy أن يرد لك المبلغ المدفوع عبر الإنترنت كله أو بعضه."]] },
      { title: "5. حق التراجع", body: ["لا يخوّل نشاط ترفيهي مبرمج في تاريخ محدد حق التراجع (القانون 31-08 المتعلق بحماية المستهلك). وتُطبَّق شروط الإلغاء الواردة في البند 4."] },
      { title: "6. السلامة والمسؤولية", body: ["المنظّم مسؤول عن سير النشاط وعن السلامة وعن تأمينه. اتبع تعليماته، وبالنسبة لنشاط بدني [شروط المشاركة](/conditions-activites-physiques). ويتحقق Wenzy من هوية كل منظّم ووثائقه وتأمينه قبل فتح حسابه، ويمكنه تعليقه في حال الإخلال."] },
      { title: "7. معطياتك", body: ["يتلقى المنظّم اسمك الشخصي والحرف الأول من اسمك العائلي وعدد المقاعد، وإن وافقت، نظامك الغذائي وحساسيتك، لاستقبالك. ولا يجوز له استعمالها لأي غرض آخر. التفاصيل في [سياسة الخصوصية](/confidentialite)."] },
      { title: "8. الشكايات والقانون المطبق", body: ["راسلنا ({{supportEmail}}): ننقل الشكاية إلى المنظّم ونبحث عن حل خلال 15 يوماً. تخضع هذه الشروط للقانون المغربي، وفي غياب اتفاق ودي تختص محاكم الدار البيضاء، مع مراعاة القواعد الحمائية للمستهلك."] },
    ],
  },
};

export const MARKETPLACE_LEGAL: Record<"fr" | "en" | "ar", Record<MarketplaceKey, LegalDoc>> = { fr, en, ar };
