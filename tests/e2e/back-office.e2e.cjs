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

  // Formulaire : validation
  await go('/admin/experiences/nouvelle');
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
  await page.locator('#f-bookingMode').selectOption('social_dinner');
  await page.locator('#f-groupMin').fill('7'); // incohérent volontairement (min > cible)
  await page.locator('#f-priceDh').fill('139');
  await page.locator('#f-costPerSeatDh').fill('75');
  await page.locator('[id="f-sessions.weeks"]').fill('4');
  await page.locator('[id="f-sessions.capacity"]').fill('24');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  assert(await page.getByText('Il faut min ≤ cible ≤ max.').isVisible(), 'règle de cohérence des tailles de groupe');
  await page.locator('#f-groupMin').fill('5');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  await page.waitForTimeout(400);
  assert(await page.getByText('Formulaire valide').isVisible(), 'formulaire valide : récapitulatif affiché');
  assert(await page.locator('#form-result li.list-disc').count() === 4, 'récurrence : 4 dates générées');
  assert(await page.locator('#form-result').textContent().then(t => t.includes('64 DH')), 'marge estimée par place (139 − 75 = 64 DH)');
  // 11g : une seule section « Prix, paiement et partenaire », sans double comptage
  assert(await page.locator('#f-economicsModel').count() === 0, 'sans partenaire : pas de commission possible, seulement nos coûts');
  assert((await page.getByTestId('preview-team').innerText()).includes('64 DH'), 'aperçu équipe en direct : marge 64 DH par place');
  await page.locator('#f-partnerId').selectOption({ index: 1 });
  await page.locator('#f-economicsModel').selectOption('commission');
  await page.locator('#f-commissionPercent').fill('15');
  assert(/Marge\s*20,85 DH/.test(await page.getByTestId('preview-team').innerText()), 'commission 15 % de 139 DH = 20,85 DH de marge');
  await page.locator('input[name=pricingModel][value=fixed_partner]').check();
  assert(await page.locator('#f-economicsModel').count() === 0 && await page.getByTestId('part-on-site').isVisible(), 'part sur place : bloc dédié, commission en ligne remplacée par nos coûts');
  await page.locator('#f-priceDh').fill('59');
  await page.locator('#f-partnerPriceDh').fill('80');
  await page.locator('#f-costPerSeatDh').fill('80');
  assert(await page.getByText(/ne nous coûte rien/).isVisible(), 'coût = prix sur place : avertissement de double comptage');
  await page.locator('#f-costPerSeatDh').fill('');
  await page.locator('#f-onSiteCommissionPercent').fill('10');
  const team = await page.getByTestId('preview-team').innerText();
  assert(/Marge\s*59 DH/.test(team) && team.includes('8 DH'), 'part sur place hors coûts : marge 59 DH + 8 DH de commission à facturer');
  assert((await page.getByTestId('preview-client').innerText()).includes('139 DH par personne'), 'aperçu client : 139 DH par personne');
  await page.getByRole('button', { name: 'Vérifier le formulaire' }).click();
  await page.waitForTimeout(400);
  assert(await page.getByText('Formulaire valide').isVisible(), 'part sur place sans coût saisi : formulaire valide');

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

  // Mobile : menu et débordement
  const m = await b.newContext({ ...devices['iPhone 13'] }); const mp = await m.newPage();
  mp.on('pageerror', e => errs.push('mobile: ' + e.message));
  for (const p of ['/admin', '/admin/experiences', '/admin/experiences/nouvelle', '/admin/sessions/ses-diner-inconnus-1', '/admin/sessions/ses-diner-inconnus-1/groupes', '/admin/reservations', '/admin/utilisateurs', '/admin/partenaires', '/admin/paiements', '/admin/promos', '/admin/statistiques', '/admin/parametres']) {
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
