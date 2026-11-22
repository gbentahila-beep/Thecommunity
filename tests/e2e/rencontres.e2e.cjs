// Étapes 28 à 32 (démonstration) : « venir seul·e » mis en avant, prix membre discret, textes de paiement cohérents,
// parcours en 5 étapes ; fiches « Qui allez-vous rencontrer ? » ; « Mes rencontres » ; profil enrichi ; navigation.
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

  // ——— 28 ———
  await p.goto(base + '/', { waitUntil: 'load' });
  assert(await p.getByRole('heading', { level: 1 }).textContent() === 'Your peopleare out there.', '28 : accroche inchangée');
  const trust = p.getByTestId('home-trust');
  assert(await trust.getByText('Venez seul·e : tout le monde est là pour rencontrer du monde').isVisible(), '28 : repère « venez seul·e »');
  assert(await trust.getByText('Nous composons les groupes pour faciliter les échanges').isVisible(), '28 : repère « groupes composés »');
  const order = await p.evaluate(() => { const t = document.querySelector('[data-testid=home-trust]'); const h = [...document.querySelectorAll('h2')].find((x) => x.textContent.startsWith('Cette semaine')); return t && h ? t.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING : 0; });
  assert(order > 0, '28 : repères avant « Cette semaine »');
  await p.goto(base + '/experiences/padel-entre-inconnus-anfa', { waitUntil: 'load' });
  assert(await p.locator('aside').getByText('150 DH').first().isVisible() && await p.locator('aside').getByTestId('member-price').count() === 0, 'docs/22 : un seul prix affiché, plus de prix membre');
  assert(!(await p.locator('s').count()) && !(await p.getByRole('link', { name: 'Devenir membre' }).count()), '28 : ni prix barré ni « Devenir membre » sur une expérience ouverte à tous');
  assert(await p.getByRole('link', { name: 'Rejoindre cette expérience' }).first().isVisible(), '28 : bouton « Rejoindre cette expérience »');
  await p.goto(base + '/a-propos', { waitUntil: 'load' });
  assert(!(await p.getByText('bientôt par carte').count()), '28 : plus de « bientôt par carte » dans À propos');
  await p.goto(base + '/aide/payer-ma-reservation', { waitUntil: 'load' });
  const art = (await p.locator('article').textContent());
  assert(!art.includes('[[') && !art.includes('(bientôt)') && art.includes("n'est pas encore ouvert"), '28 : aide « Payer » selon le moyen ouvert (démo : aucun)');
  await p.goto(base + '/comment-ca-marche', { waitUntil: 'load' });
  assert(await p.getByTestId('booking-steps').locator('li').count() === 5, '28 : parcours en 5 étapes');
  await p.goto(base + '/espace', { waitUntil: 'load' });
  assert(await visible(p.getByTestId('membership-suggestion')), '28 : abonnement proposé après une première expérience (espace membre)');

  // ——— 29 ———
  await p.goto(base + '/experiences/diner-entre-inconnus-casablanca', { waitUntil: 'load' });
  const meet = p.getByTestId('meeting');
  assert(await meet.getByRole('heading', { name: 'Qui allez-vous rencontrer ?' }).isVisible(), '29 : section « Qui allez-vous rencontrer ? »');
  const mt = await meet.textContent();
  assert(mt.includes("Vous pouvez venir seul·e") && /Petits groupes de \d+ à \d+ personnes/.test(mt) && mt.includes('Groupe mixte') && mt.includes('Pensé pour les 25 à 40 ans'), '29 : venir seul·e, taille des groupes, public, âge visé');
  assert(mt.includes('Nous évitons de vous replacer avec les mêmes personnes'), '29 : nouvelles rencontres à chaque fois');
  const crowd = await p.getByTestId('meeting-crowd').textContent().catch(() => '');
  assert(/Déjà \d+ inscrits à la prochaine date · de \d+ à \d+ ans environ/.test(crowd), `29 : chiffres globaux sur les inscrits (${crowd})`);
  assert(!/\b(19|20)\d\d-\d\d-\d\d\b/.test(await p.locator('main').textContent()), '29 : aucune date de naissance affichée');
  await p.goto(base + '/experiences/degustation-the-patisseries-maarif', { waitUntil: 'load' });
  assert(await p.getByTestId('meeting').getByText('Réservé aux femmes').isVisible(), '29 : fiche « Réservé aux femmes »');
  await p.goto(base + '/experiences?public=femmes', { waitUntil: 'load' });
  const cards = p.getByTestId('catalog-results').locator('article');
  assert(await cards.count() >= 1 && await cards.count() === await p.getByTestId('catalog-results').getByTestId('card-women').count(), '29 : filtre « Réservé aux femmes »');
  assert(await p.getByTestId('active-filters').getByRole('link', { name: 'Retirer le filtre : Réservé aux femmes' }).isVisible(), '29 : puce du filtre');
  await p.goto(base + '/admin/experiences/exp-the-patisseries', { waitUntil: 'load' });
  await p.getByTestId('advanced-options').locator('summary').click();
  assert(await p.getByLabel('Réservé aux femmes').isChecked() && await p.locator('#f-targetAgeMin').inputValue() === '25', '29 : formulaire — réservé aux femmes (case) et tranche d\'âge visée');

  // ——— 31 ———
  await p.goto(base + '/espace', { waitUntil: 'load' });
  assert(await p.locator('[data-mobile-tab-bar] a[href="/espace/rencontres"]').count() > 0, '31 : « Mon groupe » dans la barre du bas');
  await p.goto(base + '/espace/rencontres', { waitUntil: 'load' });
  assert(await p.getByRole('heading', { level: 1, name: 'Mon groupe' }).isVisible(), '31 : page « Mon groupe »');
  const contact = p.getByTestId('meet-contact').filter({ hasText: 'Lina' });
  assert(await contact.isVisible(), '31 : contact réciproque (Lina)');
  await contact.getByRole('button', { name: 'Inviter Lina à une expérience' }).click();
  await contact.getByRole('button', { name: "Envoyer l'invitation" }).click();
  assert(await visible(contact.getByRole('alert').filter({ hasText: 'Choisissez une date' })), '31 : invitation sans date refusée');
  await contact.locator('select').selectOption({ index: 1 });
  await contact.getByRole('button', { name: "Envoyer l'invitation" }).click();
  assert(await visible(contact.getByRole('status').filter({ hasText: 'Démonstration' })), '31 : invitation (démonstration)');
  const group = p.getByTestId('meet-group').first();
  assert(await group.getByTestId('meet-member').count() === 5, '31 : les 5 autres membres du groupe');
  assert(await group.getByTestId('meet-member').filter({ hasText: 'Lina' }).getByTestId('meet-matched').isVisible(), '31 : « C\'est réciproque » pour Lina');
  const omar = group.getByTestId('meet-member').filter({ hasText: 'Omar' });
  assert(await omar.getByRole('button', { name: /Vous aimeriez revoir Omar/ }).getAttribute('aria-pressed') === 'true', '31 : souhait privé déjà exprimé (Omar)');
  const karim = group.getByTestId('meet-member').filter({ hasText: 'Karim' });
  await karim.getByRole('button', { name: "J'aimerais revoir Karim" }).click();
  assert(await visible(karim.getByRole('status').filter({ hasText: 'Démonstration' })) && await karim.getByRole('button', { name: /Vous aimeriez revoir Karim/ }).getAttribute('aria-pressed') === 'true', '31 : « J\'aimerais revoir » (démonstration)');
  const yassine = group.getByTestId('meet-member').filter({ hasText: 'Yassine' });
  await yassine.getByRole('button', { name: 'Ne plus être réuni·e avec Yassine' }).click();
  await yassine.getByRole('button', { name: 'Confirmer' }).click();
  assert(await visible(yassine.getByTestId('meet-avoided')), '31 : « Ne plus être réuni·e » avec confirmation');
  await group.getByRole('link', { name: 'Proposer une sortie à ce groupe' }).click();
  await p.waitForURL(/\/espace\/proposer\?groupe=/);
  assert(await visible(p.getByTestId('proposal-for-group')), '31 : proposer une sortie à l\'ancien groupe (membre de confiance)');

  // ——— 30 ———
  await p.goto(base + '/espace/profil', { waitUntil: 'load' });
  const prof = await p.locator('main').textContent();
  assert(prof.includes('Maârif') && prof.includes('Tables') && prof.includes('Débutant·e') && prof.includes("Peu importe l'âge"), '30 : profil — quartier, univers préférés, niveau, âge');
  await p.goto(base + '/bienvenue?edition=1&etape=district', { waitUntil: 'load' });
  assert(await visible(p.locator('#f-district')) && await p.locator('#f-district').inputValue() === 'Maârif', '30 : questionnaire — quartier pré-rempli (ouvert depuis le profil)');
  await p.goto(base + '/bienvenue?edition=1&etape=sport', { waitUntil: 'load' });
  assert(await p.getByRole('radio', { name: 'Débutant·e' }).getAttribute('aria-checked') === 'true', '30 : questionnaire — niveau sportif');
  await p.goto(base + '/bienvenue?edition=1&etape=age', { waitUntil: 'load' });
  assert(await p.getByRole('radio', { name: 'Des personnes de mon âge (si possible)' }).isVisible(), '30 : questionnaire — préférence d\'âge');
  await p.goto(base + '/espace', { waitUntil: 'load' });
  const reco = p.locator('section[aria-labelledby=reco-title] [data-testid=compact-row]');
  assert(await reco.count() > 0, '30 : suggestions de l\'espace membre');

  // ——— 32 ———
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  m.on('pageerror', (e) => errs.push(e.message));
  globalThis.__page = m;
  await m.goto(base + '/', { waitUntil: 'load' });
  const bar = m.getByRole('navigation', { name: 'Navigation mobile' });
  assert(JSON.stringify(await bar.getByRole('link').allTextContents()) === JSON.stringify(['Accueil', 'Découvrir', 'Mon groupe', 'Réservations', 'Menu']), 'barre du bas : Accueil · Découvrir · Mon groupe · Réservations · Menu');
  await bar.getByRole('link', { name: 'Découvrir' }).click();
  await m.waitForURL('**/experiences');
  assert(await bar.getByRole('link', { name: 'Découvrir' }).getAttribute('aria-current') === 'page', 'Découvrir → toutes les expériences');
  await bar.getByRole('link', { name: 'Menu' }).click();
  await m.waitForURL('**/menu');
  assert(await m.getByRole('heading', { level: 1, name: 'Menu' }).isVisible() && await m.getByRole('main').getByRole('link', { name: /Centre d'aide/ }).first().isVisible(), 'Menu : page avec le centre d\'aide');
  assert(await m.getByRole('link', { name: 'Se connecter' }).first().isVisible(), 'Menu : se connecter (non connecté·e)');
  await bar.getByRole('link', { name: 'Accueil' }).click();
  await m.waitForURL((u) => u.pathname === '/');
  assert(!(await m.locator('[data-testid=header-bell]:visible').count()), '32 : téléphone non connecté — pas de cloche (le bouton « S\'inscrire » reste visible)');
  await bar.getByRole('link', { name: 'Mon groupe' }).click();
  await m.waitForURL('**/espace/rencontres');
  assert(await bar.getByRole('link', { name: 'Mon groupe' }).getAttribute('aria-current') === 'page', '32 : onglet actif');
  assert(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '32 : pas de défilement horizontal (Mon groupe, téléphone)');
  await p.goto(base + '/', { waitUntil: 'load' });
  const bell = p.locator('[data-testid=header-bell]:visible');
  assert(await bell.count() === 1 && await bell.getAttribute('href') === '/espace/notifications', '32 : cloche des notifications dans l\'en-tête (ordinateur, démonstration)');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
