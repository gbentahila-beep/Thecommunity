// Étape 23 (démonstration) : recherche avec suggestions et fautes de frappe, filtres combinables et tri, panneau de
// filtres mobile, badges, galerie plein écran, carte du lieu chargée sur clic, « Non inclus », page organisateur,
// accueil réglable (Back-office → Accueil).
// Prérequis : site de démonstration lancé (npx next start -p 3100).
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 10000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const d = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  d.on('pageerror', (e) => errs.push(e.message));
  globalThis.__page = d;

  // 1. API de suggestions : faute de frappe, organisateur, catégorie
  const api = await (await fetch(`${base}/api/recherche?q=padle&locale=fr`)).json();
  assert(api.suggestions[0]?.label === 'Padel entre inconnus' && api.suggestions[0].href === '/experiences/padel-entre-inconnus-anfa', 'suggestions : « padle » → Padel entre inconnus en premier');
  assert(api.suggestions.some((s) => s.kind === 'organizer' && s.label === 'Club Padel Anfa' && s.href === '/organisateurs/club-padel-anfa'), 'suggestions : organisateur trouvé');
  assert((await (await fetch(`${base}/api/recherche?q=c%C3%A9ramiqe&locale=fr`)).json()).suggestions.some((s) => s.label === 'Atelier céramique'), 'suggestions : « céramiqe » (lettre oubliée) → Atelier céramique');
  assert((await (await fetch(`${base}/api/recherche?q=a&locale=fr`)).json()).suggestions.length === 0, 'suggestions : rien sous 2 caractères');

  // 2. Barre de recherche de l'en-tête : clavier
  await d.goto(base + '/', { waitUntil: 'load' });
  await d.getByTestId('header-search-open').click();
  const box = d.locator('header input[role=combobox]');
  await box.fill('padle');
  assert(await visible(d.getByRole('option', { name: /Padel entre inconnus/ })), 'en-tête : suggestion affichée');
  assert(await d.getByRole('option', { name: /Club Padel Anfa/ }).isVisible(), 'en-tête : organisateur proposé');
  await box.press('ArrowDown');
  assert((await box.getAttribute('aria-activedescendant'))?.endsWith('-opt-0'), 'flèche bas : première suggestion active');
  await box.press('Enter');
  await d.waitForURL('**/experiences/padel-entre-inconnus-anfa', { timeout: 15000 });
  assert(true, 'Entrée : ouvre la fiche');
  await d.getByTestId('header-search-open').click();
  await d.locator('header input[role=combobox]').fill('zzqx');
  assert(await visible(d.getByText('Aucune suggestion')), 'aucune suggestion : message');
  await d.locator('header input[role=combobox]').press('Enter');
  await d.waitForURL('**/experiences?q=zzqx', { timeout: 15000 });
  assert(await visible(d.getByTestId('catalog-empty').filter({ hasText: 'Rien ne correspond à « zzqx »' })), 'catalogue : recherche sans résultat expliquée');

  // 3. Catalogue : recherche tolérante, filtres combinables, puces retirables, tri
  await d.goto(base + '/experiences?q=ceramiqe', { waitUntil: 'load' });
  assert(await d.getByRole('heading', { level: 1 }).textContent() === 'Résultats pour « ceramiqe »', 'catalogue : titre de recherche');
  assert(await visible(d.getByTestId('catalog-results').getByRole('link', { name: 'Atelier céramique' })), 'catalogue : « ceramiqe » trouve l\'atelier céramique');
  await d.goto(base + '/experiences', { waitUntil: 'load' });
  const all = await d.getByTestId('catalog-row').count();
  assert(!(await d.getByTestId('catalog-count').count()) && !(await d.locator('#catalog-q').count()), 'catalogue minimaliste : ni compteur ni barre de recherche');
  await d.getByTestId('filters-open').click();
  await d.locator('select[name=prix]').selectOption('200');
  await d.getByRole('checkbox', { name: 'Accessible aux débutants' }).check();
  await d.getByRole('button', { name: 'Afficher les résultats' }).click();
  await d.waitForURL(/prix=200/, { timeout: 15000 });
  const url = new URL(d.url());
  assert(url.searchParams.get('debutant') === '1' && !url.searchParams.has('quartier') && !url.searchParams.has('date'), 'filtres : adresse lisible (champs vides non envoyés)');
  const filtered = await d.getByTestId('catalog-row').count();
  // docs/22 : toutes les expériences coûtent 35 DH (le filtre prix disparaît à l'étape K) ; « débutants » filtre encore.
  assert(filtered > 0 && filtered <= all, `filtres combinés : ${filtered} sur ${all}`);
  assert(await d.getByTestId('active-filters').getByRole('link', { name: 'Retirer le filtre : 200 DH max' }).isVisible(), 'puce « 200 DH max »');
  await d.getByTestId('filters-open').click();
  await d.locator('select[name=tri]').selectOption('prix-croissant');
  await d.getByRole('button', { name: 'Afficher les résultats' }).click();
  await d.waitForURL(/tri=prix-croissant/, { timeout: 15000 });
  assert(new URL(d.url()).searchParams.get('prix') === '200', 'tri : les filtres sont gardés');
  await d.getByTestId('active-filters').getByRole('link', { name: 'Retirer le filtre : 200 DH max' }).click();
  await d.waitForURL((u) => !u.search.includes('prix=') && u.search.includes('debutant=1'), { timeout: 15000 });
  assert(true, 'puce retirée : les autres filtres restent');
  await d.goto(base + '/experiences?format=seul', { waitUntil: 'load' });
  assert(await visible(d.getByTestId('catalog-results').getByRole('link', { name: 'Dîner entre inconnus' })), 'format « Je viens seul·e » : dîner entre inconnus');
  assert(!(await d.getByTestId('catalog-results').getByRole('link', { name: 'Atelier céramique' }).count()), 'format « Je viens seul·e » : pas l\'atelier en réservation libre');
  await d.goto(base + '/experiences?date=2031-01-01', { waitUntil: 'load' });
  assert(await visible(d.getByTestId('catalog-empty')) && !(await d.locator('#undated-title').count()), 'jour sans date : aucun résultat, pas de « déjà vécues »');
  await d.goto(base + '/experiences?prix=250&tri=nimporte', { waitUntil: 'load' });
  assert(!(await d.getByTestId('active-filters').count()), 'valeurs inconnues ignorées');

  // 4. Badges
  await d.goto(base + '/experiences', { waitUntil: 'load' });
  const badges = await d.getByTestId('card-badge').allTextContents();
  assert(badges.includes('Coup de cœur') && badges.includes('Populaire'), `badges : ${[...new Set(badges)].join(', ')}`);
  if (Date.now() < Date.parse('2026-12-20T00:00:00Z')) assert(badges.includes('Nouveau'), 'badge « Nouveau » (expériences ajoutées le 20 novembre)');

  // 5. Fiche : galerie plein écran, « Non inclus », carte sur clic, organisateur
  await d.goto(base + '/experiences/diner-entre-inconnus-casablanca', { waitUntil: 'load' });
  await d.getByTestId('gallery-all').click();
  const dialog = d.getByTestId('gallery-dialog');
  assert(await visible(dialog) && /1 \/ 3/.test(await dialog.textContent()), 'galerie : plein écran, 1 / 3');
  await d.keyboard.press('ArrowRight');
  assert(/2 \/ 3/.test(await dialog.textContent()), 'galerie : flèche droite → 2 / 3');
  await dialog.getByRole('button', { name: 'Photo précédente' }).click();
  await dialog.getByRole('button', { name: 'Photo précédente' }).click();
  assert(/3 \/ 3/.test(await dialog.textContent()), 'galerie : boucle (précédente depuis la 1re → 3 / 3)');
  await d.keyboard.press('Escape');
  assert(!(await dialog.isVisible()), 'galerie : Échap ferme');
  await d.goto(base + '/experiences/balade-street-art-centre-ville', { waitUntil: 'load' });
  assert(await d.getByTestId('not-included').getByText("Transport jusqu'au point de rendez-vous").isVisible(), 'fiche : « Non inclus »');
  const map = d.getByTestId('venue-map');
  assert(!(await map.locator('iframe').count()), 'carte : rien de chargé avant le clic');
  assert((await map.getByRole('link', { name: 'Itinéraire (Google Maps)' }).getAttribute('href')).includes('destination=33.5967,-7.6189'), 'carte : lien d\'itinéraire');
  await map.getByRole('button', { name: 'Afficher la carte' }).click();
  assert((await map.locator('iframe').getAttribute('src')).startsWith('https://www.openstreetmap.org/export/embed.html') && (await map.locator('iframe').getAttribute('src')).includes('marker=33.5967,-7.6189'), 'carte : OpenStreetMap chargé après le clic');
  await d.goto(base + '/experiences/diner-entre-inconnus-casablanca', { waitUntil: 'load' });
  assert(!(await d.getByTestId('venue-map').count()), 'carte : jamais pour un lieu révélé plus tard');
  await d.goto(base + '/experiences/padel-entre-inconnus-anfa', { waitUntil: 'load' });
  const org = d.getByTestId('organizer-block');
  assert(await org.getByText('Club Padel Anfa').isVisible(), 'fiche : « Organisé par Club Padel Anfa »');
  await org.getByRole('link', { name: "Voir la page de l'organisateur" }).click();
  await d.waitForURL('**/organisateurs/club-padel-anfa', { timeout: 15000 });
  assert(await d.getByRole('heading', { level: 1, name: 'Club Padel Anfa' }).isVisible(), 'page organisateur : nom');
  assert(/4\.8 sur 5 · 19 avis/.test(await d.getByTestId('organizer-rating').textContent()), 'page organisateur : note de ses activités');
  assert(await d.getByTestId('organizer-activities').getByRole('link', { name: 'Padel entre inconnus' }).isVisible(), 'page organisateur : ses activités');
  assert(await d.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => s.textContent.includes('"Organization"'))), 'page organisateur : données structurées');
  assert((await fetch(`${base}/organisateurs/inconnu`)).status === 404, 'organisateur inconnu : 404');

  // 6. Accueil par défaut inchangé ; Back-office → Accueil
  await d.goto(base + '/', { waitUntil: 'load' });
  assert(!(await d.getByTestId('home-banner').count()) && !(await d.getByTestId('home-featured').count()), 'accueil : pas de bannière ni de coups de cœur par défaut');
  await d.goto(base + '/admin/accueil', { waitUntil: 'load' });
  const sections = d.getByTestId('home-sections').locator('li');
  assert(await sections.count() === 11, 'back-office : 11 sections');
  assert(await sections.nth(0).getAttribute('data-section') === 'trust' && await sections.nth(1).getAttribute('data-section') === 'featured', 'back-office : « Venir seul·e » puis « Coups de cœur » en premier');
  await d.getByRole('button', { name: /Descendre : Coups de cœur/ }).click();
  assert(await sections.nth(2).getAttribute('data-section') === 'featured', 'back-office : flèche « descendre »');
  await d.getByRole('checkbox', { name: 'Afficher la bannière' }).check();
  await d.getByRole('button', { name: "Enregistrer l'accueil" }).click();
  assert(await visible(d.getByRole('alert').filter({ hasText: 'Texte de la bannière obligatoire' })), 'bannière sans texte refusée');
  await d.locator('#banner-fr').fill('Nouveau : le padel entre inconnus');
  await d.locator('#banner-href').fill('javascript:alert(1)');
  await d.locator('#banner-link-fr').fill('Voir');
  await d.getByRole('button', { name: "Enregistrer l'accueil" }).click();
  assert(await visible(d.getByRole('alert').filter({ hasText: 'Lien : une page du site' })), 'lien dangereux refusé');
  await d.locator('#banner-href').fill('/experiences?q=padel');
  await d.locator('#featured-pick').selectOption({ label: 'Padel entre inconnus' });
  await d.getByRole('button', { name: 'Ajouter', exact: true }).click();
  assert(await d.getByTestId('home-featured').getByText('1. Padel entre inconnus').isVisible(), 'coups de cœur : activité ajoutée');
  await d.getByRole('button', { name: "Enregistrer l'accueil" }).click();
  assert(await visible(d.getByRole('status').filter({ hasText: "Démonstration : rien n'est enregistré." })), 'démonstration : rien n\'est enregistré');

  // 7. Mobile : panneau de filtres, recherche dans le menu, arabe
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  m.on('pageerror', (e) => errs.push(e.message));
  globalThis.__page = m;
  await m.goto(base + '/experiences', { waitUntil: 'load' });
  assert(!(await m.getByTestId('filters-panel').isVisible()), 'mobile : filtres repliés');
  await m.getByTestId('filters-open').click();
  assert(await visible(m.getByRole('dialog', { name: 'Filtres' })), 'mobile : panneau plein écran');
  await m.getByRole('checkbox', { name: 'Places disponibles' }).check();
  await m.getByRole('button', { name: 'Afficher les résultats' }).click();
  await m.waitForURL(/dispo=1/, { timeout: 15000 });
  assert(await m.getByTestId('filters-open').getAttribute('aria-label') === 'Filtres (1)' && (await m.getByTestId('filters-open').textContent()).trim() === '1', 'mobile : icône des filtres avec « 1 »');
  assert(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile : pas de défilement horizontal');
  await m.getByRole('button', { name: 'Ouvrir le menu' }).click();
  assert(!(await m.getByRole('dialog').locator('input[role=combobox]').count()), 'mobile : plus de barre de recherche dans le menu');
  await m.keyboard.press('Escape');
  await m.goto(base + '/ar/experiences', { waitUntil: 'load' });
  assert(/التصفية/.test(await m.getByTestId('filters-open').getAttribute('aria-label')), 'arabe : icône « التصفية »');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
