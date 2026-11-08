// Refonte du 8 novembre (mode démo) : accueil (8a), menu « Découvrir » (8b), blog (8c).
const { chromium, devices } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p) => { p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('dialog: ' + d.message()); d.dismiss(); }); };
  const noOverflow = async (p, label) => assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label} : pas de débordement horizontal`);

  // ——— Bureau ———
  const desk = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const d = await desk.newPage(); watch(d);
  await d.goto(`${base}/`);
  assert(await d.getByRole('heading', { level: 1, name: /Your people\s*are out there\./ }).isVisible(), 'accroche « Your people are out there. »');
  assert(await d.getByText('Sortez de votre routine. Rencontrez de nouvelles personnes. Dites oui à quelque chose de différent.').isVisible(), 'sous-titre de l\'accroche');

  // Menu Découvrir
  const header = d.locator('header');
  for (const l of ['À propos', 'Comment ça marche', 'Blog']) assert(await header.getByRole('link', { name: l, exact: true }).isVisible(), `menu : ${l}`);
  const discover = header.getByRole('button', { name: 'Découvrir' });
  assert(await discover.getAttribute('aria-expanded') === 'false', 'Découvrir fermé au départ');
  await discover.focus();
  await d.keyboard.press('ArrowDown');
  const menu = d.getByRole('navigation', { name: /univers/i });
  assert(await visible(menu), 'Découvrir ouvert au clavier');
  for (const l of ['Dîners & gastronomie', 'Sport & bien-être', 'Jeux', 'Ateliers', 'Sorties']) assert(await menu.getByRole('link', { name: l }).isVisible(), `menu Découvrir : ${l}`);
  await d.keyboard.press('Escape');
  assert(await discover.getAttribute('aria-expanded') === 'false', 'Échap referme le menu');
  await discover.hover();
  await menu.getByRole('link', { name: 'Jeux' }).click();
  await d.waitForURL('**/casablanca/play');
  assert(true, 'Découvrir → Jeux ouvre l\'univers');

  // Sections de l'accueil
  await d.goto(`${base}/`);
  const how = d.locator('section', { has: d.getByRole('heading', { name: 'Comment ça marche', exact: true }) });
  assert(await how.getByRole('link', { name: /Découvrir les expériences/ }).getAttribute('href') === '/experiences', 'carte 2 : bouton vers les expériences');
  assert(await how.locator('img').count() === 3, 'carte 3 : trois photos');
  const uni = d.locator('section[aria-labelledby="universes-title"]');
  assert(await uni.locator('li').count() === 5, 'cinq univers');
  const boxes = await uni.locator('li').evaluateAll((lis) => lis.map((li) => { const img = li.querySelector('img').getBoundingClientRect(); const h = li.querySelector('h3').getBoundingClientRect(); return img.left > h.left; }));
  assert(boxes.every((right, i) => right === (i % 2 === 0)), 'univers en alternance photo à droite / à gauche');
  assert(await d.getByRole('heading', { level: 2, name: 'Pourquoi venir' }).isVisible(), 'section « Pourquoi venir »');
  assert(await d.getByRole('heading', { name: 'Questions fréquentes' }).isVisible(), 'FAQ sur l\'accueil');
  assert(await d.getByRole('link', { name: /Consulter le centre d'aide/ }).getAttribute('href') === '/aide', 'renvoi vers le centre d\'aide');

  // Blog
  await header.getByRole('link', { name: 'Blog', exact: true }).click();
  await d.waitForURL('**/blog');
  assert(await d.getByRole('heading', { level: 1, name: 'Inconnus aujourd\'hui, amis demain' }).isVisible(), 'titre du blog');
  const tabs = d.getByRole('navigation', { name: 'Thèmes du blog' });
  for (const l of ['Tous les articles', 'City guide', 'Conversation', 'Amitié', 'Comment fonctionne The Host Club']) assert(await tabs.getByRole('link', { name: l }).isVisible(), `onglet ${l}`);
  assert(await tabs.getByRole('link', { name: 'Tous les articles' }).getAttribute('aria-current') === 'page', 'onglet Tous actif');
  assert(await d.locator('main article').count() === 19, '19 articles listés');
  await tabs.getByRole('link', { name: 'City guide' }).click();
  await d.waitForURL('**/blog/theme/city-guide');
  assert(await d.locator('main article').count() === 3, 'City guide : 3 articles');
  assert(await d.getByRole('heading', { name: 'Questions fréquentes' }).isVisible(), 'City guide : FAQ en bas');
  await d.getByText('Faut-il parler arabe pour rencontrer du monde ?').click();
  assert(await d.getByText(/français, la darija/).isVisible(), 'FAQ City guide dépliable');
  await tabs.getByRole('link', { name: 'Comment fonctionne The Host Club' }).click();
  await d.waitForURL('**/blog/theme/the-host-club');
  assert(await d.locator('main article').count() === 7, 'The Host Club : 7 articles');
  await d.getByRole('link', { name: 'Réserver sa première expérience, étape par étape' }).click();
  await d.waitForURL('**/blog/reserver-sa-premiere-experience');
  assert(await d.getByRole('heading', { level: 1, name: 'Réserver sa première expérience, étape par étape' }).isVisible(), 'page article');
  assert(await d.locator('main ol li').count() >= 8, 'article : étapes numérotées');
  assert(await d.getByRole('heading', { name: 'À lire aussi' }).isVisible() && await d.locator('section[aria-labelledby="related"] article').count() === 3, 'trois articles liés');
  const ld = JSON.parse(await d.locator('script[type="application/ld+json"]').first().textContent());
  assert(ld['@type'] === 'BlogPosting' && ld.headline.startsWith('Réserver'), 'données structurées BlogPosting');
  assert(/\/blog\/reserver-sa-premiere-experience$/.test(await d.locator('link[rel="canonical"]').getAttribute('href')), 'URL canonique');

  // Anglais / arabe
  await d.goto(`${base}/en/blog`);
  assert(await d.getByRole('heading', { level: 1, name: 'Strangers Today, Friends Tomorrow' }).isVisible(), 'blog en anglais');
  await d.goto(`${base}/ar/blog/bien-ecouter`);
  assert(await d.locator('html').getAttribute('dir') === 'rtl', 'arabe : page en RTL');
  assert(await d.locator('main p.bg-plum-50').first().isVisible(), 'arabe : mention de traduction à venir');
  await d.goto(`${base}/ar/blog`);
  assert(await d.getByRole('heading', { level: 1, name: 'غرباء اليوم، أصدقاء الغد' }).isVisible(), 'titre du blog en arabe');

  // 404
  assert((await d.goto(`${base}/blog/nexiste-pas`)).status() === 404, 'article inconnu → 404');
  assert((await d.goto(`${base}/blog/theme/nexiste-pas`)).status() === 404, 'thème inconnu → 404');

  // ——— Mobile ———
  const mob = await b.newContext({ ...devices['iPhone 13'] });
  const m = await mob.newPage(); watch(m);
  for (const path of ['/', '/blog', '/blog/theme/conversation', '/blog/questions-pour-lancer-une-conversation', '/ar', '/ar/blog']) {
    await m.goto(`${base}${path}`);
    await noOverflow(m, `mobile ${path}`);
  }
  await m.goto(`${base}/`);
  assert(await m.locator('footer').getByRole('link', { name: 'Blog' }).isVisible(), 'mobile : Blog dans le pied de page');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
