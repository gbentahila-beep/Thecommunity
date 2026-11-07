# 13 — Mise en ligne sur le projet d'essai (`the-community-36766`)

> Ce que **Rita** fait dans les consoles (Google Cloud, GitHub, Firebase), étape par étape.
> Aucune de ces étapes ne nécessite de transmettre un mot de passe ou une clé à Claude.

## Comment ça fonctionne

| Partie | Publiée par | Quand |
|---|---|---|
| Règles de sécurité, index, fonctions serveur, contenu de départ, super-admins | GitHub Actions — workflow « Déploiement — projet d'essai » | À chaque envoi de code sur la branche de travail (ou relance manuelle) |
| Site web (Next.js) | Firebase App Hosting, branché sur GitHub | À chaque envoi de code sur la branche de travail |

Tant que la clé de l'étape 2 n'est pas enregistrée dans GitHub, le workflow s'exécute mais **ne fait rien** (message « déploiement ignoré »).

## Étape 1 — Vérifier la base de données (2 min)

La configuration reçue contient une adresse `…firebasedatabase.app` : une **Realtime Database** (l'ancienne base de Firebase) a aussi été créée. Nous ne l'utilisons pas.

1. Firebase → **Build → Firestore Database** : la page doit afficher **Cloud Firestore** avec un onglet « Données » / « Data ». Si elle propose « Create database », la base Firestore n'existe pas encore : la créer (édition Standard, `europe-west1`, mode production).
2. Firebase → **Build → Realtime Database → onglet Rules** : remplacer le contenu par
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
   puis **Publish**. Elle devient inaccessible (sécurité), sans rien casser.

## Étape 2 — Clé de déploiement pour GitHub (10 min)

1. Ouvrir **console.cloud.google.com**, sélectionner le projet **the-community-36766** (en haut).
2. Menu **IAM & Admin → Service Accounts → + Create service account**.
   - Nom : `github-deploy` → **Create and continue**.
   - Rôle : **Basic → Editor** (« Éditeur ») → **Continue** → **Done**.
   > Rôle large mais acceptable pour un projet d'essai aux données fictives. Le projet réel aura des droits réduits au strict nécessaire.
3. Cliquer sur `github-deploy@…` → onglet **Keys** → **Add key → Create new key → JSON → Create**. Un fichier `.json` se télécharge.
4. Sur **GitHub** : dépôt **Thecommunity → Settings → Secrets and variables → Actions → New repository secret**.
   - Name : `FIREBASE_SERVICE_ACCOUNT_DEV`
   - Secret : ouvrir le fichier `.json` avec le Bloc-notes / TextEdit, **tout copier**, coller.
   - **Add secret**.
5. **Supprimer le fichier `.json`** de l'ordinateur (et vider la corbeille). Ne jamais l'envoyer par e-mail ni dans une conversation.

Si Google refuse la création de clé (« Key creation is disabled »), envoyer une capture : une autre méthode existe.

## Étape 3 — Désigner le super-admin (1 min)

GitHub → **Settings → Secrets and variables → Actions → onglet Variables → New repository variable**
- Name : `SUPERADMIN_EMAILS`
- Value : l'adresse e-mail avec laquelle tu créeras ton compte sur le site (plusieurs adresses : séparées par des virgules).

## Étape 4 — Lancer le premier déploiement (1 min + 5 à 10 min d'attente)

GitHub → onglet **Actions** → **Déploiement — projet d'essai** → cliquer sur la dernière exécution → **Re-run all jobs**.
À la fin (coche verte) : règles, index, fonctions et contenu de démonstration sont en ligne. En cas de croix rouge, envoyer une capture du message d'erreur.

## Étape 5 — Publier le site avec App Hosting (10 min + 10 min de build)

Firebase → **Build → App Hosting → Get started / Create backend** :
1. **Région** : `europe-west1` si proposée, sinon la région européenne la plus proche.
2. **GitHub** : autoriser Firebase, choisir le dépôt **gbentahila-beep/Thecommunity**.
3. **Root directory** (dossier de l'application) : `apps/web`
4. **Live branch** : `claude/dazzling-ramanujan-b80cb8` · **Automatic rollouts** : activé.
5. **Backend name** : `thecommunity-web`.
6. **Firebase web app** : choisir *The Community web*.
7. **Finish and deploy**. Le premier build prend environ 10 minutes. App Hosting affiche ensuite l'adresse du site (du type `https://thecommunity-web--the-community-36766.<région>.hosted.app`).

Si le build échoue, ouvrir le déploiement en échec → **View logs** et envoyer une capture : la configuration d'un site en plusieurs dossiers peut demander un ajustement.

## Étape 6 — Autoriser l'adresse du site pour la connexion (1 min)

Firebase → **Authentication → Settings → Authorized domains → Add domain** : coller l'adresse du site **sans** `https://` (ex. `thecommunity-web--the-community-36766.europe-west1.hosted.app`).

## Étape 7 — Créer ton compte et devenir super-admin

1. Sur le site en ligne : **Créer un compte** avec l'adresse mise dans `SUPERADMIN_EMAILS`, compléter le questionnaire.
2. GitHub → Actions → **Re-run all jobs** sur la dernière exécution du déploiement (le script te nomme super-admin).
3. Sur le site : **se déconnecter puis se reconnecter**, puis ouvrir `/admin`.

## Bon à savoir

- Le bandeau « version de démonstration » reste affiché ; les expériences de départ sont fictives (`isDemo`). Elles pourront être supprimées ou remplacées depuis le back-office.
- Les e-mails (confirmation, mot de passe oublié) partent avec le modèle Firebase traduit en français (étape « Templates » faite précédemment).
- Coût attendu : quelques centimes ; l'alerte de budget prévient au-delà de 5 € / 9 € / 10 €.
