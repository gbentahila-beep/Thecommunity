import Link from "next/link";
import type { ReactNode } from "react";
import { Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Guide" };

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-1.5 ps-5 text-sm">{children}</ol>;
}
function Q({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-16 border-b border-line py-3 last:border-0">
      <summary className="cursor-pointer font-semibold text-ink group-open:text-brand-900">{title}</summary>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </details>
  );
}
const A = ({ href, children }: { href: string; children: ReactNode }) => <Link href={href} className="font-medium text-brand-900 underline">{children}</Link>;

/**
 * 24/11 : guide de l'équipe. Le principe, la semaine type (qui fait quoi et quand), et « comment faire » pas à pas
 * pour les questions qui reviennent : places, activité du samedi, événements, Tables Girls only, participants,
 * organisateurs, alertes, site de démo (mis à jour le 25/11).
 */
export default function AdminGuidePage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Guide du back-office" subtitle="Le principe, la semaine type, et comment faire, pas à pas." />

      <Card title="Le principe en 1 minute" className="mb-5">
        <div className="space-y-3 text-sm">
          <p>Wenzy, ce sont <strong>des rendez-vous qui reviennent chaque semaine</strong>, rangés en 3 univers :</p>
          <ul className="list-disc space-y-1.5 ps-5">
            <li><strong>Tables</strong> : le Dîner du mercredi (20h30), le Café du samedi (16h), le Brunch du dimanche (12h30). Chaque rendez-vous a ses gammes : Casual et Premium chaque semaine, <strong>Exclusive en plus</strong> le premier mercredi du mois (ce jour-là, il y a donc 3 dîners en parallèle : Casual, Premium et Exclusive). Le restaurant est secret, choisi et réservé par le site. Et de temps en temps, une <strong>Table Girls only</strong> que vous créez à la main.</li>
            <li><strong>Activités</strong> : <em>l&apos;activité du samedi</em>, une seule par samedi, qui tourne (céramique, padel, yoga, escape game…). Une activité de cet univers n&apos;a pas de date à elle : elle passe le samedi, via le planning.</li>
            <li><strong>Événements</strong> : tout le reste, avec sa propre date : une soirée, un afterwork, un padel ponctuel un autre jour.</li>
          </ul>
          <p>Une seule date est ouverte à la réservation à la fois pour chaque rendez-vous : la suivante s&apos;ouvre quand la précédente ferme (la veille à 20h30). Les abonnés Pass voient une date d&apos;avance.</p>
          <p>Au quotidien : l&apos;<A href="/admin">Accueil</A> (ce qui attend une action et les 7 prochains jours), le <A href="/admin/programme">Calendrier</A> (la semaine, jour par jour) et les <A href="/admin/rendez-vous">Rendez-vous</A> (dîner, café, brunch, planning des samedis). Tout ce qui concerne une date (lieux, tables, participants, demandes, signalements) est sur la page de cette date : en haut, « Où en est cette date » montre l&apos;étape en cours.</p>
        </div>
      </Card>

      <Card title="La semaine type : qui fait quoi, et quand" className="mb-5">
        <p className="mb-3 text-sm text-muted">Pour chaque Table (dîner, café, brunch). Tout est automatique ; vous n&apos;intervenez que sur alerte.</p>
        <ol className="space-y-2 text-sm" data-testid="guide-timeline">
          <li><strong>Veille 15h</strong> : le site demande une <em>option</em> aux restaurants de la gamme (inscrits du moment + une table de marge), entre les deux services. Relance 1 h après ; sans réponse 2 h après, il passe à un autre restaurant.</li>
          <li><strong>Veille 18h30</strong> : s&apos;il manque des confirmations, vous recevez une alerte <em>« Lieux à appeler »</em> : appelez (bouton WhatsApp sur la page de la date) ou choisissez un autre lieu.</li>
          <li><strong>Veille 20h30</strong> : fermeture des réservations. Gamme voisine pour ceux qui l&apos;ont acceptée, contrôle du minimum (alerte <em>« À risque »</em> si besoin), <strong>nombre final</strong> envoyé aux restaurants (table en trop libérée, table manquante demandée).</li>
          <li><strong>Dès que tous les lieux ont confirmé</strong> : les <strong>tables sont composées</strong> tout de suite. Vous pouvez les voir et les retoucher sur la page de la date (« Voir et retoucher les tables ») jusqu&apos;au dévoilement. Sans retouche, elles sont recomposées avec les inscrits définitifs à la fermeture.</li>
          <li><strong>Veille 21h30</strong> : <strong>lieu et tables dévoilés</strong> aux participants (notification et e-mail, avec un aperçu de leur table). Bloqué tant qu&apos;un lieu n&apos;a pas confirmé : vous êtes alerté.</li>
          <li><strong>Jour J à 11h</strong> (la veille à 21h30 pour le brunch) : <strong>récapitulatif</strong> à chaque restaurant (prénoms, allergies). 1 h avant : mise à jour seulement si quelque chose a changé.</li>
          <li><strong>Pendant</strong> : check-in des participants, numéro de table ; <strong>après</strong> : avis, absences.</li>
        </ol>
        <p className="mt-3 text-sm">Activité du samedi (lieu connu) : demande au lieu la veille à 15h, nombre final à 20h30, récapitulatif la veille au soir (activité du matin) ou le jour même à 11h. Chaque samedi s&apos;ouvre aux réservations quand le précédent ferme ; <strong>48 h avant</strong>, vous recevez l&apos;activité prévue, à confirmer ou à changer.</p>
      </Card>

      <Card title="Comment faire…" className="mb-5">
        <Q id="places" title="Choisir le nombre de places">
          <ul className="list-disc space-y-1.5 ps-5">
            <li><strong>Dîner, café, brunch</strong> : menu <A href="/admin/rendez-vous">Rendez-vous</A> → la carte du rendez-vous → « Réglages » → <em>Places par date et par gamme</em>. Le site ne vend jamais plus que ce que les restaurants compatibles peuvent accueillir.</li>
            <li><strong>Activité du samedi</strong> : dans le planning, « Modifier la rotation » → <em>Places</em> de chaque activité ; pour un seul samedi, « Changer » sur sa ligne → <em>Places</em>.</li>
            <li><strong>Événement</strong> : étape 6 du formulaire, <em>Capacité par date</em> (ou « + Ajouter des dates » sur sa fiche).</li>
            <li>Une date déjà créée : sa page → « Modifier l&apos;événement », ou l&apos;heure et les places suivent le planning tant que personne n&apos;est inscrit.</li>
          </ul>
        </Q>
        <Q id="nouvelle-activite" title="Ajouter une nouvelle activité au samedi (ex. un cours de Pilates)">
          <Steps>
            <li><A href="/admin/experiences/nouvelle">Créer</A> → « <strong>Une activité pour le samedi</strong> » → un modèle (yoga, padel…) ou une page blanche.</li>
            <li>Remplissez la fiche (titre, lieu, prix sur place, photos), statut <strong>Publiée</strong>. À l&apos;étape 6, rien à saisir : la date vient du planning. Enregistrez.</li>
            <li>Sur la fiche, carte <strong>Activité du samedi</strong> : « <em>Ajouter à la rotation</em> » (elle revient à son tour, réglez l&apos;ordre dans le planning) ou « <em>Programmer un samedi</em> » (une fois, à la place de l&apos;activité prévue).</li>
          </Steps>
        </Q>
        <Q id="changer-samedi" title="Un partenaire propose une activité pour un samedi précis (ex. du tennis)">
          <Steps>
            <li>Créez l&apos;activité comme ci-dessus (univers Activités, publiée).</li>
            <li><A href="/admin/rendez-vous#samedis">Planning des samedis</A> → « <em>Changer</em> » sur la bonne ligne → choisissez l&apos;activité, l&apos;heure, les places.</li>
            <li>Cochez <em>Décaler la rotation</em> si l&apos;activité prévue doit passer au samedi suivant ; sinon elle saute son tour.</li>
          </Steps>
          <p className="text-muted">À faire avant l&apos;ouverture du samedi (indiquée sur chaque ligne : « s&apos;ouvre le … »). Si des personnes sont déjà inscrites, leur date est gardée.</p>
        </Q>
        <Q id="ordre" title="Changer l'ordre de la rotation">
          <p><A href="/admin/rendez-vous">Planning des samedis</A> → « Modifier la rotation » → flèches ↑ ↓, « Retirer », ou « + Ajouter une activité à la rotation ». Enregistrez : les samedis à venir suivent, sauf ceux qui ont déjà des inscrits.</p>
        </Q>
        <Q id="evenement" title="Créer un événement (soirée, afterwork, padel ponctuel…)">
          <Steps>
            <li><A href="/admin/experiences/nouvelle">Créer</A> → « <strong>Un événement avec sa date</strong> » → un modèle (Afterwork…) ou une page blanche.</li>
            <li>Étape 6 : cochez « Programmer des dates maintenant », choisissez la date, l&apos;heure, la répétition éventuelle et la <em>capacité par date</em>. Sans date, la fiche s&apos;affiche avec « Prochaines dates bientôt ».</li>
            <li>Statut <strong>Publiée</strong> : l&apos;événement apparaît dans Événements, et sur l&apos;accueil la semaine où il a lieu.</li>
          </Steps>
        </Q>
        <Q id="girls-only" title="Créer une Table Girls only (café, brunch, déjeuner, dîner)">
          <p>Rien n&apos;est automatique : chaque édition Girls only se crée à la main, quand vous le décidez.</p>
          <Steps>
            <li><A href="/admin/experiences/nouvelle">Créer</A> → « <strong>Une Table spéciale (dont Girls only)</strong> » → section <em>Éditions spéciales Girls only</em> → Café, Brunch, Déjeuner ou Dîner Girls only.</li>
            <li>Choisissez la gamme (Casual, Premium, Exclusive) : elle fixe le type de restaurant et le budget.</li>
            <li>Étape 6 : la date, l&apos;heure et les places. Le modèle est déjà réglé « réservé aux femmes » (le site le vérifie à la réservation).</li>
            <li>Statut <strong>Publiée</strong> : elle apparaît dans Tables et sur l&apos;accueil la semaine concernée. Ensuite, tout suit le même déroulé qu&apos;une Table : restaurants réservés la veille à 15h, lieu dévoilé à 21h30, récapitulatif le jour J.</li>
          </Steps>
          <p className="text-muted">Pour refaire la même édition un autre jour : sur sa fiche, « + Ajouter des dates ».</p>
        </Q>
        <Q id="participants" title="Voir qui vient, déplacer ou annuler une réservation">
          <ul className="list-disc space-y-1.5 ps-5">
            <li>Ouvrez la date (Calendrier ou Accueil) : partie <strong>Participants</strong>. Pour chacun : âge, langues, régime et allergies, paiement en ligne et sur place.</li>
            <li><em>Déplacer</em> : vers une autre date du même événement ; <em>Annuler</em> : remboursement selon la règle (intégral par défaut quand c&apos;est l&apos;équipe qui annule).</li>
            <li><em>Imprimer, exporter</em> (en haut de la page) : liste des participants, supports imprimés, fiche pour le lieu.</li>
          </ul>
        </Q>
        <Q id="demo" title="Site de démo : tout remettre à zéro">
          <p>Sur le site de démonstration seulement : <A href="/admin/demo">Réglages → Site de démo</A> (ou le raccourci de l&apos;Accueil).</p>
          <Steps>
            <li>Indiquez les <strong>comptes invités</strong> (une adresse par ligne) : à chaque remise à zéro, ils sont inscrits à un créneau de chaque rendez-vous de la semaine, pour vivre le parcours complet. Le compte doit exister et son profil être complété.</li>
            <li>« <strong>Réinitialiser et remplir la semaine</strong> », puis tapez RÉINITIALISER : tout ce qui s&apos;est passé est effacé (réservations, paiements, factures, tables, boîte d&apos;envoi, dates passées), le contenu est gardé, et 300 participants fictifs remplissent les 7 prochains jours.</li>
          </Steps>
          <p className="text-muted">À refaire quand le temps passe : la semaine se remplit à nouveau en moins d&apos;une minute. Les participants fictifs n&apos;ont pas d&apos;e-mail réel : rien ne leur est envoyé.</p>
        </Q>
        <Q id="organisateur" title="Un organisateur propose une activité">
          <ul className="list-disc space-y-1.5 ps-5">
            <li>Sa fiche arrive dans « À traiter » sur l&apos;<A href="/admin">Accueil</A> : relisez, publiez ou refusez avec un message. Ses modifications ultérieures attendent aussi votre validation.</li>
            <li>Une activité proposée <strong>pour un samedi</strong> apparaît en haut du <A href="/admin/rendez-vous">planning des samedis</A> : acceptez-la pour le samedi choisi.</li>
            <li>Ses demandes d&apos;annulation d&apos;une date arrivent aussi dans « À traiter ».</li>
          </ul>
        </Q>
        <Q id="alertes" title="Que faire sur une alerte ?">
          <ul className="list-disc space-y-1.5 ps-5">
            <li><strong>Lieux à appeler</strong> : page de la date → Lieux → bouton WhatsApp ou appel, puis « Confirmé par téléphone ». Si un lieu refuse et qu&apos;aucun autre lieu compatible ne reste : « <strong>Choisir un autre lieu</strong> » liste tous les restaurants du format (avec la raison s&apos;ils n&apos;ont pas été proposés) → « Demander à ce lieu ».</li>
            <li><strong>À risque</strong> (minimum non atteint) : maintenir, proposer une autre date, regrouper, ou annuler. Personne n&apos;est déplacé sans son accord.</li>
            <li><strong>Table à valider</strong> : une table sort des limites (ex. 7 personnes) : validez ou corrigez sur la page des tables.</li>
            <li><strong>Dévoilement bloqué</strong> : un lieu n&apos;a pas confirmé ; dès qu&apos;il l&apos;est, le dévoilement part tout seul.</li>
          </ul>
        </Q>
      </Card>

      <Card title="Où trouver quoi">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li><A href="/admin">Accueil</A> : ce qui attend une action, les 7 prochains jours, des raccourcis.</li>
          <li><A href="/admin/programme">Calendrier</A> : la semaine, jour par jour ; une date s&apos;ouvre sur sa page.</li>
          <li><A href="/admin/rendez-vous">Rendez-vous</A> : dîner, café, brunch (réglages, prochaine date) et planning des samedis.</li>
          <li><A href="/admin/experiences">Événements</A> : les fiches, rangées en Activités du samedi, Événements et Tables (dont Girls only).</li>
          <li><A href="/admin/utilisateurs">Membres</A> : comptes, Pass, avis, signalements.</li>
          <li><A href="/admin/partenaires">Partenaires</A> : lieux (capacité, créneaux, gammes) et organisateurs.</li>
          <li><A href="/admin/paiements">Argent</A> : paiements, remboursements, virements, codes promo, statistiques.</li>
          <li><A href="/admin/parametres">Réglages</A> : paramètres, accueil du site, centre d&apos;aide, boîte d&apos;envoi, site de démo.</li>
        </ul>
      </Card>
    </div>
  );
}
