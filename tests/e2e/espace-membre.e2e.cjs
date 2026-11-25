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

  // 1. Inscription en questions (docs/16) : une question par écran, validation, brouillon, « Passer », fin.
  const progress = () => page.getByTestId('onboarding-progress').textContent();
  const cont = () => page.getByRole('button', { name: 'Continuer' }).click();
  await page.goto(base + '/bienvenue', { waitUntil: 'load' });
  await cont();
  assert(await page.getByText('Champ obligatoire.').count() >= 2, 'question 1 : prénom et nom obligatoires');
  await page.getByLabel('Prénom').fill('Rita');
  await page.getByLabel('Nom', { exact: true }).fill('Test');
  await cont();
  assert(await progress() === 'Question 2 sur 23', 'une question par écran (2 sur 23)');
  await page.getByLabel('Date de naissance').fill('2012-03-04');
  await cont();
  assert(await page.getByText('réservé aux 18 ans et plus').isVisible(), 'refus des moins de 18 ans');
  await page.getByLabel('Date de naissance').fill('1992-03-04');
  await cont();
  await page.getByRole('radio', { name: 'Femme' }).click();
  await page.waitForTimeout(500);
  assert(await progress() === 'Question 4 sur 23', 'un choix dans la liste passe à la question suivante');
  assert(await page.getByRole('radio', { name: /Rabat/ }).isDisabled() && await page.getByRole('radio', { name: /Rabat/ }).textContent().then((t) => t.includes('Bientôt')), 'villes à venir : « Bientôt »');
  await cont();
  await page.getByRole('button', { name: 'Passer' }).click();
  await cont();
  assert(await page.getByText('Choisissez au moins une option.').isVisible(), 'langues : au moins une');
  await page.getByRole('button', { name: 'Français' }).click();
  await cont();
  await page.getByRole('button', { name: 'Art', exact: true }).click();
  await cont();
  assert(await page.getByText('au moins 3 centres').isVisible(), 'au moins 3 centres d’intérêt exigés');
  // brouillon : recharger et retrouver la question
  await page.reload({ waitUntil: 'load' }).then(() => page.waitForTimeout(500));
  assert(await progress() === 'Question 7 sur 23', 'brouillon repris après rechargement');
  assert(await page.getByRole('button', { name: 'Art', exact: true }).getAttribute('aria-pressed') === 'true', 'choix conservés dans le brouillon');
  await page.getByRole('button', { name: 'Voir plus' }).click();
  for (const i of ['Musique', 'Padel']) await page.getByRole('button', { name: i, exact: true }).click();
  await cont();
  assert(await page.getByRole('heading', { name: 'Le saviez-vous ?' }).count() === 1 && await page.getByText('Jeffrey A. Hall').isVisible(), 'carte « Le saviez-vous ? » sourcée');
  await cont();
  await page.getByRole('button', { name: 'Rencontrer de nouvelles personnes' }).click();
  await cont();
  // Questions facultatives : on en saute la plupart ; le téléphone est vérifié.
  for (let i = 0; i < 30 && !(await page.getByTestId('onboarding-done').isVisible()); i++) {
    if (await page.locator('#f-phone').isVisible()) {
      await page.locator('#f-phone').fill('abc');
      await cont();
      assert(await page.getByText('Numéro invalide.').isVisible(), 'téléphone invalide refusé');
      await page.locator('#f-phone').fill('+212 6 61 23 45 67');
      await page.getByLabel("J'utilise WhatsApp sur ce numéro").check();
      await cont();
    } else if (await page.getByRole('button', { name: 'Passer' }).isVisible()) await page.getByRole('button', { name: 'Passer' }).click();
    else await cont();
    await page.waitForTimeout(150);
  }
  assert(await page.getByTestId('onboarding-done').getByText("c'est prêt.").isVisible(), 'carte finale « c’est prêt »');
  await page.getByRole('link', { name: 'Mon tableau de bord' }).click();
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

  // 5j : ordre des favoris — date à venir (la plus proche d'abord), puis sans date
  await page.evaluate(() => localStorage.setItem('tc:favorites', JSON.stringify(['exp-diner-inconnus', 'exp-pilates-brunch', 'exp-escape-game', 'exp-ceramique', 'exp-rooftop', 'exp-brunch-inconnus', 'exp-yoga-sunrise', 'exp-quiz', 'exp-cuisine'])));
  await page.goto(base + '/espace/historique', { waitUntil: 'load' });
  await page.getByText(/Prochaine date|Prochaines dates bientôt/).first().waitFor();
  const metas = await page.locator('li').filter({ has: page.getByRole('button', { name: 'Retirer des favoris' }) }).evaluateAll((lis) => lis.map((li) => (li.innerText.match(/Prochaine date : .*|Prochaines dates bientôt/) || [''])[0]));
  const firstNoDate = metas.findIndex((m) => m.startsWith('Prochaines dates'));
  assert(metas.length >= 2 && metas.every((m) => m) && (firstNoDate === -1 || metas.slice(firstNoDate).every((m) => m.startsWith('Prochaines dates'))), `favoris : avec date d'abord, puis sans date (${metas.length})`);
  await page.evaluate(() => localStorage.setItem('tc:favorites', '[]'));

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
  assert(await page.getByText(/(remboursé(·e)? de|remboursons) 35/).isVisible() || await page.getByText(/plus remboursée/).isVisible(), 'montant de remboursement affiché');

  // Groupe révélé
  await page.goto(base + '/espace/reservations/res-demo-escape', { waitUntil: 'load' });
  assert(await page.getByText('Équipe B').isVisible() && await page.getByText('Karim').isVisible(), 'groupe révélé avec prénoms');
  assert(!(await page.content()).includes('u-karim@'), 'aucune donnée de contact des autres membres');

  // Export des données
  await page.goto(base + '/espace/preferences', { waitUntil: 'load' });
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Télécharger mes données/ }).click()]);
  const json = JSON.parse(fs.readFileSync(await dl2.path(), 'utf8'));
  assert(json.profile.firstName === 'Salma' && json.reservations.length === 8, 'export JSON des données');
  const sw = page.getByRole('switch').nth(2);
  await sw.check({ force: true });
  await page.reload({ waitUntil: 'load' }).then(() => page.waitForTimeout(500));
  assert(await page.getByRole('switch').nth(2).isChecked(), 'préférence conservée après rechargement');

  // Onglets réservations
  await page.goto(base + '/espace/reservations?onglet=annulees', { waitUntil: 'load' });
  assert(await page.getByText('Remboursée').isVisible(), 'onglet annulées');

  // docs/22, décision 30 : « Proposer une sortie » supprimé (redirection vers l'espace).
  await page.goto(base + '/espace/proposer', { waitUntil: 'load' });
  assert(/\/espace$/.test(new URL(page.url()).pathname), 'J : « Proposer une sortie » supprimé');

  // Étape H : billet des Tables, heure de révélation, déplacer sa réservation, table et messages après la rencontre, page du lieu
  await page.goto(base + '/reserver/ses-diner-inconnus-1', { waitUntil: 'load' });
  assert(await page.getByTestId('tables-ticket').count() === 0 && await page.getByText(/Lieu révélé 5 h avant/).isVisible(), 'T : réservation Tables sans carte billet, lieu révélé 5 h avant');
  assert(/Sur place/.test(await page.getByTestId('on-site').innerText()), 'T : « Sur place » dit une seule fois');
  await page.goto(base + '/espace/reservations/res-demo-diner', { waitUntil: 'load' });
  assert(/Le lieu arrive le/.test(await page.getByTestId('venue-arrives').innerText()), 'réservation : heure exacte de révélation du lieu');
  await page.getByTestId('move-reservation').getByRole('button', { name: 'Déplacer sur une autre date' }).click();
  assert(await page.getByTestId('move-reservation').getByLabel('Nouvelle date').locator('option').count() >= 1, 'déplacer : autres dates proposées');
  await page.goto(base + '/espace/reservations/res-demo-escape', { waitUntil: 'load' });
  assert(/Karim/.test(await page.getByTestId('my-table').innerText()), 'après la rencontre : la table avec les prénoms');
  // Étape Z : lieu révélé (carte du lieu), jour J (je suis là, retard), après l'arrivée (table, statuts, chat)
  await page.goto(base + '/espace/reservations/res-demo-brunch', { waitUntil: 'load' });
  assert(/La Sqala/.test(await page.getByTestId('venue-card').innerText()) && /Itinéraire/.test(await page.getByTestId('venue-card').innerText()), 'Z : carte du lieu révélé avec itinéraire');
  await page.goto(base + '/espace/reservations/res-demo-today', { waitUntil: 'load' });
  assert(await page.getByTestId('check-in-here').isVisible() && await page.getByTestId('late-open').isVisible(), 'Z : jour J, « Je suis là » et « Je serai en retard »');
  await page.getByTestId('late-open').click();
  await page.getByRole('button', { name: '20 min' }).click();
  assert(/Retard annoncé : 20 min/.test(await page.getByTestId('late-done').innerText()), 'Z : retard annoncé');
  await page.goto(base + '/espace/reservations/res-demo-now', { waitUntil: 'load' });
  assert(/En retard \(20 min\)/.test(await page.getByTestId('day-of-table').innerText()) && /Check-in fait/.test(await page.getByTestId('day-of-table').innerText()), 'Z : à la table, arrivés et retards');
  await page.getByTestId('day-of-chat').click();
  await page.waitForURL('**/espace/rencontres/table/grp-demo-now');
  assert(await page.getByTestId('chat-members').getByRole('listitem').count() === 6, 'Z : chat ouvert dès l’arrivée, avec la table');
  await page.goto(base + '/espace/reservations/res-demo-escape', { waitUntil: 'load' });
  await page.getByRole('link', { name: 'Écrire à ma table' }).click();
  await page.waitForURL('**/espace/rencontres/table/**');
  assert(await page.getByTestId('table-chat').getByRole('listitem').count() >= 1, 'messages de la table après la rencontre');
  await page.goto(base + '/partenaire/demande/demo', { waitUntil: 'load' });
  assert(await page.getByTestId('partner-response').getByRole('button', { name: 'Accepter' }).isVisible(), 'page du lieu : accepter ou refuser la demande');

  // Étape I : Carnet et Pass
  await page.goto(base + '/abonnement', { waitUntil: 'load' });
  assert(await page.getByTestId('membership-offer').count() === 3, 'Carnet et Pass : Carnet, Pass 1 mois, Pass 6 mois');
  assert(/Recommandé/.test(await page.getByTestId('membership-offer').nth(2).innerText()) && /449/.test(await page.getByTestId('membership-offer').nth(2).innerText()), 'Pass 6 mois mis en avant, 449 DH');
  await page.getByTestId('more-offers').click();
  assert(await page.getByTestId('membership-offer').count() === 6, 'autres durées : semaine, 3 mois, 1 an');
  assert(/incluse/.test(await page.getByTestId('pass-benefits').innerText()), 'avantages du pass : place incluse');
  await page.goto(base + '/espace/compte', { waitUntil: 'load' });
  assert(/2 crédits/.test(await page.getByTestId('account-hub').innerText()), 'Mon profil : crédits du carnet');

  // Arabe
  await page.goto(base + '/ar/espace', { waitUntil: 'load' });
  assert(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'espace en arabe RTL');
  for (const p of ['/espace', '/espace/reservations/res-demo-diner', '/bienvenue', '/ar/espace/profil', '/reserver/ses-diner-inconnus-1', '/partenaire/demande/demo', '/ar/espace/reservations/res-demo-diner', '/abonnement', '/ar/abonnement']) {
    await page.goto(base + p, { waitUntil: 'load' });
    assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'pas de débordement : ' + p);
  }
  console.log(errs.length ? 'ERREURS NAVIGATEUR:\n' + errs.join('\n') : 'aucune erreur navigateur');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
