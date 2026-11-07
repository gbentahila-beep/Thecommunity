# 04 — Rôles, sécurité et conformité

> Phase 1 · Document d'architecture · Statut : **validé**

## 1. Rôles

| Rôle | Peut | Ne peut pas |
|---|---|---|
| `user` | Gérer son profil, réserver/annuler via le serveur, lire ses réservations, paiements, notifications, son groupe révélé, laisser un avis | Lire le profil d'un autre, modifier un prix, une place, un statut, son rôle |
| `organizer` *(désactivé au lancement)* | Lire les sessions et participants (prénom + nombre) des partenaires auxquels il est rattaché, faire le check-in | Voir les e-mails/téléphones, les paiements, les autres partenaires |
| `admin` | Tout le back-office : expériences, sessions, réservations, groupes, utilisateurs, partenaires, promos, statistiques, remboursements dans la limite fixée | Créer/retirer des admins, modifier les paramètres de paiement |
| `superadmin` | Tout, y compris la gestion des rôles et le paramétrage du prestataire de paiement | — |

## 2. Gestion des rôles : custom claims

- Le rôle est stocké dans le **custom claim** du jeton Firebase Auth : `{ role: "admin" }`. Il ne peut être modifié que par l'Admin SDK, donc par le serveur.
- Les règles Firestore et Storage lisent `request.auth.token.role`. Les Cloud Functions vérifient le même claim.
- `users/{uid}.role` est un **miroir en lecture seule** pour l'affichage ; il n'accorde aucun droit.
- Attribution d'un rôle : callable `admin-setUserRole`, réservée au `superadmin`, journalisée dans `auditLogs`. Le premier `superadmin` est créé par un script en ligne de commande (`scripts/bootstrap-superadmin.ts`) exécuté avec des identifiants de service, jamais depuis l'interface.
- Après changement de rôle, le serveur révoque les jetons de l'utilisateur pour forcer la prise en compte.
- Rattachement organisateur ↔ partenaire : stocké dans `partners/{id}.organizerUids` (pas dans le claim, limité à 1 000 octets).
- **Recommandé :** authentification à deux facteurs (MFA) obligatoire pour `admin` et `superadmin` (disponible via Identity Platform).

## 3. Règles d'accès par collection (synthèse)

| Collection | Lecture | Écriture client |
|---|---|---|
| `users/{uid}` | Propriétaire, admin | Propriétaire : champs autorisés uniquement (pas `role`, `status`, `stats`, `email`, dates) |
| `users/{uid}/notifications` | Propriétaire | Propriétaire : uniquement `readAt` |
| `users/{uid}/favorites` | Propriétaire | Propriétaire |
| `userMatching` | Admin | Aucune |
| `cities`, `categories` | Public | Admin |
| `experiences` | Public si `published`, admin sinon | Admin (champs de contenu) ; `ratingAvg`, `nextSessionAt` serveur |
| `experiences/*/private` | Admin | Admin |
| `sessions` | Public si `published`/`full`/`completed`, admin sinon | Admin pour le contenu ; **compteurs, capacité et statut via callable** |
| `sessions/*/seatLocks` | Admin | Aucune |
| `sessions/*/waitlist/{uid}` | Propriétaire, admin | Aucune (callable) |
| `reservations` | Propriétaire, admin | **Aucune** (callables) |
| `payments` | Propriétaire, admin | **Aucune** |
| `paymentEvents`, `auditLogs`, `statsDaily` | Admin (sauf `paymentEvents` : superadmin) | Aucune |
| `groups` | Membre si `revealed`, admin | Aucune (callables admin) |
| `groups/*/private` | Admin | Aucune |
| `reviews` | Public si `published` | Aucune (callable) |
| `promoCodes` | Admin | Admin (sauf `redemptionsCount`) |
| `partners` | Admin (+ organisateur rattaché, plus tard) | Admin |
| `settings/public`, `settings/cancellationPolicies` | Public | Admin |
| `settings/payment` | Superadmin | Superadmin |
| `contactMessages` | Admin | Création publique, schéma strict |
| `reports` | Admin | Création par un participant de la session |
| `dataRequests` | Propriétaire, admin | Création par le propriétaire |

## 4. Extrait des règles Firestore prévues (brouillon)

Brouillon de conception, pas encore livré : il sera écrit dans `firebase/firestore.rules` en phase 3 et **couvert par des tests automatisés** avant tout déploiement.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function signedIn()   { return request.auth != null; }
    function role()       { return signedIn() ? request.auth.token.get('role', 'user') : null; }
    function isAdmin()    { return role() in ['admin', 'superadmin']; }
    function isSuper()    { return role() == 'superadmin'; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function verified()   { return signedIn() && request.auth.token.email_verified == true; }
    function onlyChanges(keys) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
    }

    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      // Création faite par le serveur à l'inscription (trigger Auth)
      allow create: if false;
      allow update: if isOwner(uid) && onlyChanges([
        'firstName','lastName','phone','birthDate','gender','cityId','photoPath',
        'languages','interests','socialGoals','profession','bio','locale',
        'onboardingCompleted','notificationPrefs','consents','updatedAt'
      ]) /* + validation des types et longueurs */;
      allow delete: if false; // suppression via dataRequests

      match /notifications/{id} {
        allow read: if isOwner(uid);
        allow update: if isOwner(uid) && onlyChanges(['readAt']);
      }
      match /favorites/{experienceId} {
        allow read, write: if isOwner(uid);
      }
    }

    match /experiences/{id} {
      allow read: if resource.data.status == 'published' || isAdmin();
      allow create, update: if isAdmin()
        && !request.resource.data.diff(resource == null ? {} : resource.data)
             .affectedKeys().hasAny(['ratingAvg','ratingCount','nextSessionAt']);
      allow delete: if isSuper();
      match /private/{doc} { allow read, write: if isAdmin(); }
    }

    match /sessions/{id} {
      allow read: if resource.data.status in ['published','full','completed'] || isAdmin();
      allow update: if isAdmin() && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['capacity','seatsConfirmed','seatsHeld','waitlistCount','status','groupsStatus']);
      allow create, delete: if false; // via callable (crée les compteurs à 0)
      match /waitlist/{uid} { allow read: if isOwner(uid) || isAdmin(); }
      match /seatLocks/{uid} { allow read: if isAdmin(); }
    }

    match /reservations/{id} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow write: if false;
    }

    match /payments/{id} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow write: if false;
    }

    match /groups/{id} {
      allow read: if isAdmin()
        || (signedIn() && request.auth.uid in resource.data.memberIds
            && resource.data.status == 'revealed');
      allow write: if false;
      match /private/{doc} { allow read: if isAdmin(); }
    }

    match /reviews/{id} {
      allow read: if resource.data.status == 'published' || isAdmin();
      allow write: if false;
    }

    match /promoCodes/{code} {
      allow read, create: if isAdmin();
      allow update: if isAdmin() && !request.resource.data.diff(resource.data)
        .affectedKeys().hasAny(['redemptionsCount']);
    }

    // … cities, categories, partners, settings, auditLogs, statsDaily,
    // contactMessages, reports, dataRequests : selon le tableau ci-dessus.
    // Toute collection non listée est refusée par défaut.
  }
}
```

Points notables :
- Règle par défaut : **tout est refusé** sauf ce qui est explicitement autorisé.
- La lecture d'une liste (requête) doit respecter la règle : par exemple, la requête « mes réservations » doit filtrer `where('userId', '==', uid)`, sinon elle est refusée.
- La réservation exige un e-mail vérifié (`verified()` contrôlé dans la callable) pour limiter les faux comptes.

## 5. Règles Storage prévues

| Chemin | Lecture | Écriture | Limites |
|---|---|---|---|
| `experiences/{experienceId}/{file}` | Public | Admin | Images uniquement, 8 Mo |
| `cities/…`, `categories/…`, `promo/…` | Public | Admin | Images, 8 Mo |
| `users/{uid}/avatar/{file}` | Utilisateur connecté | Propriétaire | `image/jpeg|png|webp`, 3 Mo |
| `exports/{adminUid}/{file}` | Aucune (URL signée temporaire générée par le serveur) | Serveur | — |
| `partners/{partnerId}/documents/…` | Admin | Admin | PDF/images, 10 Mo |

Les images envoyées sont redimensionnées et converties en WebP par une Cloud Function (ou l'extension « Resize Images »), avec suppression des métadonnées EXIF (localisation GPS des photos de profil).

## 6. Protections supplémentaires

- **App Check** (reCAPTCHA Enterprise) appliqué à Firestore, Storage et toutes les callables en production.
- **Callables** : vérification systématique de `context.auth`, du rôle, d'un e-mail vérifié pour réserver, validation Zod des entrées, limitation de fréquence par utilisateur (ex. 10 tentatives de réservation / 10 min).
- **Webhooks de paiement** : vérification de la signature/du hash du prestataire, rejet si invalide, idempotence via `paymentEvents`, montant et devise recontrôlés par rapport à la réservation.
- **Aucun secret dans le front** : clés dans Secret Manager ; un contrôle CI (`gitleaks`) bloque tout commit contenant un secret.
- **Journal d'audit** (`auditLogs`) pour : changement de rôle, suspension, remboursement, annulation de session, modification de prix/capacité, export de données, modification de groupe validé.
- **Données minimales visibles entre participants** : prénom, photo, centres d'intérêt. Jamais nom complet, âge exact, téléphone, e-mail.
- **Signalement et suspension** : un compte `suspended` ne peut plus réserver (contrôle dans la callable) et ses jetons sont révoqués.

## 7. Sauvegarde et reprise

- **Point-in-time recovery (PITR)** activé sur Firestore en production (retour à n'importe quelle minute des 7 derniers jours).
- **Sauvegardes planifiées** Firestore quotidiennes (rétention 14 jours) + hebdomadaires (rétention longue), fonctionnalité native de Firestore.
- Export mensuel vers un bucket Cloud Storage distinct, avec accès restreint.
- Procédure de restauration documentée et **testée une fois avant le lancement** sur le projet dev.

## 8. Conformité loi 09-08 / CNDP

> Ce qui suit est un cadrage technique, pas un avis juridique. Les formalités doivent être validées par un conseil spécialisé avant le lancement commercial.

| Exigence | Réponse prévue |
|---|---|
| Déclaration / autorisation des traitements auprès de la CNDP | À déposer avant l'ouverture au public (traitement des comptes clients, prospection, vidéosurveillance non concernée) |
| Transfert de données hors du Maroc (hébergement Google Cloud en UE) | Demande d'autorisation de transfert / vérification du régime applicable aux pays de destination |
| Information des personnes | Politique de confidentialité claire, mentions au moment de la collecte (questionnaire) |
| Consentement | Cases distinctes : CGU/CGV, charte de bonne conduite, prospection commerciale (décochée par défaut), cookies non essentiels |
| Minimisation | Pas de données sensibles (religion, santé, opinions). Genre facultatif. Date de naissance utilisée uniquement en tranches d'âge |
| Droits d'accès, rectification, opposition, suppression | Page « Mes données » : export JSON, demande de suppression → anonymisation des réservations (conservées pour la comptabilité) et suppression du profil, photo, notifications |
| Durées de conservation | Comptes inactifs : à définir (proposition 3 ans) ; données comptables : selon obligations légales ; journaux techniques : 12 mois |
| Sécurité | Règles strictes, chiffrement au repos (natif Google), MFA admins, audit |
| Cookies / traceurs | Bandeau de consentement ; GA4 et pixels publicitaires chargés uniquement après accord |
| Mineurs | Inscription réservée aux 18 ans et plus (contrôle de la date de naissance) |
