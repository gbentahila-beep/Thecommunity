// Test de bout en bout de l'espace membre (phase 2b, données de démonstration).
// Usage : lancer le site (npm run build && npx next start -p 3100 dans apps/web), puis
//   node tests/e2e/espace-membre.e2e.cjs
// Sera migré vers @playwright/test en phase 3.
const { chromium, devices } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
(async () => {
  const b = await chromium.launch();
  const base = process.env.BASE_URL ?? 'http://localhost:3100';
  const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  // 1. Questionnaire : validation
  await page.goto(base + '/bienvenue', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Continuer' }).click();
  assert(await page.getByText('Champ obligatoire.').count() >= 2, 'étape 1 : champs obligatoires signalés');
  await page.getByLabel('Prénom').fill('Rita');
  await page.getByLabel('Nom', { exact: true }).fill('Test');
  await page.getByLabel('Date de naissance').fill('2012-03-04');
  await page.getByRole('button', { name: 'Continuer' }).click();
  assert(await page.getByText('réservé aux 18 ans et plus').isVisible(), 'refus des moins de 18 ans');
  await page.getByLabel('Date de naissance').fill('1992-03-04');
  await page.getByLabel('Téléphone (facultatif)').fill('abc');
  await page.getByRole('button', { name: 'Continuer' }).click();
  assert(await page.getByText('Numéro invalide.').isVisible(), 'téléphone invalide refusé');
  await page.getByLabel('Téléphone (facultatif)').fill('+212 6 61 23 45 67');
  await page.getByRole('button', { name: 'Femme' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  assert(await page.getByText('Étape 2 sur 4').isVisible(), 'passage à l’étape 2');

  // 2. Intérêts : minimum 3
  await page.getByRole('button', { name: 'Français' }).click();
  await page.getByRole('button', { name: 'Art' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  assert(await page.getByText('au moins 3 centres').isVisible(), 'au moins 3 centres d’intérêt exigés');
  // brouillon : recharger et retrouver l'étape
  await page.reload({ waitUntil: 'load' }).then(() => page.waitForTimeout(500));
  assert(await page.getByText('Étape 2 sur 4').isVisible(), 'brouillon repris après rechargement');
  assert(await page.getByRole('button', { name: 'Art' }).getAttribute('aria-pressed') === 'true', 'choix conservés dans le brouillon');
  await page.getByRole('button', { name: 'Musique' }).click();
  await page.getByRole('button', { name: 'Voyage' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // 3. Envies
  await page.getByRole('button', { name: 'Continuer' }).click();
  assert(await page.getByText('Choisissez au moins une option.').isVisible(), 'étape 3 : au moins une envie');
  await page.getByRole('button', { name: 'Rencontrer de nouvelles personnes' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // 4. Fin
  assert(await page.getByText('Étape 4 sur 4').isVisible(), 'étape 4 atteinte');
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.waitForURL('**/espace');
  assert(await page.getByRole('heading', { name: /Bonjour/ }).isVisible(), 'arrivée sur le tableau de bord');

  // Retour arrière depuis l'étape 2
  await page.goto(base + '/bienvenue?edition=1', { waitUntil: 'load' }); await page.waitForTimeout(500);
  assert(await page.getByLabel('Prénom').inputValue() === 'Salma', 'mode édition pré-rempli avec le profil');

  // Favoris -> historique
  await page.goto(base + '/experiences/atelier-ceramique-cil', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Ajouter aux favoris' }).first().click();
  await page.goto(base + '/espace/historique', { waitUntil: 'load' });
  assert(await page.getByRole('link', { name: /Atelier céramique/ }).count() >= 1, 'favori visible dans l’historique');
  await page.getByRole('button', { name: 'Retirer des favoris' }).click();
  assert(await page.getByText('Touchez le cœur').isVisible(), 'favori retiré');

  // Notifications
  await page.goto(base + '/espace/notifications', { waitUntil: 'load' });
  const before = await page.getByLabel('Non lue').count();
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
  assert(before === 2 && await page.getByLabel('Non lue').count() === 0, 'tout marquer comme lu');

  // Réservation à venir : agenda + remboursement
  await page.goto(base + '/espace/reservations/res-demo-pilates', { waitUntil: 'load' });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Ajouter à mon agenda' }).click()]);
  const fs = require('fs'); const ics = fs.readFileSync(await dl.path(), 'utf8');
  assert(ics.includes('BEGIN:VEVENT') && ics.includes('Pilates'), 'fichier agenda .ics valide');
  assert(await page.getByText(/remboursé de 149/).isVisible() || await page.getByText(/plus remboursée/).isVisible(), 'montant de remboursement affiché');

  // Groupe révélé
  await page.goto(base + '/espace/reservations/res-demo-escape', { waitUntil: 'load' });
  assert(await page.getByText('Équipe B').isVisible() && await page.getByText('Karim').isVisible(), 'groupe révélé avec prénoms');
  assert(!(await page.content()).includes('u-karim@'), 'aucune donnée de contact des autres membres');

  // Export des données
  await page.goto(base + '/espace/preferences', { waitUntil: 'load' });
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Télécharger mes données/ }).click()]);
  const json = JSON.parse(fs.readFileSync(await dl2.path(), 'utf8'));
  assert(json.profile.firstName === 'Salma' && json.reservations.length === 5, 'export JSON des données');
  const sw = page.getByRole('switch').nth(2);
  await sw.check({ force: true });
  await page.reload({ waitUntil: 'load' }).then(() => page.waitForTimeout(500));
  assert(await page.getByRole('switch').nth(2).isChecked(), 'préférence conservée après rechargement');

  // Onglets réservations
  await page.goto(base + '/espace/reservations?onglet=annulees', { waitUntil: 'load' });
  assert(await page.getByText('Remboursée').isVisible(), 'onglet annulées');

  // Arabe
  await page.goto(base + '/ar/espace', { waitUntil: 'load' });
  assert(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'espace en arabe RTL');
  for (const p of ['/espace', '/espace/reservations/res-demo-diner', '/bienvenue', '/ar/espace/profil']) {
    await page.goto(base + p, { waitUntil: 'load' });
    assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'pas de débordement : ' + p);
  }
  console.log(errs.length ? 'ERREURS NAVIGATEUR:\n' + errs.join('\n') : 'aucune erreur navigateur');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
