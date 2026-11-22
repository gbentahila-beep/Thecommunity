// Test de bout en bout du back-office (phase 2c, données de démonstration).
// Usage : lancer le site (npm run build && npx next start -p 3100 dans apps/web), puis
//   node tests/e2e/back-office.e2e.cjs
const { chromium, devices } = require('playwright');
const fs = require('fs');
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
(async () => {
  const b = await chromium.launch();
  const base = process.env.BASE_URL ?? 'http://localhost:3100';
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const go = async (p) => { await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(300); };

  // Tableau de bord
  await go('/admin');
  assert(await page.getByText("Chiffre d'affaires brut").isVisible(), 'tableau de bord : indicateurs');
  assert(await page.getByRole('meter').count() >= 5, 'tableau de bord : jauges de remplissage');

  // docs/22, étape F : création en partant d'un modèle (univers → modèle → gamme), formulaire pré-rempli
  await go('/admin/experiences/nouvelle');
  assert(await page.getByTestId('universe-choice').locator('li').count() === 4, 'nouvel événement : 4 univers');
  await page.getByTestId('universe-choice').getByRole('link', { name: /Tables/ }).click();
  await page.waitForURL('**/nouvelle?univers=eat');
  assert((await page.getByTestId('template-choice').locator('li').allTextContents()).map((t) => t.split('Casual')[0].trim()).join('|') === 'Café|Brunch|Déjeuner|Dîner', 'Tables : modèles Café, Brunch, Déjeuner, Dîner');
  await page.getByTestId('template-choice').getByRole('link', { name: /Dîner/ }).click();
  await page.waitForURL('**/nouvelle?modele=diner');
  assert(/250–400 DH/.test(await page.getByTestId('tier-choice').innerText()), 'Dîner : gammes avec leur budget (Premium 250–400 DH)');
  await page.getByTestId('tier-choice').getByRole('link', { name: /Premium/ }).click();
  await page.waitForURL('**/nouvelle?modele=diner&gamme=premium');
  assert(await page.locator('#f-titleFr').inputValue() === 'Dîner' && await page.locator('#f-ambiance').inputValue() === 'Chic et décontractée' && await page.locator('#f-venueTier').inputValue() === 'premium', 'formulaire pré-rempli : titre, gamme et ambiance du modèle');
  assert(await page.locator('#f-revealPolicy').inputValue() === 'on_group_reveal' && await page.locator('#f-bookingMode').count() === 0 && await page.locator('#f-durationMinutes').count() === 0, 'Tables : lieu secret, tables composées, heure de début seulement');
  assert(await page.getByTestId('template-photo').isVisible(), 'photo du modèle proposée');
  assert(await page.locator('#f-groupTarget').count() === 0 && await page.locator('#f-maxSeatsPerBooking').inputValue() === '1', 'plus de taille cible ; 1 place par réservation');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  await page.waitForTimeout(400);
  assert(await page.getByText('Formulaire valide').first().isVisible(), 'lieu secret choisi plus tard : formulaire valide sans nom ni adresse');
  await page.getByTestId('access').getByLabel(/Abonnés d'abord/).check();
  assert(await page.locator('#f-earlyAccessDays').inputValue() === '3', 'accès : abonnés d\'abord 3 jours par défaut');
  assert(await page.getByTestId('save-as-template').isVisible(), 'enregistrer comme modèle : bloc proposé');
  await go('/admin/modeles');
  assert(await page.getByTestId('template-list').locator('li').count() === 14, 'Paramètres → Modèles : les 14 modèles du lancement');

  // Formulaire : validation
  await go('/admin/experiences/nouvelle?modele=vide');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  assert(await page.getByText(/champs? à corriger/).isVisible(), 'formulaire vide : erreurs annoncées');
  // Saisie continue : le focus ne doit pas se perdre entre deux frappes
  await page.locator('#f-titleFr').click();
  await page.keyboard.type('Brunch des créatifs', { delay: 10 });
  assert(await page.locator('#f-titleFr').inputValue() === 'Brunch des créatifs', 'saisie continue sans perte de focus');
  await page.locator('#f-summaryFr').fill('Un brunch pour rencontrer des créatifs de Casablanca.');
  await page.locator('#f-descriptionFr').fill('Un dimanche par mois, une grande table réunit graphistes, photographes et architectes.');
  await page.locator('#f-district').fill('Racine');
  await page.locator('#f-venueName').fill('Café partenaire');
  await page.locator('#f-address').fill('Boulevard Racine, Casablanca');
  await page.locator('#f-groupMin').fill('8'); // incohérent volontairement (min > max)
  await page.locator('[id="f-sessions.weeks"]').fill('4');
  await page.locator('[id="f-sessions.capacity"]').fill('24');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  assert(await page.getByText('Le minimum doit être inférieur ou égal au maximum.').isVisible(), 'règle de cohérence des tailles de groupe');
  await page.locator('#f-groupMin').fill('5');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  assert(await page.getByText('Formulaire valide').first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false), 'formulaire valide : récapitulatif affiché');
  assert(await page.locator('#form-result li.list-disc').count() === 4, 'récurrence : 4 dates générées');
  assert(await page.locator('#form-result').textContent().then(t => t.includes('Payé en ligne : 35 DH par place')), 'prix Wenzy unique : 35 DH par place (docs/22)');
  // 11h : « Ce qui est inclus » dans « 3. Format » (prix total) ; Instagram obligatoire possible sur demande
  assert(await page.locator('fieldset', { hasText: '3. Format' }).locator('#f-included').count() === 1, '« Ce qui est inclus » dans la section Format');
  assert(await page.locator('#f-partnerDescription').count() === 0, 'plus de second champ « réglé sur place »');
  // Étape F : options rares repliées dans « Options avancées »
  await page.getByTestId('advanced-options').locator('summary').click();
  await page.locator('#f-admission').selectOption('on_request');
  assert(await page.getByLabel('Compte Instagram obligatoire').isVisible() && await page.getByLabel('Message de motivation obligatoire', { exact: false }).isVisible(), 'sur demande : Instagram et message obligatoires au choix');
  await page.locator('#f-admission').selectOption('direct');
  // docs/22, étape E : en ligne toujours le prix Wenzy ; sur place rien, prix fixe ou consommation ; ni marge ni prix membre.
  assert(await page.locator('#f-priceDh').count() === 0 && await page.locator('#f-memberPriceDh').count() === 0 && await page.locator('#f-economicsModel').count() === 0 && await page.getByTestId('preview-team').count() === 0, 'ni prix saisi, ni prix membre, ni marge dans le formulaire');
  assert((await page.getByTestId('part-online').innerText()).includes('35 DH par place'), 'en ligne : prix Wenzy de 35 DH');
  assert((await page.getByTestId('preview-client').innerText()).includes('Rien à régler sur place'), 'aperçu : rien sur place par défaut');
  await page.locator('input[name=pricingModel][value=fixed_partner]').check();
  await page.locator('#f-partnerPriceDh').fill('120');
  assert(/35 DH[\s\S]*Sur place : 120 DH/.test(await page.getByTestId('preview-client').innerText()), 'prix fixe sur place, sans lieu partenaire : aperçu 35 DH puis 120 DH sur place');
  await page.locator('input[name=pricingModel][value=variable_consumption]').check();
  await page.locator('#f-venueTier').selectOption('premium');
  assert((await page.getByTestId('preview-client').innerText()).includes('250–400 DH'), 'consommation : budget de la gamme Premium du Dîner (250–400 DH)');
  await page.getByLabel('Événement gratuit (aucun frais Wenzy)').check();
  assert((await page.getByTestId('preview-client').innerText()).includes('Gratuit'), 'événement gratuit : aucun frais Wenzy');
  await page.getByLabel('Événement gratuit (aucun frais Wenzy)').uncheck();
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  await page.waitForTimeout(400);
  assert(await page.getByText('Formulaire valide').isVisible(), 'consommation avec gamme, sans lieu partenaire : formulaire valide');

  // Édition pré-remplie
  await go('/admin/experiences/exp-diner-inconnus');
  assert(await page.locator('#f-titleFr').inputValue() === 'Dîner entre inconnus', 'édition : formulaire pré-rempli');

  // Participants + export CSV
  await go('/admin/sessions/ses-diner-inconnus-1');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exporter/ }).click()]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  assert(csv.charCodeAt(0) === 0xfeff && csv.slice(1).startsWith('Prénom;Nom;E-mail'), 'export CSV compatible Excel (BOM, « ; »)');
  assert(csv.split('\r\n').length >= 25, 'export CSV : une ligne par réservation');

  // Groupes
  await go('/admin/sessions/ses-diner-inconnus-1/groupes');
  const sections = page.locator('section[aria-label^="Table"]');
  const n0 = await sections.count();
  assert(n0 === 4, `proposition initiale : 4 tables (trouvé ${n0})`);
  const firstSelect = sections.nth(0).locator('select').first();
  const t1Before = await sections.nth(0).locator('li').count();
  await firstSelect.selectOption({ label: 'Table 2' });
  assert(await sections.nth(0).locator('li').count() === t1Before - 1, 'déplacement d’un participant (liste « Déplacer vers »)');
  // glisser-déposer (fenêtre assez haute pour voir les deux tables : le glisser simulé ne fait pas défiler)
  await page.setViewportSize({ width: 1366, height: 1600 });
  const t3 = sections.nth(2); const t4 = sections.nth(3);
  const t4Before = await t4.locator('li').count();
  await t3.locator('li').first().dragTo(t4);
  assert(await t4.locator('li').count() === t4Before + 1, 'glisser-déposer entre deux tables');
  await page.getByRole('button', { name: 'Diviser Table 1 en deux' }).click();
  assert(await sections.count() === 5, 'diviser une table');
  await page.locator('#merge-a').selectOption({ label: 'Table 1' });
  await page.locator('#merge-b').selectOption({ label: 'Table 5' });
  await page.getByRole('button', { name: 'Fusionner', exact: true }).click();
  assert(await sections.count() === 4, 'fusionner deux tables');
  await page.getByRole('button', { name: 'Annuler mes changements' }).click();
  assert(await sections.nth(0).locator('li').count() === t1Before, 'retour à la proposition initiale');
  assert(await page.getByRole('button', { name: /Valider et révéler/ }).isDisabled(), 'validation désactivée (phase 6)');

  // Filtres
  await go('/admin/reservations?statut=refunded');
  assert(await page.locator('tbody tr').count() > 0 && await page.locator('tbody').textContent().then(t => !t.includes('Confirmée')), 'filtre des réservations par statut');
  await go('/admin/utilisateurs?q=suspendu');
  await go('/admin/utilisateurs');
  assert(await page.getByText('Suspendu').count() === 1, 'liste des utilisateurs avec statut');

  // 18 : activités, questionnaire, propositions, assurance
  await go('/admin/experiences/nouvelle?modele=vide');
  await page.getByLabel(/^Univers/).selectOption('discover');
  const act = page.locator('#activite');
  assert(await act.getByText('4. Activité et questionnaire').isVisible(), 'formulaire : section « Activité et questionnaire »');
  await page.getByLabel('Partir d\'un modèle').selectOption('padel');
  await page.getByRole('button', { name: 'Utiliser ce modèle' }).click();
  assert(await page.getByTestId('question').count() === 2, 'questionnaire : modèle « padel » chargé (2 questions validées)');
  assert(await page.getByLabel('Question (français)').first().inputValue() === 'Votre niveau de padel ?', 'questionnaire : question de niveau');
  await page.getByRole('button', { name: /Ajouter une question/ }).click();
  assert(await page.getByTestId('question').count() === 3, 'questionnaire : ajouter une question');
  await page.getByRole('button', { name: 'Supprimer la question 3' }).click();
  await page.getByLabel('Partir d\'un modèle').selectOption('paintball');
  await page.getByRole('button', { name: 'Utiliser ce modèle' }).click();
  assert(await page.getByText('Remplacer les 2 questions actuelles ?').isVisible(), 'remplacer un questionnaire : confirmation dans la page');
  await page.getByRole('button', { name: 'Oui, remplacer' }).click();
  assert(await page.getByTestId('question').count() === 2, 'questionnaire : modèle « paintball » (2 questions)');
  await page.getByLabel(/^Univers/).selectOption('move');
  assert(await page.getByRole('checkbox', { name: /Activité physique/ }).isChecked(), 'univers Sport : activité physique cochée d\'office');
  // Étape 19 : sous-catégorie proposée seulement pour l'univers qui en a
  assert((await page.locator('#f-subcategoryId option').allTextContents()).join('|') === '— Aucune —|Padel', 'Sport : sous-catégorie Padel proposée');
  await page.getByLabel(/^Univers/).selectOption('eat');
  assert((await page.locator('#f-subcategoryId option').allTextContents()).join('|') === '— Aucune —|Café|Brunch|Déjeuner|Dîner', 'Tables : formats Café, Brunch, Déjeuner, Dîner');
  await page.getByLabel(/^Univers/).selectOption('move');
  await page.getByLabel(/^Lieu partenaire/).selectOption('p-paintball-bouskoura');
  assert(await page.getByTestId('insurance-warning').isVisible(), 'activité physique chez un lieu sans assurance vérifiée : alerte');
  await page.getByLabel(/^Lieu partenaire/).selectOption('p-padel-anfa');
  assert(await page.getByTestId('insurance-warning').count() === 0, 'lieu assuré : pas d\'alerte');
  await go('/admin/propositions');
  assert(await page.getByTestId('proposal').count() === 2, 'sorties proposées : 2 propositions d\'exemple');
  await page.getByRole('link', { name: 'Créer l\'expérience à partir de la proposition' }).first().click();
  await page.waitForURL('**/admin/experiences/nouvelle?proposition=*');
  assert(await page.getByTestId('from-proposal').isVisible(), 'création pré-remplie : bandeau de la proposition');
  assert(await page.getByLabel('Titre (français)').inputValue() === 'Padel du samedi matin', 'création pré-remplie : titre repris');
  await go('/admin/partenaires');
  assert(await page.getByText('Assurance (activités physiques)').first().isVisible(), 'partenaires : état de l\'assurance affiché');
  await go('/admin/partenaires/p-padel-anfa');
  assert(await page.getByTestId('partner-insurance').isVisible(), 'fiche partenaire : bloc assurance');

  // Mobile : menu et débordement
  const m = await b.newContext({ ...devices['iPhone 13'] }); const mp = await m.newPage();
  mp.on('pageerror', e => errs.push('mobile: ' + e.message));
  // Étape 19 : Paramètres → catégories dynamiques (démo : lecture seule)
  await page.goto(`${base}/admin/parametres`);
  assert(await page.locator('summary', { hasText: 'Padel' }).getByText('Sous-catégorie').isVisible(), 'Paramètres : Padel listée comme sous-catégorie');
  assert(await page.locator('summary', { hasText: 'Brunch' }).getByText('Sous-catégorie').isVisible(), 'Paramètres : Brunch listé comme format des Tables');
  assert(await page.locator('#cat-padel-parent').inputValue() === 'move', 'Padel rattachée à Bouger');
  // Étape 22 : politiques d'annulation, modes de paiement des organisateurs, demandes de remboursement
  assert(await page.getByTestId('policies').locator('li').count() === 3, 'Paramètres : 3 politiques d\'annulation (démonstration)');
  await page.getByText('+ Nouvelle politique').click();
  await page.locator('#policy-id').fill('test-72h');
  await page.locator('#policy-fr').fill('Annulation gratuite jusqu\'à 3 jours avant');
  assert(/7 jours avant ou plus : 100 % · 48 h avant ou plus : 50 % · moins de 48 h : 0 %/.test(await page.getByText(/^Aperçu :/).textContent()), 'nouvelle politique : aperçu des paliers');
  await page.getByRole('button', { name: 'Enregistrer la politique' }).click();
  assert(await page.getByRole('status').filter({ hasText: 'Démonstration' }).isVisible(), 'politique valide (démonstration)');
  assert(await page.getByRole('checkbox', { name: /Acompte en ligne/ }).isChecked(), 'modes de paiement : acompte proposé');
  await page.goto(`${base}/admin/remboursements`);
  assert(await page.getByTestId('refund-request-admin').count() === 1, 'remboursements : une demande d\'exemple');
  await page.getByRole('button', { name: 'Rembourser en partie' }).click();
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  assert(await page.getByRole('status').filter({ hasText: 'Indiquez le montant' }).isVisible(), 'remboursement partiel : montant exigé');
  await page.getByRole('button', { name: 'Refuser' }).click();
  await page.getByRole('button', { name: 'Confirmer le refus' }).click();
  assert(await page.getByRole('status').filter({ hasText: 'Expliquez le refus' }).isVisible(), 'refus : motif exigé');
  for (const p of ['/admin', '/admin/experiences', '/admin/experiences/nouvelle', '/admin/sessions/ses-diner-inconnus-1', '/admin/sessions/ses-diner-inconnus-1/groupes', '/admin/reservations', '/admin/utilisateurs', '/admin/partenaires', '/admin/paiements', '/admin/promos', '/admin/statistiques', '/admin/parametres', '/admin/remboursements']) {
    await mp.goto(base + p, { waitUntil: 'load' });
    assert(!(await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'mobile sans débordement : ' + p);
  }
  await mp.goto(base + '/admin', { waitUntil: 'load' });
  await mp.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await mp.getByRole('link', { name: 'Statistiques' }).click();
  await mp.waitForURL('**/admin/statistiques');
  assert(true, 'menu mobile du back-office');

  console.log(errs.length ? 'ERREURS NAVIGATEUR:\n' + errs.join('\n') : 'aucune erreur navigateur');
  await b.close();
  if (errs.length) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
