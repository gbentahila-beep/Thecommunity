// Étape 23 sur les émulateurs : l'équipe règle l'accueil (bannière, coups de cœur, section « Nouveautés ») →
// l'accueil et le catalogue le montrent (badge et première place) ; l'équipe saisit « Non inclus » et la position
// du lieu dans le formulaire → la fiche les affiche (carte chargée sur clic) ; page organisateur et recherche lues
// depuis Firestore. L'accueil est remis à zéro à la fin (les autres parcours le lisent).
// Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs.
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const doc = (p) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;
const fsGet = async (p) => { const r = await fetch(doc(p), { headers: OWNER }); return r.ok ? r.json() : null; };
const fsWhere = async (collection, field, value) => {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }),
  });
  return (await r.json()).filter((x) => x.document).map((x) => x.document);
};
const until = async (fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 500)); } return null; };

async function login(page, email, password, suite) {
  await page.goto(`${base}/connexion?suite=${encodeURIComponent(suite)}`, { waitUntil: 'load' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}
async function member(tag, firstName) {
  const email = `${tag}.${Date.now()}@example.com`;
  const password = 'MotDePasse!2026';
  const signUp = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  const uid = signUp.localId;
  await new Promise((r) => setTimeout(r, 1500));
  const fields = { onboardingCompleted: { booleanValue: true }, firstName: { stringValue: firstName }, lastName: { stringValue: 'Test' }, status: { stringValue: 'active' }, birthDate: { stringValue: '1992-04-12' }, email: { stringValue: email }, languages: { arrayValue: { values: [{ stringValue: 'fr' }] } } };
  await fetch(doc(`users/${uid}`) + '?' + Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&'), {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  return { email, password, uid, firstName };
}


(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p) => p.on('pageerror', (e) => errs.push(e.message));
  const admin = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  watch(admin);
  globalThis.__page = admin;
  try {
    // 1. Back-office → Accueil
    await login(admin, 'admin@thecommunity.test', 'Demo2026!', '/admin/accueil');
    await admin.waitForURL('**/admin/accueil', { timeout: 25000 });
    await admin.getByRole('checkbox', { name: 'Afficher la bannière' }).check();
    await admin.locator('#banner-fr').fill('Nouveau à Casablanca : la balade street art');
    await admin.locator('#banner-en').fill('New in Casablanca: the street art walk');
    await admin.locator('#banner-href').fill('/experiences/balade-street-art-centre-ville');
    await admin.locator('#banner-link-fr').fill('Découvrir');
    await admin.locator('#featured-pick').selectOption({ label: 'Balade street art au centre-ville' });
    await admin.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await admin.getByRole('checkbox', { name: /Afficher : Nouveautés/ }).check();
    await admin.getByRole('button', { name: "Enregistrer l'accueil" }).click();
    assert(await visible(admin.getByRole('status').filter({ hasText: 'Accueil enregistré' }), 20000), 'équipe : accueil enregistré');
    const saved = await until(async () => (await fsGet('settings/home'))?.fields);
    assert(saved.featuredExperienceIds.arrayValue.values[0].stringValue === 'exp-street-art', 'Firestore : coup de cœur enregistré');
    assert(saved.banner.mapValue.fields.text.mapValue.fields.fr.stringValue === 'Nouveau à Casablanca : la balade street art', 'Firestore : bannière enregistrée');

    // 2. Le site le montre tout de suite (cache vidé)
    const v = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    watch(v);
    globalThis.__page = v;
    await v.goto(base + '/', { waitUntil: 'load' });
    assert(await visible(v.getByTestId('home-banner').getByText('Nouveau à Casablanca : la balade street art')), 'accueil : bannière');
    assert(await v.getByTestId('home-banner').getByRole('link', { name: 'Découvrir' }).getAttribute('href') === '/experiences/balade-street-art-centre-ville', 'accueil : lien de la bannière');
    assert(await v.getByTestId('home-featured').getByRole('link', { name: 'Balade street art au centre-ville' }).isVisible(), 'accueil : section « Coups de cœur »');
    if (Date.now() < Date.parse('2026-12-20T00:00:00Z')) assert(await v.getByTestId('home-new').count() === 1, 'accueil : section « Nouveautés » activée (expériences ajoutées le 20 novembre)');
    await v.goto(base + '/en', { waitUntil: 'load' });
    assert(await visible(v.getByTestId('home-banner').getByText('New in Casablanca: the street art walk')), 'accueil anglais : bannière traduite');
    await v.goto(base + '/experiences', { waitUntil: 'load' });
    const first = v.getByTestId('catalog-results').locator('article').filter({ has: v.getByRole('link', { name: 'Balade street art au centre-ville' }) }).first();
    assert(await first.isVisible() && await first.getByTestId('card-badge').textContent() === 'Coup de cœur', 'catalogue (vue agenda) : badge coup de cœur sur la balade street art');

    // 3. « Non inclus » et position du lieu saisis dans le formulaire
    globalThis.__page = admin;
    await admin.goto(`${base}/admin/experiences/exp-street-art`, { waitUntil: 'load' });
    await admin.locator('#f-venueCoords').fill('abc');
    await admin.getByRole('button', { name: 'Enregistrer' }).click();
    assert(await visible(admin.getByText('Coordonnées illisibles')), 'formulaire : coordonnées illisibles refusées');
    await admin.locator('#f-venueCoords').fill('33.5967, -7.6189');
    await admin.locator('#f-notIncluded').fill("Transport jusqu'au point de rendez-vous\nBoissons en plus du café");
    await admin.getByRole('button', { name: 'Enregistrer' }).click();
    assert(await visible(admin.getByText('Expérience enregistrée'), 20000), 'formulaire : enregistré');
    const e = (await fsGet('experiences/exp-street-art')).fields;
    assert(Number(e.venue.mapValue.fields.geo.mapValue.fields.lat.doubleValue) === 33.5967 && e.notIncluded.arrayValue.values.length === 2, 'Firestore : position et « non inclus »');
    globalThis.__page = v;
    await v.goto(base + '/experiences/balade-street-art-centre-ville', { waitUntil: 'load' });
    assert(await v.getByTestId('not-included').getByText('Boissons en plus du café').isVisible(), 'fiche : « Non inclus »');
    await v.getByTestId('venue-map').getByRole('button', { name: 'Afficher la carte' }).click();
    assert((await v.getByTestId('venue-map').locator('iframe').getAttribute('src')).includes('marker=33.5967,-7.6189'), 'fiche : carte sur clic');

    // 4. Page organisateur et recherche depuis Firestore
    await v.goto(base + '/organisateurs/club-padel-anfa', { waitUntil: 'load' });
    assert(await v.getByRole('heading', { level: 1, name: 'Club Padel Anfa' }).isVisible(), 'page organisateur (Firestore)');
    assert(await v.getByTestId('organizer-activities').getByRole('link', { name: 'Padel entre inconnus', exact: true }).isVisible(), 'page organisateur : ses activités');
    const api = await (await fetch(`${base}/api/recherche?q=stret%20art&locale=fr`)).json();
    assert(api.suggestions[0]?.label === 'Balade street art au centre-ville', 'recherche (Firestore) : « stret art » → balade street art');
  } finally {
    // Accueil remis à zéro pour les parcours suivants.
    await fetch(doc('settings/home'), { method: 'DELETE', headers: OWNER });
  }

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
