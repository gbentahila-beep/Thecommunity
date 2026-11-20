// Étape 24 (démonstration) : réponse de l'organisateur sous l'avis, signalement, espace organisateur « Avis »
// (note globale, répondre), back-office « Avis » (filtres signalés / photos, photo privée, décisions, historique).
// Prérequis : site de démonstration lancé (npx next start -p 3100).
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 10000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  globalThis.__page = p;

  // 1. Fiche : réponse de l'organisateur, signalement
  await p.goto(base + '/experiences/padel-entre-inconnus-anfa', { waitUntil: 'load' });
  const omar = p.getByTestId('review-item').filter({ hasText: 'Omar K.' });
  assert(await visible(omar.getByTestId('review-reply').getByText('Réponse de Club Padel Anfa')), 'fiche : réponse de l\'organisateur sous l\'avis');
  const leila = p.getByTestId('review-item').filter({ hasText: 'Leïla S.' });
  assert(!(await leila.getByTestId('review-reply').count()), 'fiche : pas de réponse inventée');
  await leila.getByRole('button', { name: 'Signaler' }).click();
  await leila.getByLabel('Motif').selectOption('other');
  await leila.getByRole('button', { name: 'Envoyer le signalement' }).click();
  assert(await visible(leila.getByRole('alert').filter({ hasText: '5 caractères' })), 'signalement « Autre » sans explication refusé');
  await leila.getByLabel(/Précisions/).fill('Avis publié deux fois.');
  await leila.getByRole('button', { name: 'Envoyer le signalement' }).click();
  assert(await visible(leila.getByRole('status').filter({ hasText: 'Démonstration' })), 'signalement : démonstration, rien n\'est envoyé');
  await p.goto(base + '/organisateurs/club-padel-anfa', { waitUntil: 'load' });
  assert(await visible(p.getByTestId('review-reply').filter({ hasText: 'Merci Omar' })), 'page organisateur : réponse visible');

  // 2. Espace organisateur → Avis
  await p.goto(base + '/pro/avis', { waitUntil: 'load' });
  assert(await p.locator('a[href="/pro/avis"]:visible').count() > 0, 'menu /pro : « Avis »');
  assert(/sur 5 · \d+ avis/.test(await p.getByTestId('pro-rating').textContent()), 'note globale de l\'organisateur');
  const pr = p.getByTestId('pro-review').filter({ hasText: 'Omar K.' });
  assert(await pr.getByTestId('pro-review-reply').isVisible(), '/pro : réponse affichée');
  await pr.getByRole('button', { name: 'Modifier la réponse' }).click();
  assert((await pr.locator('textarea').inputValue()).startsWith('Merci Omar'), '/pro : réponse pré-remplie');
  await pr.getByRole('button', { name: 'Publier la réponse' }).click();
  assert(await visible(pr.getByRole('status').filter({ hasText: 'Démonstration' })), '/pro : démonstration, rien n\'est enregistré');
  const lr = p.getByTestId('pro-review').filter({ hasText: 'Leïla S.' });
  await lr.getByRole('button', { name: 'Répondre' }).click();
  await lr.locator('textarea').fill('x');
  await lr.getByRole('button', { name: 'Publier la réponse' }).click();
  assert(await visible(lr.getByRole('alert').filter({ hasText: 'trop courte' })), '/pro : réponse trop courte refusée');

  // 3. Back-office → Avis
  await p.goto(base + '/admin/avis', { waitUntil: 'load' });
  const nav = p.getByRole('navigation', { name: 'Filtrer les avis' });
  assert(await nav.getByRole('link', { name: 'Signalés (1)' }).isVisible() && await nav.getByRole('link', { name: 'Photos à vérifier (1)' }).isVisible(), 'back-office : filtres avec compteurs');
  await nav.getByRole('link', { name: 'Signalés (1)' }).click();
  await p.waitForURL('**/admin/avis?vue=signales');
  assert(await p.getByTestId('admin-review').count() === 1, 'filtre « Signalés » : 1 avis');
  const panel = p.getByTestId('review-panel').first();
  assert(await panel.getByText("Faux ou sans rapport avec l'activité").first().isVisible(), 'signalement : motif et précision');
  assert(await panel.getByRole('list', { name: 'Historique de modération' }).getByText('Signalé').isVisible(), 'historique de modération');
  await panel.getByRole('button', { name: "Garder l'avis" }).click();
  assert(await visible(panel.getByRole('status').filter({ hasText: 'Démonstration' })), 'garder l\'avis : démonstration');
  await p.goto(base + '/admin/avis?vue=photos', { waitUntil: 'load' });
  const ph = p.getByTestId('review-panel').first();
  assert(await visible(ph.getByTestId('pending-photo')), 'photo à vérifier affichée');
  await ph.getByRole('button', { name: 'Refuser la photo' }).click();
  assert(await visible(ph.getByRole('alert').filter({ hasText: 'pourquoi' })), 'refus de photo sans motif refusé');
  await ph.getByRole('button', { name: 'Publier la photo' }).click();
  assert(await visible(ph.getByRole('status').filter({ hasText: 'Démonstration' })), 'publier la photo : démonstration');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
