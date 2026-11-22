// Étape 20 — espace organisateur /pro et pages « Organisateurs » du back-office (données de démonstration).
// Usage : site de démonstration lancé (npx next start -p 3100 dans apps/web), puis node tests/e2e/pro.e2e.cjs
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (l, ms = 8000) => l.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  page.on('pageerror', (e) => errs.push(e.message));

  // 1. Accès : lien du pied de page, tableau de bord du club de démonstration
  await page.goto(base + '/', { waitUntil: 'load' });
  assert(await page.locator('footer').getByRole('link', { name: 'Espace organisateur' }).getAttribute('href') === '/pro', 'pied de page → Espace organisateur (/pro, non localisé)');
  await page.goto(base + '/en', { waitUntil: 'load' });
  assert(await page.locator('footer').getByRole('link', { name: 'Organizer space' }).getAttribute('href') === '/pro', 'version anglaise : même lien /pro');
  const r = await page.goto(base + '/pro', { waitUntil: 'load' });
  assert(r.status() === 200, '/pro répond (pas de routage par langue)');
  assert(await page.getByRole('heading', { level: 1, name: 'Club Padel Anfa' }).isVisible(), 'tableau de bord : nom de l\'organisateur');
  assert(await page.getByText('Espace organisateur de démonstration').isVisible(), 'bandeau démonstration');
  assert(await page.getByTestId('pro-stats').getByText('Réservations payées').isVisible(), 'chiffres clés');
  const nav = page.getByRole('navigation', { name: 'Espace organisateur' }).first();
  for (const l of ['Tableau de bord', 'Mes activités', 'Dates', 'Réservations', 'Demandes', 'Billets (pointage)', 'Finances', 'Profil public']) assert(await nav.getByRole('link', { name: l }).isVisible(), `menu : ${l}`);

  // 2. Activités : seulement celles du club, formulaire sans réglages de l'équipe
  await nav.getByRole('link', { name: 'Mes activités' }).click();
  await page.waitForURL('**/pro/activites');
  const acts = await page.getByTestId('pro-activity').allTextContents();
  assert(acts.length === 1 && /Padel entre inconnus/.test(acts[0]) && /En ligne/.test(acts[0]), 'mes activités : le padel du club, en ligne (pas les expériences de Wenzy)');
  await page.getByRole('link', { name: 'Modifier' }).click();
  await page.waitForURL(/\/pro\/activites\/exp-padel$/);
  assert(await page.getByText('5. Prix', { exact: true }).isVisible(), 'formulaire : section « 5. Prix » simplifiée');
  for (const hidden of ['economics', 'part-on-site']) assert(await page.getByTestId(hidden).count() === 0, `formulaire : pas de bloc « ${hidden} »`);
  assert(await page.getByText('Réservée aux membres abonnés').count() === 0, 'formulaire : pas d\'option « réservée aux membres »');
  assert(await page.locator('#f-partnerId').count() === 0 && await page.locator('#f-memberPriceDh').count() === 0, 'formulaire : ni partenaire ni prix membre');
  assert((await page.locator('#f-status option').allTextContents()).includes('Publiée (reste en ligne)'), 'activité en ligne : « reste en ligne » après modification');
  await page.goto(base + '/pro/activites/exp-diner-inconnus', { waitUntil: 'load' });
  assert(await page.getByText('Page introuvable').isVisible() || (await page.title()).includes('404') || await page.getByText(/introuvable/i).first().isVisible(), 'activité d\'un autre (Wenzy) : introuvable');
  await page.goto(base + '/pro/activites/nouvelle', { waitUntil: 'load' });
  // Étape 22 : mode de paiement (A/B/C) avec aperçu « en ligne / sur place »
  assert((await page.getByTestId('payment-model').getByRole('radio').count()) === 3, 'nouvelle activité : 3 modes de paiement proposés');
  await page.locator('#f-priceDh').fill('200');
  await page.getByTestId('payment-model').getByText('Acompte en ligne').click();
  await page.locator('#f-depositPercent').fill('30');
  assert(/60 DH en ligne, puis 140 DH sur place/.test((await page.getByTestId('payment-preview').textContent()).replace(/\u202f|\u00a0/g, ' ')), 'acompte 30 % : 60 DH en ligne, 140 DH sur place');
  await page.getByTestId('payment-model').getByText('Frais de réservation en ligne').click();
  assert(/24 DH en ligne, puis 176 DH sur place/.test((await page.getByTestId('payment-preview').textContent()).replace(/\u202f|\u00a0/g, ' ')), 'frais de réservation = commission (12 % Sport) : 24 DH en ligne');
  await page.getByTestId('payment-model').getByText('Tout en ligne').click();
  await page.locator('#f-priceDh').fill('');
  assert((await page.locator('#f-status option').allTextContents()).join('|') === 'Brouillon (non visible)|Envoyer pour validation', 'nouvelle activité : brouillon ou « Envoyer pour validation »');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  assert(await visible(page.getByRole('alert').filter({ hasText: 'champ' })), 'nouvelle activité : champs obligatoires signalés');

  // 3. Dates, participants, réservations, billets, demandes, profil
  await page.goto(base + '/pro/dates', { waitUntil: 'load' });
  const sessions = page.getByTestId('pro-session');
  assert(await sessions.count() >= 1 && (await sessions.allTextContents()).every((t) => /Padel/.test(t)), 'dates : seulement celles du padel');
  await sessions.first().getByRole('link', { name: 'Participants' }).click();
  await page.waitForURL(/\/pro\/dates\/.+/);
  assert(await page.getByRole('button', { name: 'Exporter la liste' }).isVisible(), 'participants : export de la liste');
  const people = await page.getByTestId('pro-participant').allTextContents();
  assert(people.length >= 1 && people.every((t) => /[A-ZÉ][a-zéèï]+ [A-Z]\./.test(t)), 'participants : prénom + initiale du nom seulement');
  assert(await page.getByText('Démonstration : action désactivée.').isVisible(), 'annulation de date désactivée en démonstration');
  await page.goto(base + '/pro/reservations', { waitUntil: 'load' });
  const all = await page.getByTestId('pro-reservation').count();
  assert(all >= 1 && (await page.getByTestId('pro-reservation').allTextContents()).every((t) => /Padel/.test(t)), `réservations : ${all}, toutes sur le padel`);
  await page.getByLabel('Statut').selectOption('confirmed');
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await page.waitForURL(/statut=confirmed/);
  assert((await page.getByTestId('pro-reservation').allTextContents()).every((t) => /Confirmée/.test(t)), 'filtre par statut');
  assert(await page.getByRole('button', { name: /Exporter \(CSV/ }).isVisible(), 'export CSV des réservations');
  const code = (await page.getByTestId('pro-reservation').first().locator('td').first().textContent()).trim();
  await page.goto(base + `/pro/billets?q=${code}`, { waitUntil: 'load' });
  await page.waitForURL(/\/pro\/billets\/.+/);
  assert(await visible(page.getByTestId('ticket-state')), `billet ${code} : fiche ouverte depuis le code`);
  await page.goto(base + '/pro/billets?q=ZZZZZZZZ', { waitUntil: 'load' });
  assert(await page.getByText('Aucun billet de vos activités').isVisible(), 'billet inconnu : rien');
  await page.goto(base + '/pro/demandes', { waitUntil: 'load' });
  assert(await page.getByText('Aucune demande en attente').isVisible(), 'demandes : aucune (démonstration)');
  await page.goto(base + '/pro/profil', { waitUntil: 'load' });
  await page.locator('#p-description').fill('Trop court');
  await page.getByRole('button', { name: 'Enregistrer le profil' }).click();
  assert(await visible(page.getByRole('alert').filter({ hasText: '30 caractères' })), 'profil : présentation trop courte refusée');

  // 4. Inscription : formulaire complet, contrat obligatoire
  await page.goto(base + '/pro/inscription', { waitUntil: 'load' });
  assert(await page.getByRole('heading', { level: 1, name: 'Créer mon compte organisateur' }).isVisible(), 'inscription : titre');
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(page.locator('[aria-invalid="true"]')), 'inscription : champs manquants signalés');
  await page.locator('#o-businessName').fill('Atelier Démo');
  await page.locator('#o-contactName').fill('Yasmine Test');
  await page.locator('#o-email').fill('yasmine@example.com');
  await page.locator('#o-phone').fill('+212 600 000 000');
  await page.locator('#o-address').fill('Rue Ibnou Mounir, Casablanca');
  await page.getByRole('checkbox', { name: 'Ateliers' }).check();
  await page.locator('#o-description').fill('Atelier de céramique à Maârif : initiations au tour, cuisson comprise, tous niveaux.');
  await page.locator('#o-documents').setInputFiles({ name: 'registre.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 démo') });
  assert(await visible(page.getByTestId('documents').getByText('registre.pdf')), 'inscription : pièce ajoutée');
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(page.getByText('Vous devez accepter le contrat organisateur.')), 'inscription : contrat obligatoire');
  await page.locator('#o-acceptTerms').check();
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(page.getByTestId('application-sent')), 'inscription : demande envoyée (démonstration)');

  // 5. Back-office : organisateurs, demande en attente, décision avec message obligatoire
  await page.goto(base + '/admin', { waitUntil: 'load' });
  assert(await page.getByTestId('todo-organizers').isVisible(), 'tableau de bord équipe : demande d\'organisateur à traiter');
  await page.getByRole('navigation').getByRole('link', { name: 'Organisateurs' }).first().click();
  await page.waitForURL('**/admin/organisateurs');
  const rows = await page.getByTestId('admin-organizer').allTextContents();
  assert(rows.length === 2 && /Atelier Terre & Feu.*En attente/.test(rows[0]) && /Club Padel Anfa.*Validé/.test(rows[1]), 'liste : demande en attente d\'abord, puis le club validé');
  await page.getByTestId('admin-organizer').first().getByRole('link', { name: 'Ouvrir' }).click();
  await page.waitForURL('**/admin/organisateurs/org-atelier-terre-feu');
  assert(await page.getByTestId('organizer-documents').getByRole('button').count() === 2, 'fiche : 2 pièces justificatives');
  await page.getByRole('button', { name: 'Demander un complément' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  assert(await visible(page.getByRole('status').filter({ hasText: 'Écrivez un message' })), 'complément : message obligatoire');
  await page.locator('#org-decision-message').fill('Merci d\'ajouter l\'attestation d\'assurance.');
  await page.getByRole('button', { name: 'Confirmer' }).click();
  assert(await visible(page.getByRole('status').filter({ hasText: 'Démonstration' })), 'complément : démonstration, rien n\'est enregistré');
  await page.goto(base + '/admin/experiences/exp-padel', { waitUntil: 'load' });
  assert(await page.getByText('Activité proposée par Club Padel Anfa').isVisible(), 'expérience du club : organisateur affiché à l\'équipe');
  await page.goto(base + '/admin/experiences?vue=review', { waitUntil: 'load' });
  assert(await page.getByText('Rien à valider.').isVisible(), 'filtre « À valider » (vide en démonstration)');

  // 6. Étape 21 : finances de l'organisateur, commissions et reversements côté équipe
  await page.goto(base + '/pro/finances', { waitUntil: 'load' });
  assert(await page.getByTestId('pro-finance-kpis').getByText('Commission Wenzy').isVisible(), 'finances : chiffres clés');
  assert(/Sport & bien-être : 12 %/.test(await page.getByTestId('pro-rates').textContent()), 'finances : taux applicable (règle « Sport » 12 %)');
  const ledger = await page.getByTestId('pro-ledger').allTextContents();
  assert(ledger.length >= 1 && ledger.every((t) => /Padel entre inconnus/.test(t)), `finances : ${ledger.length} écritures, toutes sur le padel`);
  assert(await page.getByTestId('pro-payout').filter({ hasText: 'Viré' }).count() === 1, 'finances : un reversement « viré »');
  await page.locator('#bank-holder').fill('Club Padel Anfa SARL');
  await page.locator('#bank-name').fill('Banque démo');
  await page.locator('#bank-rib').fill('1234');
  await page.getByRole('button', { name: 'Enregistrer le RIB' }).click();
  assert(await visible(page.getByRole('alert').filter({ hasText: '24 chiffres' })), 'RIB : 24 chiffres exigés');
  await page.locator('#bank-rib').fill('0011 1100 0000 1234 5678 9012');
  await page.getByRole('button', { name: 'Enregistrer le RIB' }).click();
  assert(await visible(page.getByRole('status').filter({ hasText: 'Enregistré' })), 'RIB valide accepté (démonstration)');
  await page.goto(base + '/admin/commissions', { waitUntil: 'load' });
  assert(await page.getByTestId('commission-rule').count() === 2, 'commissions : 2 règles (générale 15 %, Sport 12 %)');
  await page.locator('#rule-scope').selectOption('organizer');
  await page.getByRole('button', { name: 'Ajouter la règle' }).click();
  assert(await visible(page.getByRole('alert').filter({ hasText: 'cible obligatoire' })), 'nouvelle règle : organisateur à choisir');
  await page.locator('#rule-target').selectOption('org-club-padel-anfa');
  await page.locator('#rule-rate').fill('10');
  await page.getByRole('button', { name: 'Ajouter la règle' }).click();
  assert(await visible(page.getByRole('status').filter({ hasText: 'Démonstration' })), 'nouvelle règle valide (démonstration)');
  await page.goto(base + '/admin/reversements', { waitUntil: 'load' });
  assert(await page.getByTestId('finance-kpis').getByText('Commissions').isVisible(), 'reversements : chiffres clés');
  assert(await page.getByTestId('payout-organizer').filter({ hasText: 'Club Padel Anfa' }).count() === 1, 'reversements : ligne du club');
  assert(await page.getByTestId('payout').filter({ hasText: 'VIR-DEMO-0001' }).count() === 1, 'reversements : virement de démonstration');

  // 7. Textes juridiques (3 langues) et mobile
  for (const [path, title, dir] of [['/contrat-organisateur', 'Contrat organisateur', 'ltr'], ['/en/contrat-organisateur', 'Organizer agreement', 'ltr'], ['/ar/contrat-organisateur', 'عقد المنظّم', 'rtl'], ['/conditions-organisateurs', 'Conditions de vente des activités des organisateurs', 'ltr'], ['/en/conditions-organisateurs', "Sales terms for organizers' activities", 'ltr'], ['/ar/conditions-organisateurs', 'شروط بيع أنشطة المنظّمين', 'rtl']]) {
    await page.goto(base + path, { waitUntil: 'load' });
    assert(await page.getByRole('heading', { level: 1, name: title }).isVisible(), `${path} : « ${title} »`);
    assert((await page.locator('html').getAttribute('dir')) === dir, `${path} : sens ${dir}`);
  }
  assert(await page.locator('footer').getByRole('link', { name: 'عقد المنظّم' }).isVisible(), 'pied de page arabe : contrat organisateur');
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  m.on('pageerror', (e) => errs.push(e.message));
  for (const path of ['/pro', '/pro/activites', '/pro/dates', '/pro/reservations', '/pro/billets', '/pro/profil', '/pro/finances', '/pro/inscription', '/admin/organisateurs', '/admin/organisateurs/org-club-padel-anfa', '/admin/commissions', '/admin/reversements', '/contrat-organisateur']) {
    await m.goto(base + path, { waitUntil: 'load' });
    assert(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `mobile sans débordement : ${path}`);
  }
  await m.goto(base + '/pro', { waitUntil: 'load' });
  await m.getByRole('button', { name: 'Ouvrir le menu' }).click();
  assert(await m.locator('#pro-mobile-nav').getByRole('link', { name: 'Réservations' }).isVisible(), 'menu mobile de l\'espace organisateur');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
