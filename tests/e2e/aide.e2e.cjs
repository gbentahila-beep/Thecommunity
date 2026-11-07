// Centre d'aide et page « Devenir partenaire » (mode démo) : recherche, onglets, articles, langues, mobile.
const { chromium, devices } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const shot = async (page, name) => { if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.jpg`, quality: 80, fullPage: true }); };

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('dialog', (d) => { errs.push('dialog: ' + d.message()); d.dismiss(); });
  const noOverflow = async (label) => assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label} : pas de débordement horizontal`);

  // Accueil du centre d'aide
  await page.goto(`${base}/aide`);
  assert(await page.getByRole('heading', { level: 1, name: 'Comment pouvons-nous vous aider ?' }).isVisible(), 'titre du centre d\'aide');
  for (const c of ['Bien démarrer', 'Expériences et réservations', 'Abonnement', 'Mon compte', 'Sécurité']) {
    assert(await page.getByRole('heading', { level: 2, name: c, exact: true }).isVisible(), `catégorie « ${c} »`);
  }
  assert(await page.getByRole('link', { name: 'Membres' }).getAttribute('aria-current') === 'page', 'onglet Membres actif');
  await noOverflow('/aide');
  await shot(page, 'aide-1-accueil');

  // Recherche sans accents
  const search = page.getByRole('searchbox', { name: 'Rechercher dans le centre d\'aide' });
  await search.fill('allergie');
  assert(await page.getByRole('link', { name: /Régime alimentaire, allergies et langues/ }).isVisible(), 'recherche « allergie » → article régime / allergies');
  await search.fill('reserver place');
  assert(await page.getByRole('link', { name: /Réserver une place/ }).first().isVisible(), 'recherche sans accent « reserver place »');
  await search.fill('zzzz introuvable');
  assert(await page.getByText('Aucun résultat').isVisible(), 'recherche sans résultat annoncée');
  await page.getByRole('button', { name: 'Effacer la recherche' }).click();
  assert(await page.getByRole('heading', { level: 2, name: 'Abonnement', exact: true }).isVisible(), 'recherche effacée → catégories');

  // Article
  await page.getByRole('link', { name: /Annuler une réservation et être remboursé/ }).click();
  await page.waitForURL('**/aide/annuler-une-reservation');
  assert(await visible(page.getByRole('heading', { level: 1, name: 'Annuler une réservation et être remboursé' })), 'article ouvert');
  assert(await page.getByText(/Plus de 48 heures avant le début/).isVisible(), 'règle des 48 h');
  assert(await page.getByRole('link', { name: 'Mes réservations' }).first().isVisible(), 'lien interne vers Mes réservations');
  assert(await page.getByRole('heading', { name: 'Articles liés' }).isVisible(), 'articles liés');
  assert(await page.getByRole('button', { name: 'Oui' }).count() === 0, 'démo : pas de bouton « utile ? » factice');
  await noOverflow('article');
  await shot(page, 'aide-2-article');
  await page.getByRole('navigation', { name: 'Fil d\'Ariane' }).getByRole('link', { name: 'Expériences et réservations' }).click();
  await page.waitForURL('**/aide#bookings');

  // Onglet partenaires
  await page.goto(`${base}/aide/partenaires`);
  assert(await page.getByRole('heading', { level: 2, name: 'Devenir partenaire', exact: true }).isVisible() && await page.getByRole('heading', { level: 2, name: 'Accueillir un groupe' }).isVisible(), 'catégories partenaires');
  assert(await page.getByRole('link', { name: 'Partenaires' }).first().getAttribute('aria-current') === 'page', 'onglet Partenaires actif');
  await page.getByRole('link', { name: /Comment êtes-vous rémunéré/ }).click();
  await page.waitForURL('**/aide/remuneration-partenaire');
  assert(await visible(page.getByText(/Achat de prestation/)), 'article partenaire : modèles de rémunération');
  await page.locator('main a[href="/devenir-partenaire"]').first().click();
  await page.waitForURL('**/devenir-partenaire');
  assert(await visible(page.getByText('Démonstration : le formulaire de candidature fonctionne sur le site en ligne.')), 'page partenaire (démo : formulaire désactivé, annoncé)');
  await noOverflow('/devenir-partenaire');
  await shot(page, 'aide-3-partenaire');

  // Anglais et arabe
  await page.goto(`${base}/en/aide`);
  assert(await page.getByRole('heading', { level: 1, name: 'How can we help?' }).isVisible(), 'centre d\'aide en anglais');
  await page.getByRole('searchbox').fill('waiting');
  await page.getByRole('link', { name: /The waiting list/ }).click();
  await page.waitForURL('**/en/aide/liste-d-attente');
  assert(await visible(page.getByText(/have 4 hours to book/)), 'article en anglais');
  await page.goto(`${base}/ar/aide/liste-d-attente`);
  assert(await page.locator('html[dir=rtl]').count() === 1 && await page.getByText('لم تُترجم هذه المقالة إلى العربية بعد').isVisible(), 'arabe : interface RTL + mention de traduction à venir');
  await noOverflow('/ar/aide/liste-d-attente');

  // Accès depuis le pied de page et la FAQ
  await page.goto(`${base}/faq`);
  assert(await page.getByRole('link', { name: 'Plus de réponses dans le centre d\'aide' }).isVisible(), 'FAQ → centre d\'aide');
  assert(await page.locator('footer').getByRole('link', { name: 'Centre d\'aide' }).isVisible() && await page.locator('footer').getByRole('link', { name: 'Devenir partenaire' }).isVisible(), 'liens du pied de page');

  // Page inconnue
  const r = await page.goto(`${base}/aide/nexiste-pas`);
  assert(r.status() === 404, 'article inconnu → 404');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
